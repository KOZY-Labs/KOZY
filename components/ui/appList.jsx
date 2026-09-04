import { View, StyleSheet } from 'react-native';
import AppText from '@/components/ui/appText';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

export default function InfoList({ title, items, listStyle, titleStyle }) {
  return (
    <View style={styles.container}>
      {title && (
        <AppText variant="body-sm-strong" color="primary" style={[styles.title, titleStyle]}>
          {title}
        </AppText>
      )}

      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <AppText variant="body-sm" color="primary" style={styles.bullet}>
              <Feather name="check" size={16} color={listStyle?.color || colors.semantic.text.primary} />
            </AppText>
            <AppText variant="body-sm" color="primary" style={[styles.text, listStyle]}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    marginBottom: 12,
  },
  list: {
    gap: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    marginRight: 8,
  },
  text: {
    flex: 1,
  },
});
