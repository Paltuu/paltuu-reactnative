import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingHeaderProps {
  onBack?: () => void;
  /** Replaces the right-side spacer — e.g. a "Skip" text button. */
  rightSlot?: React.ReactNode;
}

export function OnboardingHeader({ onBack, rightSlot }: OnboardingHeaderProps) {
  return (
    <View style={s.topBar}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 26 }} />
      )}

      <View style={s.logoWrap} pointerEvents="none">
        <Image
          source={require('../../../assets/paltuu_bilkul_tight.svg')}
          style={{ width: 73, height: 39 }}
          contentFit="contain"
          tintColor="#a03048"
        />
      </View>

      <View style={s.rightSlot}>{rightSlot}</View>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  logoWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSlot: {
    minWidth: 26,
    alignItems: 'flex-end',
  },
});
