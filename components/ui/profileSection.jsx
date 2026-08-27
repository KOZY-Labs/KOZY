import { Image, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';
import DisplayField from '@/components/ui/displayField';
import { colors } from '@/constants/colors';
import { avatarSource } from '@/lib/avatar';
import { ageFromBirth } from '@/lib/dob.mjs';

export default function ProfileSection({ listing }) {
  const owner = listing?.owner;

  if (!owner) {
    return null;
  }

  // Computed at render from the cached birth year/month — never decays, never the raw
  // dob (listings are publicly readable). Old cache shapes are healed by the migration
  // script, not here.
  const age = ageFromBirth(owner.birthYear, owner.birthMonth);
  const verified = !!owner.verified;

  return (
    <View style={styles.profileSection}>
      <Image
        source={avatarSource(owner.avatar)}
        style={styles.avatarImage}
        resizeMode="cover"
      />
      <View style={styles.nameRow}>
        <AppText variant="headline-md">
          {owner.name}{age != null ? `, ${age}` : ''}
        </AppText>
        {verified ? (
          <Feather
            name="check-circle"
            size={18}
            color={colors.base.success}
            accessibilityLabel="Verified user"
          />
        ) : null}
      </View>

      <DisplayField title="Profile" type="pill">
        {[owner.gender, owner.occupation]}
      </DisplayField>

      <DisplayField title="Personality" type="pill">
        {owner.personality}
      </DisplayField>

      <DisplayField title="Lifestyle" type="pill">
        {owner.lifestyle}
      </DisplayField>

      {owner.aboutMe ? (
        <DisplayField title="About Me">
          {owner.aboutMe}
        </DisplayField>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  avatarImage: {
    width: '50%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 9999,
    marginHorizontal: 'auto',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  moveInText: {
    lineHeight: 14,
  },
});
