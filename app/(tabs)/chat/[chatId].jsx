import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Keyboard, Alert, ActivityIndicator, Image, Pressable } from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import MessageBubble from "@/components/ui/chat/MessageBubble";
import ChatInput from "@/components/ui/chat/ChatInput";
import AppText from "@/components/ui/appText";
import AppButton from "@/components/ui/appButton";
import { colors } from "@/constants/colors";
import AppDrawer from "@/components/ui/drawer/AppDrawer";
import ProfileSection from "@/components/ui/profileSection";
import { useAuth } from "@/context/AuthContext";
import { useChatThread } from "@/hooks/use-chats";
import { chatViewModel, sendMessage, acceptChat } from "@/lib/db/chats";

const AVATAR_PLACEHOLDER = require('@/assets/images/Avatar-placeholder.png');
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
    const profileDrawerRef = useRef(null);

    const handleSend = async (text) => {
        try {
            await sendMessage(threadId, { senderId: uid, text });
        } catch (e) {
            Alert.alert('Send failed', e?.message ?? 'Please try again.');
        }
    };

    const handleAcceptRequest = async () => {
        try {
            await acceptChat(threadId, uid);
        } catch (e) {
            Alert.alert('Accept failed', e?.message ?? 'Please try again.');
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

    return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <View style={styles.chatHeader}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open the listing this chat is about"
                hitSlop={8}
                disabled={vm.otherDeleted}
                onPress={() => {
                    if (chat.listingId) {
                        // Stay inside the chat stack: no home-feed flash, back pops to this thread.
                        router.push({ pathname: '/chat/listing/[id]', params: { id: chat.listingId } });
                    }
                }}
            >
                <Image
                    source={otherAvatar ? { uri: otherAvatar } : AVATAR_PLACEHOLDER}
                    style={styles.headerAvatar}
                />
            </Pressable>
            <AppText variant="body-sm-strong">{vm.otherInfo?.name ?? 'User'}</AppText>
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
                        Alert.alert(
                            'Have you checked user\'s profile?',
                            'Review their profile, then accept to start chatting.',
                            [
                                { text: 'Accept and Start Chat', onPress: handleAcceptRequest },
                                { text: 'View Profile', onPress: openProfile },
                                { text: 'Close', style: 'cancel' },
                            ]
                        )
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
                    />
                );
            }}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
        />

        <View
            style={[
                styles.inputSafeArea,
                { paddingBottom: isKeyboardVisible ? KEYBOARD_INPUT_GAP : insets.bottom },
            ]}
        >
            <ChatInput
                onSend={handleSend}
                disabled={vm.isPending || vm.status === 'declined' || vm.otherDeleted}
                placeholder={vm.otherDeleted ? 'This user is no longer available' : undefined}
            />
        </View>
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
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    marginBottom: 8,
    backgroundColor: colors.base.gray700,
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
