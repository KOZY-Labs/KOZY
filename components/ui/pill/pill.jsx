// components/pill/Pill.jsx
import { Pressable, StyleSheet } from "react-native";
import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';

export default function Pill({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.selected]}
    >
      <AppText variant="body-xsm" textColor={selected ? '#000' : '#fff'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.semantic.input.border.normal.color,
    backgroundColor: colors.semantic.bg.greyAlpha,
  },
  selected: {
    backgroundColor: "#fff",
  },
});
