import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { colors } from "@/constants/colors";

export default function Dropdown({ value, options, onChange, style }) {
  // UNCONTROLLED wheel: a controlled Picker gets re-animated to `selectedValue` on
  // every parent re-render — and since onChange triggers exactly such a re-render,
  // scrolling the wheel yanks it back mid-gesture. The wheel owns its position; the
  // parent only receives onChange. (`value` seeds the initial position.)
  const [selected, setSelected] = useState(value);

  // Normalize to the option's exact value: a type mismatch ('3000' vs 3000) makes the
  // native wheel silently reset to the first row.
  const matched =
    options.find((o) => o.value === selected) ??
    options.find((o) => String(o.value) === String(selected));

  return (
    <View style={[styles.wrapper, style]}>
      <Picker
        selectedValue={matched?.value ?? selected}
        onValueChange={(next) => {
          setSelected(next);
          onChange?.(next);
        }}
        style={styles.picker}
        itemStyle={{ color: 'white' }}
      >
        {options.map((o) => (
          <Picker.Item
            key={String(o.value)}
            label={o.label}
            value={o.value}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: 216,
    borderColor: colors.semantic.input.border.normal.color,
    overflow: "hidden",
  },
  picker: {
    height: 216,
    color: colors.semantic.text.primary,
  },
});
