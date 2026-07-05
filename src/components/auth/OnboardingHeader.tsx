import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingHeaderProps {
  onBack?: () => void;
  /** Replaces the right-side spacer — e.g. a "Skip" text button. */
  rightSlot?: React.ReactNode;
  /** Shows a close (X) icon instead of a back chevron — used by the OTP step, which cancels rather than navigates back. */
  variant?: 'back' | 'close';
  /** 0–1 fill of the thin progress track spanning the multi-step signup flow. Omit to hide the track. */
  progress?: number;
}

export function OnboardingHeader({ onBack, rightSlot, variant = 'back', progress }: OnboardingHeaderProps) {
  return (
    <View>
      <View style={s.topBar}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={variant === 'close' ? 'close' : 'chevron-back'} size={26} color="#111827" />
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

      {typeof progress === 'number' && (
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

// Shared by both sides of the progress track so the logo→bar gap and the
// bar→heading gap always match. Screens with a progress bar should leave
// their own body's paddingTop at 0 — this is the only source of that gap.
const HEADER_GAP = 46;

const s = StyleSheet.create({
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: HEADER_GAP,
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
  progressTrack: {
    height: 3,
    marginHorizontal: 16,
    marginBottom: HEADER_GAP,
    borderRadius: 999,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#a03048',
  },
});
