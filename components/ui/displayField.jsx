import { View, StyleSheet } from 'react-native';
import AppText from './appText';
import Pill from './pill/displayPill';

// A value is displayable when it's a non-empty string (or number). Template
// literals can smuggle in 'undefined'/'null' — treat those as empty too.
function hasValue(v) {
  if (v == null) return false;
  const s = String(v).trim();
  return s !== '' && s !== 'undefined' && s !== 'null';
}

export default function DisplayField({
  title,
  children,
  type = 'text', // 'text' or 'pill'
  ...props
}) {
  const values = (Array.isArray(children) ? children : [children]).filter(hasValue);

  // Nothing to show — hide the whole field, title included.
  if (values.length === 0) return null;

  return (
    <View {...props}>
      <AppText
        variant="body-md-strong"
        color="primary"
        style={{ marginBottom: 8 }}
      >
        {title}
      </AppText>

      {type === 'pill' ? (
        <View style={styles.pillContainer}>
          {values.map((item, index) => (
            <Pill key={index} label={item} />
          ))}
        </View>
      ) : (
        <AppText variant="body-xsm" color="primary">
          {children}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
