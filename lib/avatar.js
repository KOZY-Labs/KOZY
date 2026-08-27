// Single home for the avatar fallback, so swapping the placeholder asset (or moving
// to initials/per-gender placeholders) is a one-file change instead of six.
const AVATAR_PLACEHOLDER = require('@/assets/images/Avatar-placeholder.png');

// Image `source` for an avatar URL (or the first entry of an avatar array).
export function avatarSource(url) {
  const uri = Array.isArray(url) ? url[0] : url;
  return uri ? { uri } : AVATAR_PLACEHOLDER;
}
