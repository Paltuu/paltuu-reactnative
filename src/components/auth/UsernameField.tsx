import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// ─── Client-side format validation (mirrors server rules exactly) ─────────────
const FORMAT_REGEX = /^[a-z0-9_.]{1,30}$/;

function clientValidate(handle: string): string | null {
  if (handle.length === 0) return null;
  if (handle.length > 30) return 'Max 30 characters';
  if (!FORMAT_REGEX.test(handle)) return 'Letters, numbers, _ and . only';
  if (handle.startsWith('.')) return 'Cannot start with a period';
  if (handle.endsWith('.')) return 'Cannot end with a period';
  if (handle.includes('..')) return 'Cannot contain consecutive periods';
  return null; // null = format is valid
}

// ─── API availability check (no auth required) ────────────────────────────────
async function checkUsernameAvailability(handle: string) {
  const res = await axios.get(
    `${process.env.EXPO_PUBLIC_API_URL}/v1/social/username/check`,
    { params: { q: handle }, timeout: 5000 }
  );
  return res.data as { valid: boolean; available: boolean; error?: string };
}

export interface UsernameFieldState {
  value: string;
  canContinue: boolean;
}

interface UsernameFieldProps {
  onStateChange: (state: UsernameFieldState) => void;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}

/**
 * @-prefixed username input with debounced live availability checking.
 * Shared by the email-signup flow and the Google/Apple new-account flow —
 * both land on "pick a username" per the auth spec.
 */
export function UsernameField({ onStateChange, autoFocus = true, onSubmitEditing }: UsernameFieldProps) {
  const [rawInput, setRawInput] = useState('');
  const [debouncedHandle, setDebouncedHandle] = useState('');
  const [forbiddenChars, setForbiddenChars] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatError = clientValidate(rawInput);
  const formatOk = rawInput.length > 0 && formatError === null;

  // ── Debounce: fire the network check 350 ms after the user stops typing ──────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!formatOk) {
      setDebouncedHandle('');
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedHandle(rawInput);
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [rawInput, formatOk]);

  // ── TanStack Query — enabled only when format is valid AND debounce settled ──
  const {
    data: checkResult,
    isFetching: isChecking,
    isError: checkFailed,
  } = useQuery({
    queryKey: ['username-check', debouncedHandle],
    queryFn: () => checkUsernameAvailability(debouncedHandle),
    enabled: debouncedHandle.length > 0,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // ── Derived state ─────────────────────────────────────────────────────────
  const isAvailable = checkResult?.valid && checkResult?.available;
  const isPending = formatOk && (debouncedHandle !== rawInput || isChecking);
  const canContinue = formatOk && !isPending && isAvailable === true;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current({ value: rawInput, canContinue });
  }, [rawInput, canContinue]);

  // ── Input handler ─────────────────────────────────────────────────────────
  const handleChange = (text: string) => {
    const lowered = text.toLowerCase();
    const rejected = Array.from(new Set(lowered.match(/[^a-z0-9_.]/g) ?? []));
    setForbiddenChars(rejected);
    setRawInput(lowered.replace(/[^a-z0-9_.]/g, ''));
  };

  // ── Status icon ───────────────────────────────────────────────────────────
  const renderStatusIcon = () => {
    if (rawInput.length === 0) return null;

    if (isPending) {
      return (
        <View style={styles.validIcon}>
          <ActivityIndicator size="small" color="#a03048" />
        </View>
      );
    }
    if (formatError) {
      return (
        <View style={styles.validIcon}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </View>
      );
    }
    if (checkFailed) {
      return (
        <View style={styles.validIcon}>
          <Ionicons name="help-circle" size={20} color="#F59E0B" />
        </View>
      );
    }
    if (isAvailable === true) {
      return (
        <View style={styles.validIcon}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
      );
    }
    if (isAvailable === false) {
      return (
        <View style={styles.validIcon}>
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </View>
      );
    }
    return null;
  };

  // ── Hint text ─────────────────────────────────────────────────────────────
  const getHint = (): { text: string; color: string } => {
    if (forbiddenChars.length > 0) {
      return { text: `You can't use ${forbiddenChars.join(', ')} in a username`, color: '#EF4444' };
    }
    if (rawInput.length === 0) {
      return { text: 'Letters, numbers, underscores and periods only', color: '#9CA3AF' };
    }
    if (formatError) {
      return { text: formatError, color: '#EF4444' };
    }
    if (isPending) {
      return { text: `Checking @${rawInput}…`, color: '#6B7280' };
    }
    if (checkFailed) {
      return { text: 'Could not verify — try again', color: '#F59E0B' };
    }
    if (isAvailable === true) {
      return { text: `@${rawInput} is available!`, color: '#10B981' };
    }
    if (isAvailable === false) {
      return { text: `@${rawInput} is already taken`, color: '#EF4444' };
    }
    return { text: 'Letters, numbers, underscores and periods only', color: '#9CA3AF' };
  };

  const hint = getHint();

  // ── Dynamic border colour ─────────────────────────────────────────────────
  const getBorderColor = () => {
    if (rawInput.length === 0) return '#E5E7EB';
    if (isPending) return '#a03048';
    if (formatError || isAvailable === false) return '#EF4444';
    if (isAvailable === true) return '#10B981';
    return '#E5E7EB';
  };

  return (
    <View>
      <View style={[styles.inputRow, { borderColor: getBorderColor() }]}>
        <View style={styles.prefixBox}>
          <Text style={styles.prefix}>@</Text>
        </View>
        <TextInput
          style={styles.input}
          value={rawInput}
          onChangeText={handleChange}
          placeholder="yourhandle"
          placeholderTextColor="#B0B7C3"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          maxLength={30}
        />
        {renderStatusIcon()}
      </View>

      <Text style={[styles.hint, { color: hint.color }]}>
        {hint.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    marginBottom: 10,
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1.5,
    borderRightColor: '#E5E7EB',
  },
  prefix: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
  },
  validIcon: {
    paddingRight: 14,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
});

export default UsernameField;
