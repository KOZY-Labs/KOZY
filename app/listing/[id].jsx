import { Redirect, useLocalSearchParams } from 'expo-router';

// Universal/App Link target: https://getkozy.app/listing/{id} lands here and
// forwards to the home-stack detail screen (publicly readable — no auth gate).
export default function SharedListing() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  return <Redirect href={`/(tabs)/home/${listingId}`} />;
}
