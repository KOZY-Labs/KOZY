// utils/mediaValidation.js
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_MS = 60 * 1000;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

// Tour videos play full-screen in the vertical home feed, so portrait is a hard requirement.
// Every check is skipped when the picker doesn't report that field (varies by platform).
export function validateVideo(file) {
  const type = file.mimeType ?? file.type;

  if (type && !ALLOWED_VIDEO_TYPES.includes(type)) {
    return 'Only MP4 or MOV videos are allowed.';
  }

  // expo-image-picker reports duration in milliseconds.
  if (typeof file.duration === 'number' && file.duration > MAX_VIDEO_DURATION_MS) {
    return 'Video must be under 1 minute. Trim it and try again.';
  }

  if (typeof file.fileSize === 'number' && file.fileSize > MAX_VIDEO_SIZE) {
    return 'Video size must be under 100MB.';
  }

  if (typeof file.width === 'number' && typeof file.height === 'number' && file.width > file.height) {
    return 'Record in portrait (vertical) so the tour fills the screen.';
  }

  return null;
}

export default function validateImage(file) {
  const type = file.mimeType ?? file.type;

  if (!ALLOWED_TYPES.includes(type)) {
    return 'Only JPG or PNG files are allowed.';
  }

  if (typeof file.fileSize === 'number' && file.fileSize > MAX_SIZE) {
    return 'Image size must be under 10MB.';
  }

  return null;
}
