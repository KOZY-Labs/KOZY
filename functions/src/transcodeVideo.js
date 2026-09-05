// Normalize every uploaded listing video to H.264 progressive (faststart) MP4
// with the audio track stripped.
//
// Why: user uploads arrive as .mov/HEVC (may not play on Android) or fragmented
// MP4 (no seek index — every ExoPlayer seek lands at 0). Sound is a product
// decision: reels are silent for now.
//
// Recursion safety is structural: this trigger only watches listings/{id}/video/,
// and the output is written to listings/{id}/video_transcoded/ — which clients
// can't write to either (storage.rules default-deny), so the normalization can't
// be bypassed or re-triggered.
//
// Flow vs. the app (previewListing.jsx handlePublish):
//   upload video -> (this fires) ... app writes videoUrl + videoStatus:'processing'
// The doc update usually lands while ffmpeg runs, but on tiny files this function
// can win the race — so we poll for videoUrl before swapping it.
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');
const { getDownloadURL } = require('firebase-admin/storage');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const { db, storage } = require('./admin');

const VIDEO_PATH_RE = /^listings\/([^/]+)\/video\/[^/]+$/;

function probe(file) {
  const out = execFileSync(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name',
    '-of', 'json',
    file,
  ]);
  const streams = JSON.parse(out).streams ?? [];
  return {
    videoCodec: streams.find((s) => s.codec_type === 'video')?.codec_name ?? null,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
  };
}

// Progressive-and-seekable check straight from the container bytes: a moov box in
// the head (before any mdat) means faststart; any moof box means fragmented MP4.
function containerInfo(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(128 * 1024);
  const read = fs.readSync(fd, head, 0, head.length, 0);
  fs.closeSync(fd);
  const slice = head.subarray(0, read);
  const moov = slice.indexOf('moov');
  const mdat = slice.indexOf('mdat');
  const moof = slice.indexOf('moof');
  return {
    fragmented: moof !== -1,
    faststart: moov !== -1 && (mdat === -1 || moov < mdat),
  };
}

// The publish flow writes videoUrl AFTER the upload completes, so poll briefly
// when the doc doesn't reference this object yet. Returns the doc ref when this
// object is (still) the listing's current video, else null (e.g. it was already
// replaced by a newer edit upload — never clobber that).
async function waitForOwnership(listingId, objectPath, { attempts = 30, delayMs = 3000 } = {}) {
  const ref = db.collection('listings').doc(listingId);
  const encoded = encodeURIComponent(objectPath);
  for (let i = 0; i < attempts; i += 1) {
    const snap = await ref.get();
    if (!snap.exists) return null; // publish failed and cleaned up the draft
    const url = snap.data().videoUrl;
    if (url && url.includes(encoded)) return ref;
    if (url && url.includes('/video_transcoded/')) return null; // already swapped
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

exports.transcodeListingVideo = onObjectFinalized(
  {
    bucket: 'kozy-prod-6fbdc.firebasestorage.app',
    region: 'us-east1', // must match the bucket's region
    memory: '2GiB',
    cpu: 2,
    timeoutSeconds: 540,
    concurrency: 1,
  },
  async (event) => {
    const objectPath = event.data.name ?? '';
    const contentType = event.data.contentType ?? '';
    const match = VIDEO_PATH_RE.exec(objectPath);
    if (!match || !contentType.startsWith('video/')) return;
    const listingId = match[1];

    const bucket = storage.bucket(event.data.bucket);
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'transcode-'));
    const input = path.join(work, 'input');
    const output = path.join(work, 'output.mp4');
    try {
      await bucket.file(objectPath).download({ destination: input });
      const { videoCodec, hasAudio } = probe(input);
      const { fragmented, faststart } = containerInfo(input);

      const needsTranscode = videoCodec !== 'h264';
      const needsRemux = hasAudio || fragmented || !faststart;
      logger.info('inspect', { listingId, objectPath, videoCodec, hasAudio, fragmented, faststart });

      if (!needsTranscode && !needsRemux) {
        // Already normal — just clear the processing flag if the doc is waiting on us.
        const ref = await waitForOwnership(listingId, objectPath);
        if (ref) await ref.update({ videoStatus: 'ready', updatedAt: FieldValue.serverTimestamp() });
        return;
      }

      const vArgs = needsTranscode
        ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
           '-vf', "scale='min(1080,iw)':-2"]
        : ['-c:v', 'copy'];
      execFileSync(ffmpegPath, [
        '-y', '-i', input,
        ...vArgs,
        '-an',                       // reels are silent (product decision)
        '-movflags', '+faststart',
        output,
      ]);

      // Confirm this object is still the listing's current video BEFORE swapping —
      // an edit may have replaced it while ffmpeg ran.
      const ref = await waitForOwnership(listingId, objectPath);
      if (!ref) {
        logger.warn('listing no longer references this object; leaving doc untouched', { listingId, objectPath });
        return;
      }

      const destPath = `listings/${listingId}/video_transcoded/${Date.now()}.mp4`;
      await bucket.upload(output, { destination: destPath, metadata: { contentType: 'video/mp4' } });
      const newUrl = await getDownloadURL(bucket.file(destPath));
      await ref.update({
        videoUrl: newUrl,
        videoStatus: 'ready',
        updatedAt: FieldValue.serverTimestamp(),
      });
      await bucket.file(objectPath).delete().catch(() => {}); // original no longer needed
      logger.info('normalized', { listingId, destPath, mode: needsTranscode ? 'transcode' : 'remux' });
    } catch (err) {
      // Keep serving the original: playback usually works, only seek suffers.
      logger.error('transcode failed; keeping original video', { listingId, objectPath, err });
      const ref = await waitForOwnership(listingId, objectPath, { attempts: 1 });
      if (ref) await ref.update({ videoStatus: 'ready', updatedAt: FieldValue.serverTimestamp() });
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }
);
