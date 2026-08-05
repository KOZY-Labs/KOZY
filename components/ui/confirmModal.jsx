// Reusable confirmation modal with two CTAs (primary + secondary), e.g. the
// "discard unsaved changes?" prompt. Matches the dark bottom-sheet styling.
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/appText';
import AppButton from '@/components/ui/appButton';
import { colors } from '@/constants/colors';

export default function ConfirmModal({
  visible,
  title,
  message,
  primaryText = 'Confirm',
  secondaryText = 'Cancel',
  onPrimary,
  onSecondary,
  onRequestClose, // backdrop tap / Android back — defaults to the secondary action
}) {
  const handleClose = onRequestClose ?? onSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        {/* Stop backdrop presses from closing when tapping the card itself */}
        <Pressable style={styles.card} onPress={() => {}}>
          {title ? (
            <AppText variant="headline-md" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          {message ? (
            <AppText variant="body-sm" style={styles.message}>
              {message}
            </AppText>
          ) : null}
          <View style={styles.buttons}>
            <AppButton text={primaryText} type="primary" onPress={onPrimary} />
            <AppButton text={secondaryText} type="secondary" onPress={onSecondary} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.semantic.bottomSheet.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: colors.semantic.bottomSheet.background,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: colors.base.gray600,
  },
  buttons: {
    marginTop: 12,
    gap: 12,
  },
});
