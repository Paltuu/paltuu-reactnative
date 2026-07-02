import React, { useRef, useState, useCallback, useEffect } from 'react';
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
  /** If provided, tapping the video calls this instead of toggling play/pause */
  onPress?: () => void;
}

/**
 * VideoPlayer
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
  onPress,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  // Handle status and autoplay logic
  useEffect(() => {
    const statusSub = player.addListener('statusChange', (payload) => {
      const status = payload.status;
      setIsBuffering(status === 'loading'); // Track buffering via status

      if (status === 'readyToPlay' && !paused && !userPaused && playCount < 2) {
        player.play();
      }
      if (status === 'error') {
        setError('Failed to load video');
      }
    });

    const finishSub = player.addListener('playToEnd', () => {
      setPlayCount(prev => {
        const next = prev + 1;
        if (next >= 2) {
          player.pause();
        }
        return next;
      });
    });

    return () => {
      statusSub.remove();
      finishSub.remove();
    };
  }, [player, uri, paused, userPaused, playCount]);

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
      <TouchableOpacity activeOpacity={1} onPress={onPress ?? togglePlay} style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={{ width, height }}
          contentFit="cover"
          nativeControls={false}
        />
      </TouchableOpacity>

      <TouchableOpacity style={s.muteBtn} onPress={() => setIsMuted((prev) => !prev)} hitSlop={12}>
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
      </TouchableOpacity>

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

      <View style={s.videoBadge}>
        <Ionicons name="videocam" size={10} color="#fff" />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  processingContainer: { backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', gap: 8 },
  processingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  processingSubText: { color: '#888', fontSize: 11 },
  muteBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: 5 },
  bufferingOverlay: { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  pausedOverlay: { alignItems: 'center', justifyContent: 'center' },
  errorOverlay: { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  errorText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  playIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  videoBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
});

export default VideoPlayer;
