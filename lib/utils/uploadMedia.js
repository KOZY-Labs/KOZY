// Upload local media (from expo-image-picker) to Firebase Storage and return public URLs.
// Replaces services/mockMediaUpload.js. Works with file:// URIs on native.
//
// Uploads go through expo-file-system's native upload task against the Storage REST
// API instead of fetch(uri).blob() + uploadBytes: RN's BlobModule materializes the
// whole file as one contiguous ByteBuffer on the Java heap, which OOM-crashes
// Android on large videos. The native task streams from disk (constant memory)
// and reports real byte progress.
import * as FileSystem from 'expo-file-system/legacy';
import {
  ref as storageRef,
  getDownloadURL,
} from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';

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

// Upload a single file. `path` is the full Storage path (see [IMAGE_POLICY] in CLAUDE.md).
// `onProgress(sentBytes, totalBytes)` is optional and fires as the native task streams.
export async function uploadFile(uri, path, contentType, onProgress) {
  const bucket = storage.app.options.storageBucket;
  const token = await auth.currentUser?.getIdToken();
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(path)}`;
  const task = FileSystem.createUploadTask(
    url,
    uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        ...(token ? { Authorization: `Firebase ${token}` } : {}),
      },
    },
    onProgress
      ? ({ totalBytesSent, totalBytesExpectedToSend }) => {
          if (totalBytesExpectedToSend > 0) onProgress(totalBytesSent, totalBytesExpectedToSend);
        }
      : undefined
  );
  const res = await task.uploadAsync();
  if (!res || res.status < 200 || res.status >= 300) {
    throw new Error(`Upload failed (${res ? `HTTP ${res.status}` : 'network error'}). Please try again.`);
  }
  return getDownloadURL(storageRef(storage, path));
}

// Upload listing images. assets: array of { uri, type } from expo-image-picker.
// Assets carrying a `remoteUrl` are already in Storage (edit flow) and are reused as-is.
// Returns array of download URLs, in the order the assets were given.
// `onProgress(key, sent, total)` reports per-file progress under a stable key.
export async function uploadListingImages(listingId, assets, onProgress) {
  const uploads = assets.map((asset, i) => {
    if (asset.remoteUrl) return Promise.resolve(asset.remoteUrl);
    const name = filenameFromUri(asset.uri, `image_${i}.jpg`);
    const path = `listings/${listingId}/images/${Date.now()}_${i}_${name}`;
    return uploadFile(
      asset.uri,
      path,
      resolveContentType(asset, 'image'),
      onProgress ? (sent, total) => onProgress(`image_${i}`, sent, total) : undefined
    );
  });
  return Promise.all(uploads);
}

export async function uploadListingVideo(listingId, asset, onProgress) {
  if (asset.remoteUrl) return asset.remoteUrl;
  const name = filenameFromUri(asset.uri, 'video.mp4');
  const path = `listings/${listingId}/video/${Date.now()}_${name}`;
  return uploadFile(
    asset.uri,
    path,
    resolveContentType(asset, 'video'),
    onProgress ? (sent, total) => onProgress('video', sent, total) : undefined
  );
}

export async function uploadUserAvatar(uid, asset) {
  const name = filenameFromUri(asset.uri, 'avatar.jpg');
  const path = `users/${uid}/avatar/${Date.now()}_${name}`;
  return uploadFile(asset.uri, path, resolveContentType(asset, 'image'));
}

// Chat photo/video messages. kind: 'image' | 'video'.
export async function uploadChatMedia(chatId, asset, kind, onProgress) {
  const name = filenameFromUri(asset.uri, kind === 'video' ? 'video.mp4' : 'photo.jpg');
  const path = `chats/${chatId}/media/${Date.now()}_${name}`;
  return uploadFile(asset.uri, path, resolveContentType(asset, kind), onProgress);
}
