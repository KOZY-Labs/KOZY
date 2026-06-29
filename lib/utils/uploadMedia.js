// Upload local media (from expo-image-picker) to Firebase Storage and return public URLs.
// Replaces services/mockMediaUpload.js. Works with file:// URIs on native.
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

function filenameFromUri(uri, fallback) {
  const clean = uri.split('?')[0];
  const last = clean.substring(clean.lastIndexOf('/') + 1);
  return last || fallback;
}

const EXT_CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
};

// Resolve a real MIME type. expo-image-picker's `asset.type` is the media KIND
// ('image' | 'video'), NOT a MIME type — using it breaks Storage rules that match
// `image/.*` / `video/.*`. So prefer a valid `mimeType`, else infer from the extension.
function resolveContentType(asset, kind) {
  if (asset?.mimeType && asset.mimeType.includes('/')) return asset.mimeType;
  const ext = (asset?.uri?.split('?')[0].split('.').pop() || '').toLowerCase();
  return EXT_CONTENT_TYPES[ext] || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
}

// Fetch a local/remote uri into a Blob (RN fetch supports file:// URIs).
async function uriToBlob(uri) {
  const res = await fetch(uri);
  return res.blob();
}

// Upload a single file. `path` is the full Storage path (see [IMAGE_POLICY] in CLAUDE.md).
export async function uploadFile(uri, path, contentType) {
  const blob = await uriToBlob(uri);
  const r = storageRef(storage, path);
  await uploadBytes(r, blob, contentType ? { contentType } : undefined);
  return getDownloadURL(r);
}

// Upload listing images. assets: array of { uri, type } from expo-image-picker.
// Returns array of download URLs.
export async function uploadListingImages(listingId, assets) {
  const uploads = assets.map((asset, i) => {
    const name = filenameFromUri(asset.uri, `image_${i}.jpg`);
    const path = `listings/${listingId}/images/${Date.now()}_${i}_${name}`;
    return uploadFile(asset.uri, path, resolveContentType(asset, 'image'));
  });
  return Promise.all(uploads);
}

export async function uploadListingVideo(listingId, asset) {
  const name = filenameFromUri(asset.uri, 'video.mp4');
  const path = `listings/${listingId}/video/${Date.now()}_${name}`;
  return uploadFile(asset.uri, path, resolveContentType(asset, 'video'));
}

export async function uploadUserAvatar(uid, asset) {
  const name = filenameFromUri(asset.uri, 'avatar.jpg');
  const path = `users/${uid}/avatar/${Date.now()}_${name}`;
  return uploadFile(asset.uri, path, resolveContentType(asset, 'image'));
}
