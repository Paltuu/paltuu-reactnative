import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

export const PK_PHONE_REGEX = /^\+92\d{10}$/;

export function isValidPkPhone(value: string): boolean {
  return PK_PHONE_REGEX.test(value);
}

/** Prefill helper — collapses whatever shape a stored/legacy number is in
 *  ('+923001234567', '03001234567', '3001234567', with dashes/spaces, etc.)
 *  into the canonical '+92XXXXXXXXXX' shape, or '' if it can't yield 10 digits. */
export function normalizeIncomingPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '').replace(/^92/, '').replace(/^0/, '').slice(0, 10);
  return digits.length === 10 ? `+92${digits}` : '';
}

/** Display-only pretty print: '+923001234567' -> '+92 300 1234567'. Falls back to the
 *  raw value unchanged for anything that isn't a recognized 10-digit PK number, rather
 *  than mangling it. */
export function formatDisplayPhone(canonical: string | null | undefined): string {
  if (!canonical) return '';
  const digits = canonical.replace(/\D/g, '').replace(/^92/, '');
  if (digits.length !== 10) return canonical;
  return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export interface PhoneInputProps {
  value: string;
  onChangeValue: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function PhoneInput({ value, onChangeValue, placeholder = '3001234567', autoFocus, editable = true }: PhoneInputProps) {
  const digits = value ? value.replace(/^\+92/, '') : '';
  return (
    <View style={styles.row}>
      <Text style={styles.prefix}>+92</Text>
      <TextInput
        style={styles.input}
        value={digits}
        onChangeText={(text) => {
          const d = text.replace(/\D/g, '').slice(0, 10);
          onChangeValue(d ? `+92${d}` : '');
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
        keyboardType="number-pad"
        maxLength={10}
        autoFocus={autoFocus}
        editable={editable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  prefix: { fontSize: 14, fontFamily: FONTS.bodyBold, color: COLORS.textMuted, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.body, color: COLORS.textDark },
});
