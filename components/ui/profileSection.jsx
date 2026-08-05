import { Image, StyleSheet, View } from 'react-native';

import AppText from '@/components/ui/appText';
import DisplayField from '@/components/ui/displayField';

const AVATAR_PLACEHOLDER = require('@/assets/images/Avatar-placeholder.png');

export default function ProfileSection({ listing }) {
  const owner = listing?.owner;

  if (!owner) {
    return null;
  }

  // Prefer the exact age (from dob); older cached owners may only carry ageGroup.
  const ageLabel = owner.age ?? owner.ageGroup;

  return (
    <View style={styles.profileSection}>
      <Image
        source={owner.avatar?.[0] ? { uri: owner.avatar[0] } : AVATAR_PLACEHOLDER}
        style={styles.avatarImage}
        resizeMode="cover"
      />
      <View style={styles.ownerName}>
        <AppText variant="headline-md">
          {owner.name}{ageLabel ? `, ${ageLabel}` : ''}
        </AppText>
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
  ownerName: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moveInText: {
    lineHeight: 14,
  },
});
