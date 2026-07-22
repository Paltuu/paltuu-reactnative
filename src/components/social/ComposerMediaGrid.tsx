// src/components/social/ComposerMediaGrid.tsx
// The attached-media preview grid shared by every composer (create-post, quote,
// and all three comment surfaces). Tiles render from the local file:// URI the
// picker returned, so they appear the instant media is selected — the upload
// state layered on top (see useMediaDraft) is progress reporting, never a gate
// on the preview itself.
import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { DraftMedia } from '../../hooks/useMediaDraft';

const PRIMARY = '#a03048';

export const ComposerMediaGrid = ({
  media,
  onRemove,
  onRetry,
  tileWidth = 76,
  /** height = tileWidth * heightRatio. 1 = square. */
  heightRatio = 1,
  style,
}: {
  media: DraftMedia[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  tileWidth?: number;
  heightRatio?: number;
  style?: ViewStyle;
}) => {
  if (!media.length) return null;

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, style]}>
      {media.map((item) => {
        const uploading = item.status === 'uploading' || item.status === 'pending';
        const failed = item.status === 'failed';
        return (
          <View
            key={item.id}
            style={{
              width: tileWidth,
              height: tileWidth * heightRatio,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#F3F4F6',
            }}
          >
            <Image
              source={{ uri: item.type === 'video' ? item.thumbnailUri || item.uri : item.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />

            {/* Uploading — dim the tile and run a progress bar along the bottom.
                Deliberately quiet: the happy path is that this is gone before the
                user has finished typing, so it must not shout. */}
            {uploading && (
              <>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.28)',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
                    backgroundColor: 'rgba(255,255,255,0.35)',
                  }}
                >
                  <View style={{ height: 3, width: `${Math.round(item.progress * 100)}%`, backgroundColor: '#fff' }} />
                </View>
              </>
            )}

            {/* Failed — tap anywhere on the tile to retry. */}
            {failed && (
              <TouchableOpacity
                onPress={() => onRetry?.(item.id)}
                activeOpacity={0.8}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(180,30,40,0.55)',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>Retry</Text>
              </TouchableOpacity>
            )}

            {item.type === 'video' && !failed && (
              <View
                style={{
                  position: 'absolute', bottom: 6, left: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
                  paddingHorizontal: 4, paddingVertical: 2,
                }}
              >
                <Ionicons name="videocam" size={10} color="#fff" />
              </View>
            )}

            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              hitSlop={6}
              style={{
                position: 'absolute', top: 4, right: 4,
                backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
                width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

/* ── Icon toolbar — gallery + camera + pet tagging ── */
export const ComposerToolbar = ({
  onImage,
  onCamera,
  onPet,
  count,
  maxCount = 4,
}: {
  onImage: () => void;
  onCamera: () => void;
  onPet?: () => void;
  count: number;
  maxCount?: number;
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
    <TouchableOpacity onPress={onImage} hitSlop={8}>
      <Ionicons name="image-outline" size={23} color={PRIMARY} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onCamera} hitSlop={8}>
      <Ionicons name="camera-outline" size={23} color={PRIMARY} />
    </TouchableOpacity>
    {onPet && (
      <TouchableOpacity onPress={onPet} hitSlop={8}>
        <Ionicons name="paw-outline" size={22} color={PRIMARY} />
      </TouchableOpacity>
    )}
    {count > 0 && (
      <View style={{ marginLeft: 'auto', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{count}/{maxCount}</Text>
      </View>
    )}
  </View>
);
