import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface PolaroidCardProps {
  uri: string;
  caption?: string | null;
  editable?: boolean;
  onCaptionChange?: (text: string) => void;
  placeholder?: string;
}

// A single photo presented like a physical polaroid print — square photo,
// thick bottom border, and a handwritten-style caption underneath. Reused
// wherever a gallery photo is shown full-size (viewing or adding).
export const PolaroidCard = ({ uri, caption, editable, onCaptionChange, placeholder }: PolaroidCardProps) => (
  <View style={s.frame}>
    <View style={s.photoWrap}>
      <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
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
