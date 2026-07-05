/**
 * AuthMethodButton — the three Welcome-screen entry buttons
 * (Google / Apple / Email). Squared-off per the auth spec's design tokens
 * (52px height, 12px radius) — distinct from PaltuuButton's pill shape.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { GoogleG } from './GoogleButton';
import { AppleLogo } from './AppleButton';
import { LoadingDots } from './LoadingDots';

type Variant = 'google' | 'apple' | 'email';

interface AuthMethodButtonProps {
  variant: Variant;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// One shared theme across all three — white bg, grey border, dark text/icons.
const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  google: { bg: '#FFFFFF', text: '#1A1A2E', border: '#E0E0E0' },
  apple: { bg: '#FFFFFF', text: '#1A1A2E', border: '#E0E0E0' },
  email: { bg: '#FFFFFF', text: '#1A1A2E', border: '#E0E0E0' },
};

function Icon({ variant, color }: { variant: Variant; color: string }) {
  if (variant === 'google') return <GoogleG size={20} />;
  if (variant === 'apple') return <AppleLogo size={20} color={color} />;
  return null;
}

export function AuthMethodButton({ variant, label, onPress, loading = false, disabled = false }: AuthMethodButtonProps) {
  const v = VARIANT_STYLES[variant];
  const canPress = !loading && !disabled;

  return (
    <TouchableOpacity
      onPress={canPress ? onPress : undefined}
      disabled={!canPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled }}
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? v.bg,
          opacity: disabled && !loading ? 0.4 : 1,
        },
      ]}
    >
      {loading ? (
        <LoadingDots size={6} gap={5} color={v.text} />
      ) : (
        <View style={styles.row}>
          <Icon variant={variant} color={v.text} />
          <Text style={[styles.label, { color: v.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AuthMethodButton;
