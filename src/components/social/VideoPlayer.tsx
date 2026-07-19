import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { getCachedVideoUri } from '../../utils/videoCache';


interface VideoPlayerProps {
  /** HLS .m3u8 URL (CloudFront) or fallback raw S3 URL */
  uri: string;
  /** Local thumbnail shown before first play */
  thumbnailUri?: string;
  /** Width of the player container */
  width: number;
  /** Height of the player container */
  height: number;
  borderRadius?: number;
  /** Whether the video should autoplay (controlled by parent via viewability) */
  paused?: boolean;
  /** Whether to loop */
  loop?: boolean;
  /** Processing state — show spinner instead of player */
  isProcessing?: boolean;
  /** If provided, tapping the video calls this instead of toggling play/pause */
  onPress?: () => void;
  /**
   * Dedicated-viewer chrome: bigger top-right mute button instead of the
   * small feed-card one, a bottom progress bar, and no feed-only "is a video"
   * badge. Also lifts the feed's 2-loop autoplay cap, which exists to save
   * battery/data on cards passively cycling in the background while
   * scrolling — not appropriate once the user has deliberately opened the
   * video full-screen to watch it.
   */
  fullscreen?: boolean;
}

interface InnerVideoPlayerProps extends VideoPlayerProps {
  resolvedUri: string;
}

/**
 * InnerVideoPlayer core component
 */
const InnerVideoPlayer: React.FC<InnerVideoPlayerProps> = ({
  uri,
  resolvedUri,
  thumbnailUri,
  width,
  height,
  borderRadius = 14,
  paused = false,
  loop = true,
  isProcessing = false,
  onPress,
  fullscreen = false,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(resolvedUri, (p) => {
    p.loop = true;
    p.muted = true;
    // Defaults to 0, which means the `timeUpdate` event never fires at all —
    // needed to drive the fullscreen viewer's progress bar/seeker.
    if (fullscreen) p.timeUpdateEventInterval = 0.25;
  });

  // Reset states when source URI changes
  useEffect(() => {
    setIsReady(false);
    setError(null);
  }, [resolvedUri]);

  // Sync source when URI changes dynamically (including cache hits/updates)
  useEffect(() => {
    if (resolvedUri && player) {
      if (typeof (player as any).replaceAsync === 'function') {
        (player as any).replaceAsync(resolvedUri);
      } else {
        player.replace(resolvedUri);
      }
    }
  }, [resolvedUri, player]);


  // Sync mute state changes to the player after init
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  // Handle status and autoplay logic
  useEffect(() => {
    const statusSub = player.addListener('statusChange', (payload) => {
      const status = payload.status;
      setIsBuffering(status === 'loading'); // Track buffering via status

      if (status === 'readyToPlay') {
        setIsReady(true);
        if (!paused && !userPaused && (fullscreen || playCount < 2)) {
          player.play();
        }
      }
      if (status === 'error') {
        const detail = (payload as any)?.error?.message ?? (payload as any)?.error ?? 'unknown';
        console.warn('[VideoPlayer] error', { uri, detail, payload });
        setError('Failed to load video');
      }
    });

    // The feed's 2-loop autoplay cap only applies to cards passively cycling
    // in the background — a video deliberately opened full-screen should
    // keep looping until the user leaves or pauses it themselves.
    const finishSub = player.addListener('playToEnd', () => {
      if (fullscreen) return;
      setPlayCount(prev => {
        const next = prev + 1;
        if (next >= 2) {
          player.pause();
        }
        return next;
      });
    });

    const timeSub = fullscreen
      ? player.addListener('timeUpdate', (payload) => {
          const duration = player.duration;
          setProgress(duration > 0 ? payload.currentTime / duration : 0);
        })
      : null;

    return () => {
      statusSub.remove();
      finishSub.remove();
      timeSub?.remove();
    };
  }, [player, uri, paused, userPaused, playCount, fullscreen]);

  // Sync external paused prop
  useEffect(() => {
    if (paused) {
      player.pause();
    } else if (!userPaused) {
      player.play();
    }
  }, [paused, userPaused, player]);

  const isPlaying = !paused && !userPaused;

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setUserPaused(true);
    } else {
      setPlayCount(0); // Reset count if user manually hits play
      player.play();
      setUserPaused(false);
    }
  }, [player, isPlaying]);

  // Draggable seeker for the fullscreen viewer. `progressSV` drives the
  // thumb/fill purely on the UI thread via Reanimated — a legacy
  // `PanResponder` was used here before, but nested inside this screen's
  // `GestureHandlerRootView` (needed for pinch-zoom/swipe-to-dismiss), RNGH's
  // native recognizers intercept touches before the JS-thread responder
  // system ever sees them on iOS, so the old seeker never received a single
  // touch there. Per-move `setState` was also the reason dragging felt laggy
  // on Android: it re-rendered the whole player on every touch-move. Neither
  // issue applies to a `Gesture.Pan`, which composes correctly with sibling
  // RNGH/PagerView gestures the same way `ZoomableImage`'s pan/pinch already
  // does elsewhere on this same screen, and only touches JS state once, on
  // release, to seek the player.
  const progressSV = useSharedValue(0);
  const isSeekingSV = useSharedValue(false);

  // Mirror the player's own progress into the shared value while the user
  // isn't actively dragging — writing a shared value from JS doesn't
  // trigger a re-render, so this stays cheap even at `timeUpdate`'s 4x/sec.
  useEffect(() => {
    if (!isSeekingSV.value) progressSV.value = progress;
  }, [progress]);

  const seekToRatio = useCallback((ratio: number) => {
    if (player.duration > 0) {
      player.currentTime = ratio * player.duration;
    }
  }, [player]);

  const seekPan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      isSeekingSV.value = true;
      progressSV.value = Math.min(Math.max(e.x / width, 0), 1);
    })
    .onUpdate((e) => {
      progressSV.value = Math.min(Math.max(e.x / width, 0), 1);
    })
    .onEnd((e) => {
      const ratio = Math.min(Math.max(e.x / width, 0), 1);
      runOnJS(seekToRatio)(ratio);
    })
    .onFinalize(() => {
      isSeekingSV.value = false;
    });

  const fillAnimatedStyle = useAnimatedStyle(() => ({ width: `${progressSV.value * 100}%` }));
  const thumbAnimatedStyle = useAnimatedStyle(() => ({ left: `${progressSV.value * 100}%` }));

  if (isProcessing) {
    return (
      <View style={[s.processingContainer, { width, height, borderRadius }]}>
        <ActivityIndicator size="large" color="#A03048" />
        <Text style={s.processingText}>Video processing…</Text>
        <Text style={s.processingSubText}>Usually ready in 1–2 minutes</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={{ width, height }}
        // Feed cards crop-to-fill a fixed-aspect card ("cover"); the
        // full-screen viewer should show the whole frame like X/Twitter does,
        // letterboxing instead of cropping when the aspect ratio doesn't
        // match the screen ("contain").
        contentFit={fullscreen ? 'contain' : 'cover'}
        nativeControls={false}
      />
      {/* Thumbnail placeholder overlay until the video buffer is ready to avoid black flashes */}
      {!!thumbnailUri && !isReady && (
        <Image
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          contentFit={fullscreen ? 'contain' : 'cover'}
          transition={150}
        />
      )}

      {/* Overlay above the native VideoView to reliably catch touches on Android */}
      <TouchableOpacity activeOpacity={1} onPress={onPress ?? togglePlay} style={StyleSheet.absoluteFill} />

      <TouchableOpacity
        style={fullscreen ? s.muteBtnFullscreen : s.muteBtn}
        onPress={() => setIsMuted((prev) => !prev)}
        hitSlop={12}
      >
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={fullscreen ? 20 : 15} color="#fff" />
      </TouchableOpacity>

      {fullscreen && (
        // Hit area is taller than the visible track so the thumb is easy to
        // grab; the track itself stays a thin line, centered inside it.
        <GestureDetector gesture={seekPan}>
          <View style={s.seekerHitArea}>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, fillAnimatedStyle]} />
              <Animated.View style={[s.progressThumb, thumbAnimatedStyle]} />
            </View>
          </View>
        </GestureDetector>
      )}

      {isBuffering && (
        <View style={[StyleSheet.absoluteFill, s.bufferingOverlay]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {error && (
        <View style={[StyleSheet.absoluteFill, s.errorOverlay]}>
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {!isPlaying && !paused && (
        <View style={[StyleSheet.absoluteFill, s.pausedOverlay]}>
          <View style={s.playIconCircle}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
        </View>
      )}

      {!fullscreen && (
        <View style={s.videoBadge}>
          <Ionicons name="videocam" size={10} color="#fff" />
        </View>
      )}
    </View>
  );
};

// ─── VideoThumbnail ──────────────────────────────────────────────────────────
// Static stand-in for feed videos that aren't the active (playing) post.
// Mounting `useVideoPlayer` spins up a real native decoder, so during a fast
// scroll — where FlashList mounts/unmounts many cells per second — every
// video card doing that at once is what tanks FPS. Only the one post that's
// actually autoplaying needs a real <VideoPlayer/>; everything else can show
// this cheap Image-based placeholder until it becomes active.
export const VideoThumbnail: React.FC<{
  thumbnailUri?: string;
  width: number;
  height: number;
  borderRadius?: number;
  isProcessing?: boolean;
  onPress?: () => void;
}> = ({ thumbnailUri, width, height, borderRadius = 14, isProcessing, onPress }) => {
  if (isProcessing) {
    return (
      <View style={[s.processingContainer, { width, height, borderRadius }]}>
        <ActivityIndicator size="large" color="#A03048" />
        <Text style={s.processingText}>Video processing…</Text>
        <Text style={s.processingSubText}>Usually ready in 1–2 minutes</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#1A1D20', alignItems: 'center', justifyContent: 'center' }}
    >
      {!!thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{ width, height, position: 'absolute' }}
          contentFit="cover"
        />
      ) : (
        // Premium textured dark background for missing thumbnails
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#131517', opacity: 0.85 }]} />
      )}
      <View style={[StyleSheet.absoluteFill, s.pausedOverlay]}>
        <View style={s.playIconCircle}>
          <Ionicons name="play" size={22} color="#fff" />
        </View>
      </View>
      <View style={s.videoBadge}>
        <Ionicons name="videocam" size={10} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

/**
 * VideoPlayer Wrapper with Cache Pre-Resolution
 */
const VideoPlayer: React.FC<VideoPlayerProps> = (props) => {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCachedVideoUri(props.uri)
      .then((res) => {
        if (active) setResolvedUri(res);
      })
      .catch(() => {
        if (active) setResolvedUri(props.uri);
      });
    return () => {
      active = false;
    };
  }, [props.uri]);

  if (!resolvedUri) {
    // Render static thumbnail placeholder while verifying cache (5-10ms)
    return (
      <VideoThumbnail
        thumbnailUri={props.thumbnailUri}
        width={props.width}
        height={props.height}
        borderRadius={props.borderRadius}
        isProcessing={props.isProcessing}
        onPress={props.onPress}
      />
    );
  }

  return <InnerVideoPlayer {...props} resolvedUri={resolvedUri} />;
};

const s = StyleSheet.create({
  processingContainer: { backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', gap: 8 },
  processingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  processingSubText: { color: '#888', fontSize: 11 },
  muteBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: 5 },
  muteBtnFullscreen: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: 10 },
  seekerHitArea: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24, justifyContent: 'center' },
  progressTrack: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff' },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#fff',
    marginLeft: -5.5,
    marginTop: -5.5,
  },
  bufferingOverlay: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  pausedOverlay: { alignItems: 'center', justifyContent: 'center' },
  errorOverlay: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  errorText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  playIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  videoBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
});

export default VideoPlayer;
