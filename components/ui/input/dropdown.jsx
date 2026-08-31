import { useRef, useState } from "react";
import { View, StyleSheet, Platform, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import AppText from "@/components/ui/appText";
import { colors } from "@/constants/colors";

const WHEEL_HEIGHT = 216;
const ITEM_HEIGHT = 44;
// Padding that lets the first/last option reach the center line.
const WHEEL_PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

// Android has no native wheel — @react-native-picker/picker renders a broken-looking
// spinner row there. This is a lightweight snap-list wheel matching the iOS look:
// centered items, dimmed neighbors, hairlines marking the selection band.
function AndroidWheel({ value, options, onChange }) {
  const matchedIndex = options.findIndex((o) => String(o.value) === String(value));
  const initialIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedRef = useRef(initialIndex);

  const indexForOffset = (y) =>
    Math.min(options.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));

  const handleScroll = (e) => {
    const idx = indexForOffset(e.nativeEvent.contentOffset.y);
    if (idx !== selectedRef.current) {
      selectedRef.current = idx;
      setSelectedIndex(idx);
    }
  };

  const commit = (e) => {
    const idx = indexForOffset(e.nativeEvent.contentOffset.y);
    selectedRef.current = idx;
    setSelectedIndex(idx);
    onChange?.(options[idx].value);
  };

  return (
    <View style={styles.wheel}>
      {/* Plain ScrollView (options lists are tiny) — a FlatList here would sit
          nested inside screen ScrollViews and trip the VirtualizedList warning. */}
      <ScrollView
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
        contentOffset={{ x: 0, y: initialIndex * ITEM_HEIGHT }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={commit}
        nestedScrollEnabled
      >
        {options.map((item, index) => (
          <View key={String(item.value)} style={styles.wheelItem}>
            <AppText
              variant={index === selectedIndex ? "body-md-strong" : "body-md"}
              textColor={
                index === selectedIndex
                  ? colors.semantic.text.primary
                  : "rgba(255,255,255,0.4)"
              }
            >
              {item.label}
            </AppText>
          </View>
        ))}
      </ScrollView>
      {/* Selection band hairlines */}
      <View pointerEvents="none" style={[styles.hairline, { top: WHEEL_PAD }]} />
      <View pointerEvents="none" style={[styles.hairline, { top: WHEEL_PAD + ITEM_HEIGHT }]} />
    </View>
  );
}

export default function Dropdown({ value, options, onChange, style }) {
  // UNCONTROLLED wheel: a controlled Picker gets re-animated to `selectedValue` on
  // every parent re-render — and since onChange triggers exactly such a re-render,
  // scrolling the wheel yanks it back mid-gesture. The wheel owns its position; the
  // parent only receives onChange. (`value` seeds the initial position.)
  const [selected, setSelected] = useState(value);

  if (Platform.OS === "android") {
    return (
      <View style={[styles.wrapper, style]}>
        <AndroidWheel value={value} options={options} onChange={onChange} />
      </View>
    );
  }

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
    height: WHEEL_HEIGHT,
    borderColor: colors.semantic.input.border.normal.color,
    overflow: "hidden",
  },
  picker: {
    height: WHEEL_HEIGHT,
    color: colors.semantic.text.primary,
  },
  wheel: {
    height: WHEEL_HEIGHT,
    width: "100%",
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  hairline: {
    position: "absolute",
    left: 24,
    right: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
});
