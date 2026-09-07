import { useState } from 'react';
import { router, usePathname } from "expo-router";
import { StyleSheet, View, FlatList, Pressable, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import EmptyListingsState from '@/components/ui/emptyListingsState';
import CheckBox from '@/components/ui/input/checkbox';
import { showAlertModal, showConfirmModal } from '@/components/ui/confirmModalHost';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useChats } from '@/hooks/use-chats';
import { chatViewModel, deleteChat } from '@/lib/db/chats';

import { avatarSource } from '@/lib/avatar';

function formatRelative(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isLoggedIn, uid } = useAuth();
  const { data: chats, loading } = useChats(uid);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppText variant="headline-sm" color="primary">Messages</AppText>
        <EmptyListingsState
          heading="Nothing here yet"
          description="Sign Up or Log In to start chatting with potential roommates"
          actionText="Sign Up / Log In"
          onAction={() => {
            router.push({
              pathname: "/(auth)/login",
              params: { redirect: pathname },
            });
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppText variant="headline-sm" color="primary">Messages</AppText>
        <View style={styles.noItemContainer}>
          <ActivityIndicator color="#fff" />
        </View>
      </View>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppText variant="headline-sm" color="primary">Messages</AppText>
        <EmptyListingsState
          heading="Nothing here yet"
          description="Browse matches and start your first chat."
          actionText="Browse listings"
          onAction={() => router.push('/(tabs)/home')}
        />
      </View>
    );
  }

  const toggleEdit = () => setIsEditMode((prev) => !prev);
  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toggleEdit();
      return;
    }
    showConfirmModal({
      title: 'Delete Chats',
      message: `Delete ${selectedItems.length} ${selectedItems.length === 1 ? 'chat' : 'chats'}? This cannot be undone.`,
      primaryText: 'Delete',
      secondaryText: 'Close',
      onPrimary: async () => {
        try {
          await Promise.all(selectedItems.map((id) => deleteChat(id)));
        } catch (e) {
          showAlertModal({ title: 'Delete failed', message: e?.message ?? 'Please try again.' });
        }
        setSelectedItems([]);
        toggleEdit();
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Title + CTAs share a row so the buttons align with "Messages". */}
      <View style={styles.headerRow}>
        <AppText variant="headline-sm" color="primary">Messages</AppText>
        <View style={styles.buttonContainer}>
          {!isEditMode && (
            <AppButton
              text="Edit Chats"
              size="sm"
              type="secondary"
              onPress={toggleEdit}
              style={{ width: 104 }}
            />
          )}
          {isEditMode && (
            <>
              <AppButton
                text="Cancel"
                size="sm"
                type="secondary"
                style={{ width: 74 }}
                onPress={() => {
                  toggleEdit();
                  setSelectedItems([]);
                }}
              />
              <AppButton
                text="Delete"
                size="sm"
                type="secondary"
                style={{ width: 74 }}
                onPress={handleDeleteSelected}
              />
            </>
          )}
        </View>
      </View>
      <View style={styles.content}>
        {/* Chat list */}
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const vm = chatViewModel(item, uid);
            const hasUnread = !vm?.isBlocked && (vm?.unreadCount ?? 0) > 0;
            return (
              <Pressable
                style={[styles.card, vm?.isBlocked && styles.cardBlocked]}
                onPress={() => {
                  if (isEditMode) return;
                  router.push(`chat/${item.id}`);
                }}
              >
                {/* Other participant */}
                <View>
                  <Image
                    source={avatarSource(vm?.otherInfo?.avatar)}
                    style={styles.image}
                  />
                  {vm?.otherInfo?.verified ? (
                    <View style={styles.verifiedBadge} accessibilityLabel="Verified user">
                      <Feather name="check-circle" size={14} color={colors.base.success} />
                    </View>
                  ) : null}
                </View>
                {/* Info */}
                <View style={styles.infoWrapper}>
                  <AppText
                    variant="body-sm-strong"
                    color="primary"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {vm?.otherInfo?.name ?? 'User'}, {item.listing?.title ?? ''}
                  </AppText>
                  <AppText
                    variant={hasUnread ? 'body-xsm-strong' : 'body-xsm'}
                    color="primary"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ marginTop: 4, flexShrink: 1, opacity: hasUnread ? 1 : 0.7 }}
                  >
                    {vm?.isBlocked
                      ? 'Chat unavailable'
                      : vm?.isPending ? vm.statusLabel : (item.lastMessage || vm?.statusLabel)}
                  </AppText>
                </View>
                <View style={styles.metaColumn}>
                  <AppText variant="body-xsm">{formatRelative(item.lastMessageAt)}</AppText>
                  {hasUnread ? (
                    <View style={styles.unreadPill}>
                      <AppText variant="body-xsm-strong" style={styles.unreadPillText}>
                        {vm.unreadCount > 99 ? '99+' : vm.unreadCount}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                {isEditMode && (
                  <CheckBox
                    selected={selectedItems.includes(item.id)}
                    onPress={() => toggleSelectItem(item.id)}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: colors.base.background,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  noItemContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
    marginVertical: 12,
    alignItems: 'center',
  },
  cardBlocked: {
    opacity: 0.5,
  },
  metaColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  unreadPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#F0426B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    color: '#fff',
    lineHeight: 15,
  },
  image: {
    width: 55,
    height: 55,
    borderRadius: 999,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 9999,
    padding: 2,
  },
  infoWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: "10%",
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 6,
  },
});
