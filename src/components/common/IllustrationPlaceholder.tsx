/**
 * IllustrationPlaceholder — stand-in box for artwork that hasn't been dropped
 * in yet. Swap for an <Image>/<Lottie> once the real illustration exists;
 * the `label` describes what should go there.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IllustrationPlaceholderProps {
  label: string;
  /** Fixed height in px. Omit (and pass `style={{ flex: 1 }}`) to fill a parent zone instead. */
  height?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function IllustrationPlaceholder({
  label,
  height,
  icon = 'paw',
  style,
}: IllustrationPlaceholderProps) {
  return (
    <View style={[styles.wrap, typeof height === 'number' && { height }, style]}>
      <Ionicons name={icon} size={48} color="#a03048" style={{ opacity: 0.35 }} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#fce8ed',
    borderWidth: 1.5,
    borderColor: '#f0b8c4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#a03048',
    opacity: 0.55,
    textAlign: 'center',
  },
});

export default IllustrationPlaceholder;
