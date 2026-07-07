import React, { useState, useRef, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { authApi } from '../../src/api/auth';

type Step = 'email' | 'otp' | 'newPassword';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Step management
  const [step, setStep] = useState<Step>('email');

  // Step 1: Email
  const [email, setEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Shared
  const [loading, setLoading] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email');
    } else if (step === 'newPassword') {
      setStep('otp');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  };

  // ─── Step 1: Send OTP ───────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    try {
      setLoading(true);
      await authApi.forgotPasswordOtp(email.trim().toLowerCase());
      Alert.alert('Code Sent!', 'Check your email for a 6-digit code.');
      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to send reset code.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    try {
      setLoading(true);
      await authApi.verifyOtp(email.trim().toLowerCase(), code);
      setStep('newPassword');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Invalid code or expired.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: OTP handling ──────────────────────────
  const handleOtpChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) {
      verifyCode(digits);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      await authApi.forgotPasswordOtp(email.trim().toLowerCase());
      setOtp('');
      Alert.alert('Sent!', 'A new code has been sent to your email.');
      setResendCooldown(60);
      otpInputRef.current?.focus();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to resend code.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      Alert.alert('Code incomplete', 'Please enter the full 6-digit code.');
      return;
    }
    verifyCode(otp);
  };

  // ─── Step 3: Reset Password ────────────────────────
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords don\'t match.');
      return;
    }
    try {
      setLoading(true);
      await authApi.resetPasswordOtp(email.trim().toLowerCase(), otp, newPassword);
      Alert.alert(
        'Success!',
        'Your password has been reset. Please log in with your new password.',
        [
          {
            text: 'Go to Login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to reset password.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP digit display
  const digits = otp.split('');
  while (digits.length < 6) digits.push('');

  const progressValue = step === 'email' ? 1 / 3 : step === 'otp' ? 2 / 3 : 1;

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={handleBack} progress={progressValue} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* ═══ Step 1: Email ═══ */}
        {step === 'email' && (
          <>
            <View style={styles.body}>
              <Text style={styles.heading}>Reset password</Text>
              <Text style={styles.subtext}>
                Enter your email and we'll send you a 6-digit code to reset your password.
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#B0B7C3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                autoFocus
              />
            </View>

            <View style={styles.bottom}>
              <PaltuuButton
                label="Send Code"
                successLabel="Code Sent!"
                onPress={handleSendOtp}
                loading={loading}
                disabled={!email.trim()}
                radius={26}
              />
            </View>
          </>
        )}

        {/* ═══ Step 2: OTP ═══ */}
        {step === 'otp' && (
          <>
            <View style={styles.body}>
              <Text style={styles.heading}>Enter the code</Text>
              <Text style={styles.subtext}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {/* Digit boxes */}
              <Pressable style={styles.otpRow} onPress={() => otpInputRef.current?.focus()}>
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

              {/* Hidden input */}
              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                caretHidden
                style={styles.hiddenInput}
              />

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive a code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || loading}>
                  <Text style={[styles.resendLink, (resendCooldown > 0 || loading) && { opacity: 0.5 }]}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottom}>
              <PaltuuButton
                label="Verify"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.length < 6}
                radius={26}
              />
            </View>
          </>
        )}

        {/* ═══ Step 3: New Password ═══ */}
        {step === 'newPassword' && (
          <>
            <View style={styles.body}>
              <Text style={styles.heading}>New password</Text>
              <Text style={styles.subtext}>
                Create a new password for your account.
              </Text>

              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, { paddingRight: 52 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#B0B7C3"
                  secureTextEntry={!showNewPw}
                  returnKeyType="next"
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => setShowNewPw((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNewPw ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.passwordWrap, { marginTop: 12 }]}>
                <TextInput
                  style={[styles.input, { paddingRight: 52 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#B0B7C3"
                  secureTextEntry={!showConfirmPw}
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPw((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPw ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Passwords don't match</Text>
              )}
            </View>

            <View style={styles.bottom}>
              <PaltuuButton
                label="Reset Password"
                successLabel="Password Reset!"
                onPress={handleResetPassword}
                loading={loading}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                radius={26}
              />
            </View>
          </>
        )}
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
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#EF4444',
    marginTop: 8,
  },
  // OTP styles (matching otp.tsx)
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
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
});
