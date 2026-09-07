import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator, Image, Pressable } from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';

import MessageBubble from "@/components/ui/chat/MessageBubble";
import ChatInput from "@/components/ui/chat/ChatInput";
import MediaViewerModal from "@/components/ui/chat/MediaViewerModal";
import AppText from "@/components/ui/appText";
import AppButton from "@/components/ui/appButton";
import AppIconButton from "@/components/ui/appIconButton";
import { colors } from "@/constants/colors";
import AppDrawer from "@/components/ui/drawer/AppDrawer";
import ProfileSection from "@/components/ui/profileSection";
import { showAlertModal, showConfirmModal } from "@/components/ui/confirmModalHost";
import { setActiveChat } from "@/lib/notifications";
import { useAuth } from "@/context/AuthContext";
import { useChatThread } from "@/hooks/use-chats";
import {
  chatViewModel,
  sendMessage,
  acceptChat,
  clearUnread,
  markMessagesRead,
  blockUserInChats,
  unblockUserInChats,
} from "@/lib/db/chats";
import { uploadChatMedia } from "@/lib/utils/uploadMedia";
import validateImage, { validateVideo } from "@/utils/mediaValidation";

import { avatarSource } from '@/lib/avatar';

// Chat videos are stored as-is (no transcode) — keep them short and small.
const CHAT_VIDEO_LIMITS = {
  requirePortrait: false,
  maxDurationMs: 30 * 1000,
  maxSizeBytes: 30 * 1024 * 1024,
};
const KEYBOARD_INPUT_GAP = 100; // gap between keyboard and input

// "Today" / "Yesterday" / "June 28, 2026" for the date separators.
const formatDayLabel = (date) => {
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ChatScreen() {
    const { chatId } = useLocalSearchParams();
    const threadId = Array.isArray(chatId) ? chatId[0] : chatId;
    const insets = useSafeAreaInsets();
    const { uid } = useAuth();
    const { chat, messages, loading } = useChatThread(threadId);
    const vm = chatViewModel(chat, uid);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [uploading, setUploading] = useState(null); // { kind, progress 0..1 } | null
    const [viewerMedia, setViewerMedia] = useState(null); // { type: 'image'|'video', url } | null
    const profileDrawerRef = useRef(null);
    const isFocusedRef = useRef(false);

    // While the room is focused: suppress push banners for this chat, zero the
    // viewer's unread counter, and mark incoming messages read.
    useFocusEffect(
      useCallback(() => {
        isFocusedRef.current = true;
        setActiveChat(chatId);
        if (uid) clearUnread(threadId, uid).catch(() => {});
        return () => {
          isFocusedRef.current = false;
          setActiveChat(null);
        };
      }, [chatId, threadId, uid])
    );

    // Read receipts (coarse, JOOPI-style): everything visible flips to read while
    // the room is focused — runs on focus and again as new messages stream in.
    // The in-flight set stops re-marking ids whose snapshot update hasn't landed yet.
    const markingRef = useRef(new Set());
    useEffect(() => {
        if (!isFocusedRef.current || !uid) return;
        const ids = messages
            .filter((m) =>
                m.senderId && m.senderId !== uid && m.type !== 'system' &&
                m.status !== 'read' && !markingRef.current.has(m.id)
            )
            .map((m) => m.id);
        if (!ids.length) return;
        ids.forEach((id) => markingRef.current.add(id));
        Promise.all([
            markMessagesRead(threadId, ids),
            clearUnread(threadId, uid),
        ]).catch(() => {
            ids.forEach((id) => markingRef.current.delete(id));
        });
    }, [messages, threadId, uid]);

    const handleSend = async (text) => {
        try {
            await sendMessage(threadId, {
                senderId: uid,
                text,
                otherIds: vm?.otherId ? [vm.otherId] : [],
            });
        } catch (e) {
            showAlertModal({ title: 'Send failed', message: e?.message ?? 'Please try again.' });
        }
    };

    // --- media messages ---

    const sendMediaMessage = async (asset, kind) => {
        setUploading({ kind, progress: 0 });
        try {
            const mediaUrl = await uploadChatMedia(threadId, asset, kind, (sent, total) => {
                if (total > 0) setUploading({ kind, progress: sent / total });
            });
            await sendMessage(threadId, {
                senderId: uid,
                type: kind,
                mediaUrl,
                otherIds: vm?.otherId ? [vm.otherId] : [],
            });
        } catch (e) {
            showAlertModal({
                title: 'Upload failed',
                message: e?.message ?? `Could not send the ${kind}. Please try again.`,
            });
        } finally {
            setUploading(null);
        }
    };

    const pickFromCamera = async () => {
        if (uploading) return;
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            showAlertModal({ title: 'Camera access needed', message: 'Allow camera access in Settings to take a photo.' });
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const error = validateImage(asset);
        if (error) {
            showAlertModal({ title: 'Invalid photo', message: error });
            return;
        }
        await sendMediaMessage(asset, 'image');
    };

    // One picker for both photos and videos — the asset's own type picks the
    // validation (photo 10MB / video 30s·30MB) and the message kind.
    const pickFromLibrary = async () => {
        if (uploading) return;
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            showAlertModal({ title: 'Photos access needed', message: 'Allow photo library access in Settings to attach media.' });
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const kind = asset.type === 'video' ? 'video' : 'image';
        const error = kind === 'video'
            ? validateVideo(asset, CHAT_VIDEO_LIMITS)
            : validateImage(asset);
        if (error) {
            showAlertModal({ title: kind === 'video' ? 'Invalid video' : 'Invalid photo', message: error });
            return;
        }
        await sendMediaMessage(asset, kind);
    };

    const handleAcceptRequest = async () => {
        try {
            await acceptChat(threadId, uid);
        } catch (e) {
            showAlertModal({ title: 'Accept failed', message: e?.message ?? 'Please try again.' });
        }
    };

    // Tab bar visibility is handled centrally in (tabs)/_layout.jsx.

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
        const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // Latest message timestamp for the chat header
    const latestMessage = messages[messages.length - 1];
    const formatMessageDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        const formatTime = (d) => {
            let hours = d.getHours();
            const mins = d.getMinutes();
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12 || 12;
            const minsStr = mins < 10 ? `0${mins}` : mins;
            return `${hours}:${minsStr}${ampm}`;
        };

        if (diffInMins < 60) {
            return `${Math.max(diffInMins, 0)}m ago`;
        } else if (diffInHours < 24) {
            return `Today, ${formatTime(date)}`;
        } else if (diffInDays === 1) {
            return `Yesterday, ${formatTime(date)}`;
        } else if (diffInDays < 7) {
            return `${diffInDays} days ago, ${formatTime(date)}`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // No profile to show for a deleted account.
    const openProfile = () => {
        if (vm?.otherDeleted) return;
        profileDrawerRef.current?.snapToIndex(0);
    };

    // --- kebab: report / block ---

    const handleReportUser = () => {
        // Re-exported contactUs route so we stay inside the chat stack.
        router.push({
            pathname: '/(tabs)/chat/report',
            params: { reportUserId: vm.otherId, backTo: `/chat/${threadId}` },
        });
    };

    const handleBlockToggle = () => {
        if (vm.blockedByMe) {
            showConfirmModal({
                title: 'Unblock this user?',
                message: 'You will both be able to send messages in this chat again.',
                primaryText: 'Unblock',
                secondaryText: 'Cancel',
                onPrimary: async () => {
                    try {
                        await unblockUserInChats(uid, vm.otherId);
                    } catch (e) {
                        showAlertModal({ title: 'Unblock failed', message: e?.message ?? 'Please try again.' });
                    }
                },
            });
            return;
        }
        showConfirmModal({
            title: 'Block this user?',
            message: 'Neither of you will be able to send messages. The chat stays in your list until you delete it, and the other person won’t be told who blocked.',
            primaryText: 'Block',
            secondaryText: 'Cancel',
            onPrimary: async () => {
                try {
                    await blockUserInChats(uid, vm.otherId);
                } catch (e) {
                    showAlertModal({ title: 'Block failed', message: e?.message ?? 'Please try again.' });
                }
            },
        });
    };

    const handleMoreMenu = () => {
        showConfirmModal({
            title: 'More options',
            primaryText: 'Report User',
            // Deleted accounts can still be reported, but blocking them is pointless.
            ...(vm.otherDeleted
                ? { secondaryText: 'Cancel', onPrimary: handleReportUser }
                : {
                    secondaryText: vm.blockedByMe ? 'Unblock User' : 'Block User',
                    tertiaryText: 'Cancel',
                    onPrimary: handleReportUser,
                    onSecondary: handleBlockToggle,
                }),
        });
    };

    // Messages + date separators ("Today" / "Yesterday" / full date) whenever the
    // day changes, reversed for the inverted list.
    const listItems = useMemo(() => {
        const items = [];
        let lastDay = null;
        for (const message of messages) {
            const date = new Date(message.createdAt);
            const day = date.toDateString();
            if (day !== lastDay) {
                items.push({ id: `date-${day}`, type: 'date', label: formatDayLabel(date) });
                lastDay = day;
            }
            items.push(message);
        }
        return items.reverse();
    }, [messages]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color="#fff" />
            </View>
        );
    }

    if (!chat || !vm) {
        return (
            <View style={[styles.container, styles.center]}>
                <AppText variant="body-md" color="primary">Chat not found</AppText>
            </View>
        );
    }

    const otherAvatar = vm.otherInfo?.avatar?.[0];
    const myAvatar = chat.participantsInfo?.[uid]?.avatar?.[0];
    // Read/Delivered shows on the newest own non-system message only.
    const lastOwnMessageId = [...messages]
        .reverse()
        .find((m) => m.senderId === uid && m.type !== 'system')?.id;

    return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        {/* Right-side actions live in the stack header so they align with the back
            chevron. Declared inline (not in _layout) because they need the chat doc. */}
        <Stack.Screen
            options={{
                headerRight: () => (
                    <View style={styles.headerActions}>
                        <AppIconButton
                            icon={<Feather name="home" />}
                            type="bare"
                            accessibilityLabel="Open the listing this chat is about"
                            onPress={() => {
                                if (chat.listingId) {
                                    // Stay inside the chat stack: back pops to this thread.
                                    router.push({ pathname: '/chat/listing/[id]', params: { id: chat.listingId } });
                                }
                            }}
                        />
                        <AppIconButton
                            icon={<Feather name="more-horizontal" />}
                            type="bare"
                            accessibilityLabel="More options"
                            onPress={handleMoreMenu}
                        />
                    </View>
                ),
            }}
        />
        <View style={styles.chatHeader}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="View profile"
                hitSlop={8}
                disabled={vm.otherDeleted}
                onPress={openProfile}
            >
                <Image
                    source={avatarSource(otherAvatar)}
                    style={styles.headerAvatar}
                />
                {vm.otherInfo?.verified ? (
                    <View style={styles.verifiedBadge} accessibilityLabel="Verified user">
                        <Feather name="check-circle" size={16} color={colors.base.success} />
                    </View>
                ) : null}
            </Pressable>
            <Pressable hitSlop={6} disabled={vm.otherDeleted} onPress={openProfile}>
                <AppText variant="body-sm-strong">{vm.otherInfo?.name ?? 'User'}</AppText>
            </Pressable>
            {latestMessage && (
                <AppText variant="caption">{formatMessageDate(latestMessage.createdAt)}</AppText>
            )}
            <AppText variant="caption" style={{ marginTop: 10, color: '#D9D9D9' }}>{vm.statusLabel}</AppText>
            {vm.canAccept && (
                <AppButton
                    text="Accept Chat"
                    size="sm"
                    type="secondary"
                    onPress={() =>
                        showConfirmModal({
                            title: 'Have you checked user\'s profile?',
                            message: 'Review their profile, then accept to start chatting.',
                            primaryText: 'Accept and Start Chat',
                            secondaryText: 'View Profile',
                            tertiaryText: 'Close',
                            onPrimary: handleAcceptRequest,
                            onSecondary: openProfile,
                        })
                    }
                    style={styles.acceptButton}
                />
            )}
        </View>
        <FlatList
            data={listItems}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
                if (item.type === 'date') {
                    return (
                        <View style={styles.dateSeparator}>
                            <AppText variant="caption" style={styles.dateSeparatorText}>
                                {item.label}
                            </AppText>
                        </View>
                    );
                }
                return (
                    <MessageBubble
                        message={item}
                        isMine={item.senderId === uid}
                        avatar={item.senderId === uid ? myAvatar : otherAvatar}
                        onAvatarPress={openProfile}
                        showStatus={item.id === lastOwnMessageId}
                        onMediaPress={(msg) => {
                            if (msg.mediaUrl) setViewerMedia({ type: msg.type, url: msg.mediaUrl });
                        }}
                    />
                );
            }}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
        />

        <View
            style={[
                styles.inputSafeArea,
                // iOS: extra breathing room under the send/+ buttons — flush against
                // the keyboard they were too easy to mis-tap.
                {
                    paddingBottom: isKeyboardVisible
                        ? KEYBOARD_INPUT_GAP + (Platform.OS === 'ios' ? 16 : 0)
                        : insets.bottom,
                },
            ]}
        >
            <ChatInput
                onSend={handleSend}
                onCamera={pickFromCamera}
                onLibrary={pickFromLibrary}
                disabled={vm.isPending || vm.status === 'declined' || vm.otherDeleted || vm.isBlocked || !!uploading}
                placeholder={
                    vm.isBlocked
                        ? 'This chat is unavailable'
                        : vm.otherDeleted ? 'This user is no longer available' : undefined
                }
            />
        </View>
        <MediaViewerModal media={viewerMedia} onClose={() => setViewerMedia(null)} />
        {/* Blocks every touch while media streams to Storage — same treatment as the
            publish flow (previewListing), so upload states look identical app-wide. */}
        {uploading ? (
            <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <AppText variant="body-md-strong" textColor="#fff">
                    {uploading.kind === 'video' ? 'Sending video…' : 'Sending photo…'}
                </AppText>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(uploading.progress * 100)}%` }]} />
                </View>
                <AppText variant="caption" textColor="rgba(255,255,255,0.7)">
                    {Math.round(uploading.progress * 100)}%
                </AppText>
            </View>
        ) : null}
        <AppDrawer
            ref={profileDrawerRef}
            title={`${vm.otherInfo?.name ?? 'User'} Profile`}
            primaryAction={() => {
                profileDrawerRef.current?.close();
                if (vm.canAccept) {
                    handleAcceptRequest();
                }
            }}
            primaryActionText={vm.canAccept ? "Accept & Start Chat" : "Close"}
        >
            <ProfileSection listing={{ owner: vm.otherInfo }} />
        </AppDrawer>
    </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  chatHeader: {
    alignItems: "center",
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginRight: 2,
    paddingHorizontal: 10,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  progressTrack: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    marginBottom: 8,
    backgroundColor: colors.base.gray700,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: -4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 9999,
    padding: 2,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 14,
  },
  dateSeparatorText: {
    color: '#D9D9D9',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  acceptButton: {
    marginTop: 12,
    width: 120,
  },
  inputSafeArea: {
    backgroundColor: colors.base.background,
  }
});
