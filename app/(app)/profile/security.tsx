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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../../src/components/ui/PaltuuButton';
import { authApi } from '../../../src/api/auth';
import { useAuthStore } from '../../../src/stores/authStore';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

type Step = 'intro' | 'otp' | 'newPassword';

function SecurityScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const email = (user?.email || '').trim().toLowerCase();

  const [step, setStep] = useState<Step>('intro');

  const [otp, setOtp] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleBack = () => {
    if (step === 'otp') {
      setStep('intro');
      setOtp('');
    } else if (step === 'newPassword') {
      setStep('otp');
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/profile/settings');
    }
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      await authApi.forgotPasswordOtp(email);
      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    try {
      setLoading(true);
      await authApi.verifyOtp(email, code);
      setStep('newPassword');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid code or expired.');
    } finally {
      setLoading(false);
    }
  };

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
      await authApi.forgotPasswordOtp(email);
      setOtp('');
      Alert.alert('Sent!', 'A new code has been sent to your email.');
      setResendCooldown(60);
      otpInputRef.current?.focus();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', "Passwords don't match.");
      return;
    }
    try {
      setLoading(true);
      await authApi.resetPasswordOtp(email, otp, newPassword);
      Alert.alert('Success', 'Your password has been changed.');
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/profile/settings');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const digits = otp.split('');
  while (digits.length < 6) digits.push('');

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.headerBtn}>
          <Feather name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Security & Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'intro' && (
            <>
              <View style={s.infoBanner}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#a03048" />
                <Text style={s.infoBannerText}>
                  To change your password, we'll send a 6-digit verification code to{' '}
                  <Text style={s.emailHighlight}>{email}</Text>.
                </Text>
              </View>

              <PaltuuButton label="Change Password" onPress={handleSendOtp} loading={loading} />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={s.heading}>Enter the code</Text>
              <Text style={s.subtext}>
                We sent a 6-digit code to{'\n'}
                <Text style={s.emailHighlight}>{email}</Text>
              </Text>

              <Pressable style={s.otpRow} onPress={() => otpInputRef.current?.focus()}>
                {digits.map((d, i) => (
                  <View
                    key={i}
                    style={[s.digitBox, i === otp.length && s.digitBoxActive, d ? s.digitBoxFilled : null]}
                  >
                    <Text style={s.digitText}>{d}</Text>
                  </View>
                ))}
              </Pressable>

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                caretHidden
                style={s.hiddenInput}
              />

              <View style={s.resendRow}>
                <Text style={s.resendText}>Didn't receive a code? </Text>
                <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || loading}>
                  <Text style={[s.resendLink, (resendCooldown > 0 || loading) && { opacity: 0.5 }]}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Text style={s.heading}>New password</Text>
              <Text style={s.subtext}>Create a new password for your account.</Text>

              <View style={s.passwordWrap}>
                <TextInput
                  style={[s.input, { paddingRight: 52 }]}
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
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showNewPw ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <View style={[s.passwordWrap, { marginTop: 12 }]}>
                <TextInput
                  style={[s.input, { paddingRight: 52 }]}
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
                  style={s.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showConfirmPw ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={s.errorText}>Passwords don't match</Text>
              )}

              <PaltuuButton
                label="Reset Password"
                successLabel="Password Changed!"
                onPress={handleResetPassword}
                loading={loading}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                style={{ marginTop: 28 }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FAF0F2',
    borderWidth: 1,
    borderColor: '#f3e0e4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    color: '#4B5563',
    lineHeight: 19,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
    marginBottom: 28,
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
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
});

export default withFocusUnmount(SecurityScreen);
