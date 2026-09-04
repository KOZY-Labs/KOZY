// Custom reel video controls, shared by every reel surface (home feed, search reel,
// saved reel, uploadedPost/myListings). Native player controls are disabled on the
// VideoViews, so this is the ONLY control UI — identical on iOS and Android:
//   - draggable progress bar pinned just above the (floating) tab bar via bottomOffset
//   - time label (current / total) while scrubbing
//   - centered play icon while the parent reports a user-initiated pause
// The parent owns the tap-to-toggle gesture (its Pressable wraps the whole reel) and
// passes `paused` down, so off-screen feed reels (auto-paused) don't flash the icon.
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { Feather } from '@expo/vector-icons';

import AppText from '@/components/ui/appText';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoReelControls({ player, paused, bottomOffset }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrub, setScrub] = useState(null); // 0..1 while dragging, null otherwise
  const scrubRef = useRef(null);
  const durationRef = useRef(0);
  const trackWidthRef = useRef(0);
  const exactDurationRef = useRef(false); // true once a real (non-estimated) duration arrived

  useEffect(() => {
    if (!player) return;
    // Duration on Android is unreliable: player.duration polls and even the
    // sourceLoad payload intermittently report TIME_UNSET (a huge negative
    // sentinel) or 0 — sometimes for an entire session. Take any valid exact
    // value that shows up, and until one does, estimate from the furthest
    // buffered/played position (for these short, fully-buffered reels the
    // buffered position converges to the real duration almost immediately).
    const applyExactDuration = (d) => {
      if (Number.isFinite(d) && d > 0) {
        exactDurationRef.current = true;
        durationRef.current = d;
        setDuration(d);
      }
    };
    player.timeUpdateEventInterval = 0.25;
    applyExactDuration(player.duration);
    const loadSub = player.addListener('sourceLoad', ({ duration: d }) => applyExactDuration(d));
    const timeSub = player.addListener('timeUpdate', ({ currentTime, bufferedPosition }) => {
      applyExactDuration(player.duration);
      if (!exactDurationRef.current) {
        const est = Math.max(
          durationRef.current,
          Number.isFinite(bufferedPosition) ? bufferedPosition : 0,
          Number.isFinite(currentTime) ? currentTime : 0
        );
        if (est > 0) {
          durationRef.current = est;
          setDuration(est);
        }
      }
      if (scrubRef.current == null && durationRef.current > 0) {
        setProgress(Math.min(1, Math.max(0, currentTime / durationRef.current)));
      }
    });
    return () => {
      loadSub.remove();
      timeSub.remove();
    };
  }, [player]);

  const updateScrub = (x) => {
    const width = trackWidthRef.current;
    if (!width) return;
    const ratio = Math.min(1, Math.max(0, x / width));
    scrubRef.current = ratio;
    setScrub(ratio);
  };

  const commitScrub = () => {
    const ratio = scrubRef.current;
    if (ratio != null && durationRef.current > 0 && player) {
      // Absolute seek via the currentTime setter — verified to work on Android
      // (native seekTo) and iOS. Note: files WITHOUT a seek index (fragmented
      // MP4, e.g. some older uploads) are unseekable on Android and land at 0 —
      // that's a property of the file, fixed by the upload transcode (TODO).
      player.currentTime = ratio * durationRef.current;
      setProgress(ratio);
    }
    scrubRef.current = null;
    setScrub(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // The feed FlatList (a native ScrollView) aggressively tries to take the
      // gesture over — refuse termination and keep the native side out, or the
      // drag dies mid-scrub and the seek never commits.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => updateScrub(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateScrub(evt.nativeEvent.locationX),
      onPanResponderRelease: commitScrub,
      // If something still steals the responder, land the seek instead of
      // silently dropping the user's drag.
      onPanResponderTerminate: commitScrub,
    })
  ).current;

  const shown = scrub ?? progress;

  return (
    <>
      {paused && (
        <View pointerEvents="none" style={styles.centerIconWrap}>
          <View style={styles.centerIcon}>
            <Feather name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        </View>
      )}
      {/* Generous vertical padding = the touch target; the visible track is thin. */}
      <View
        style={[styles.barArea, { bottom: bottomOffset }]}
        {...panResponder.panHandlers}
      >
        {scrub != null && duration > 0 && (
          <View style={styles.timeLabel}>
            <AppText variant="caption" textColor="#fff">
              {formatTime(shown * duration)} / {formatTime(duration)}
            </AppText>
          </View>
        )}
        <View
          style={[styles.track, scrub != null && styles.trackActive]}
          onLayout={(e) => {
            trackWidthRef.current = e.nativeEvent.layout.width;
          }}
        >
          <View style={[styles.fill, { width: `${shown * 100}%` }]} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centerIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barArea: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  timeLabel: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  trackActive: {
    height: 6,
    borderRadius: 3,
  },
  fill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
