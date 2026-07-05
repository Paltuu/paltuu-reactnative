import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { useAuthActions } from '../../src/hooks/useAuth';
import client from '../../src/api/client';

/** Dev-only bypass code — the backend only accepts this outside production. */
const DEV_OTP_BYPASS = '000000';

export default function OTPScreen() {
  const { name, email, password, username } = useLocalSearchParams<{
    name: string;
    email: string;
    password?: string;
    username?: string;
  }>();
  const [otp, setOtp] = useState('');
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { register, sendOtp } = useAuthActions();

  // Falls back to the username step if there's no navigation history to pop
  // (e.g. this screen was reached directly), instead of a dead "GO_BACK" error.
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/username');
    }
  };

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) {
      submitOtp(digits);
    }
  };

  const submitOtp = (code: string) => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Missing details. Please go back and try again.');
      return;
    }
    register.mutate(
      { name, email: email.trim().toLowerCase(), password, otp: code },
      {
        onSuccess: async () => {
          if (username) {
            try {
              await client.patch('/social/profile/update', { social_username: username });
            } catch {
              // Non-fatal — the username can be picked up later from the profile screen.
            }
          }
          router.replace('/interests');
        },
        onError: (error: any) => {
          Alert.alert('Error', error.response?.data?.message || 'Verification failed. Please try again.');
        },
      }
    );
  };

  const handleVerify = () => {
    if (otp.length < 6) {
      Alert.alert('Code incomplete', 'Please enter the full 6-digit code.');
      return;
    }
    submitOtp(otp);
  };

  const handleResend = () => {
    if (!email) return;
    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: () => {
        setOtp('');
        Alert.alert('Sent!', 'A new code has been sent to your email.');
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to resend code.');
      },
    });
  };

  const digits = otp.split('');
  while (digits.length < 6) digits.push('');

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={handleClose} variant="close" progress={5 / 6} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Enter the code</Text>
          <Text style={styles.subtext}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* Digit boxes — tapping focuses the hidden input */}
          <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
            {digits.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.digitBox,
                  i === otp.length && styles.digitBoxActive,
                  d ? styles.digitBoxFilled : null,
                ]}
              >
                <Text style={styles.digitText}>{d}</Text>
              </View>
            ))}
          </Pressable>

          {/* Invisible actual input */}
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            caretHidden
            style={styles.hiddenInput}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive a code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={sendOtp.isPending}>
              <Text style={[styles.resendLink, sendOtp.isPending && { opacity: 0.5 }]}>
                Resend
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <TouchableOpacity
              onPress={() => submitOtp(DEV_OTP_BYPASS)}
              style={styles.devSkip}
            >
              <Text style={styles.devSkipText}>Skip OTP (dev only)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Verify"
            successLabel="Welcome to Paltuu!"
            onPress={handleVerify}
            loading={register.isPending}
            radius={26}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  heading: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 36,
    lineHeight: 22,
  },
  emailHighlight: {
    color: '#a03048',
    fontFamily: 'Montserrat_600SemiBold',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  digitBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: '#a03048',
    backgroundColor: '#FFF5F7',
  },
  digitBoxFilled: {
    borderColor: '#a03048',
    backgroundColor: '#FFFFFF',
  },
  digitText: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    top: 0,
    left: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
  },
  devSkip: {
    marginTop: 20,
    alignSelf: 'center',
  },
  devSkipText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
});
