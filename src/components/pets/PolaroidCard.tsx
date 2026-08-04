import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { formatPolaroidDate } from './PolaroidDateField';

interface PolaroidCardProps {
  uri: string;
  caption?: string | null;
  /** Optional YYYY-MM-DD; rendered as a "14 March 2023" chip on the print. */
  takenOn?: string | null;
  editable?: boolean;
  onCaptionChange?: (text: string) => void;
  placeholder?: string;
}

// A single photo presented like a physical polaroid print — square photo,
// thick bottom border, and a handwritten-style caption underneath. Reused
// wherever a gallery photo is shown full-size (viewing or adding).
export const PolaroidCard = ({
  uri,
  caption,
  takenOn,
  editable,
  onCaptionChange,
  placeholder,
}: PolaroidCardProps) => {
  const dateLabel = formatPolaroidDate(takenOn);

  return (
    <View style={s.frame}>
      <View style={s.photoWrap}>
        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        {/* Date chip sits ON the photo rather than in the frame's white margin:
            the margin is where the handwritten caption lives, and a second
            text block there reads as two competing captions. Overlaid at the
            top it reads like a label stuck on the print. */}
        {!!dateLabel && (
          <View style={s.dateChip}>
            <Text style={s.dateChipText} numberOfLines={1}>{dateLabel}</Text>
          </View>
        )}
      </View>
      {editable ? (
        <TextInput
          style={s.captionInput}
          value={caption ?? ''}
          onChangeText={onCaptionChange}
          placeholder={placeholder ?? 'Write a caption...'}
          placeholderTextColor="#9CA3AF"
          maxLength={80}
          multiline
        />
      ) : !!caption ? (
        <Text style={s.captionText}>{caption}</Text>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  frame: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    paddingBottom: 22,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  photoWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  dateChip: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    maxWidth: '86%',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    // A photo can be any colour behind the chip; the shadow keeps the chip
    // readable over a blown-out white sky as well as a dark one.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  dateChipText: {
    fontFamily: 'CheeseMilky',
    fontSize: 13,
    color: '#111111',
    letterSpacing: 0.2,
  },
  captionText: {
    fontFamily: 'CheeseMilky',
    fontSize: 16,
    color: '#111111',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  captionInput: {
    fontFamily: 'CheeseMilky',
    fontSize: 16,
    color: '#111111',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
    minHeight: 24,
  },
});
