import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

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
}

/**
 * VideoPlayer
 *
 * Uses expo-video (Expo SDK 51+) which wraps AVPlayer (iOS) and ExoPlayer (Android).
 * HLS adaptive bitrate (.m3u8) is supported natively on both platforms.
 *
 * Features:
 *  - Tap to play/pause
 *  - Mute/unmute button
 *  - Processing placeholder while MediaConvert is running
 *  - Buffering spinner
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  thumbnailUri,
  width,
  height,
  borderRadius = 14,
  paused = false,
  loop = true,
  isProcessing = false,
}) => {
  const [isMuted, setIsMuted] = useState(true); // start muted like Instagram
  const [isBuffering, setIsBuffering] = useState(false);
  const [userPaused, setUserPaused] = useState(false); // user explicit pause

  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = isMuted;
    if (!paused && !userPaused) {
      p.play();
    }
  });

  // Sync external paused prop (from FlatList viewability)
  React.useEffect(() => {
    if (paused) {
      player.pause();
    } else if (!userPaused) {
      player.play();
    }
  }, [paused, userPaused, player]);

  // Sync mute state
  React.useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  const handleTap = useCallback(() => {
    if (player.playing) {
      player.pause();
      setUserPaused(true);
    } else {
      player.play();
      setUserPaused(false);
    }
  }, [player]);

  const isPlaying = !paused && !userPaused;

  // ── Processing placeholder ────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <View
        style={[
          s.processingContainer,
          { width, height, borderRadius },
        ]}
      >
        <ActivityIndicator size="large" color="#A03048" />
        <Text style={s.processingText}>Video processing…</Text>
        <Text style={s.processingSubText}>Usually ready in 1–2 minutes</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
      {/* Native video view */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={StyleSheet.absoluteFill}
      >
        <VideoView
          player={player}
          style={{ width, height }}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      {/* Mute / unmute button */}
      <TouchableOpacity
        style={s.muteBtn}
        onPress={() => setIsMuted((prev) => !prev)}
        hitSlop={12}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={15}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Buffering overlay */}
      {isBuffering && (
        <View style={[StyleSheet.absoluteFill, s.bufferingOverlay]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Play/pause indicator (brief flash on tap) */}
      {!isPlaying && !paused && (
        <View style={[StyleSheet.absoluteFill, s.pausedOverlay]}>
          <View style={s.playIconCircle}>
            <Ionicons name="play" size={22} color="#fff" />
          </View>
        </View>
      )}

      {/* Video badge */}
      <View style={s.videoBadge}>
        <Ionicons name="videocam" size={10} color="#fff" />
      </View>
    </View>
  );
};

export default VideoPlayer;

const s = StyleSheet.create({
  processingContainer: {
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  processingSubText: {
    color: '#888',
    fontSize: 11,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 5,
  },
  bufferingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
});
