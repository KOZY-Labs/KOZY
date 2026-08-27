import { Keyboard, Pressable, View } from 'react-native';
import AppText from '@/components/ui/appText';
import { colors } from '@/constants/colors';

export default function DisplayInput({
  label,
  value,
  onPress,
  isMulti = false,
  placeholder,
  style,
  inputStyle,
  rightIcon,
  accessibilityLabel,
}) {
  const multiValues = Array.isArray(value) ? value.filter(Boolean) : [];
  return (
    <Pressable
      onPress={() => {
        // Tapping a display input means leaving text entry — drop the keyboard first
        // so the drawer it opens isn't half-hidden behind it.
        Keyboard.dismiss();
        onPress?.();
      }}
      style={style}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel || label}
    >
      <View>
        {label && <AppText variant="body-md-strong">
          {label}
        </AppText>}

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {isMulti
            ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {multiValues.map((item) => (
                  <View
                    key={item}
                    style={{
                      minHeight: 34,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: colors.base.gray800Alpha,
                      borderRadius: 999,
                      backgroundColor: colors.base.gray800Alpha,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...inputStyle,
                    }}
                  >
                    <AppText
                      variant="button-xsm"
                      color="primary"
                      numberOfLines={1}
                    >
                      {item}
                    </AppText>
                  </View>
                ))}

                <View
                  style={{
                    height: 34,
                    minWidth: 76,
                    paddingHorizontal: 34,
                    borderWidth: 1,
                    borderColor: colors.semantic.input.border.normal.color,
                    borderRadius: 999,
                    backgroundColor: colors.base.gray800Alpha,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...inputStyle,
                  }}
                >
                  <AppText
                    variant="button-xsm"
                    color="primary"
                    numberOfLines={1}
                  >
                    {placeholder || '+'}
                  </AppText>
                </View>
              </View>
            )
            : (
              <View
                style={{
                  width: '100%',
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: colors.semantic.input.border.normal.color,
                  borderRadius: 999,
                  backgroundColor: colors.semantic.input.bg,
                  justifyContent: 'center',
                  height: 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...inputStyle,
                }}
              >
                <AppText
                  variant="body-xsm"
                  color={value ? 'primary' : 'disabled'}
                  style={{ flex: 1 }}
                >
                  {value || placeholder}
                </AppText>
                {rightIcon}
              </View>
            )}
        </View>
      </View>
    </Pressable>
  );
}
