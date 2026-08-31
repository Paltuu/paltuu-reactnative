import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/authStore';
import { authApi } from '../../../src/api/auth';
import CustomInput from '../../../src/components/common/CustomInput';
import PaltuuButton from '../../../src/components/ui/PaltuuButton';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

type Step = 'view' | 'otp' | 'newEmail';

const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function isValidEmail(value: string) {
  const trimmed = value.trim();
  return (
    emailRegex.test(trimmed) &&
    !trimmed.includes('..') &&
    !trimmed.split('@')[0].startsWith('.') &&
    !trimmed.split('@')[0].endsWith('.')
  );
}

function PersonalInfoScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [step, setStep] = useState<Step>('view');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleBack = () => {
    if (step === 'otp') {
      setStep('view');
      setOtp('');
    } else if (step === 'newEmail') {
      setStep('otp');
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/profile/settings');
    }
  };

  const handleRequestChange = async () => {
    try {
      setLoading(true);
      const { maskedEmail: masked } = await authApi.requestEmailChangeOtp();
      setMaskedEmail(masked);
      setStep('otp');
      setResendCooldown(60);
      setTimeout(() => otpInputRef.current?.focus(), 200);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setLoading(true);
      const { maskedEmail: masked } = await authApi.requestEmailChangeOtp();
      setMaskedEmail(masked);
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

  const handleOtpChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) {
      setStep('newEmail');
    }
  };

  const handleSaveNewEmail = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Email cannot be empty.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      await authApi.changeEmail(otp, trimmed.toLowerCase());
      await fetchProfile();
      Alert.alert('Success', 'Your email has been updated.');
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/profile/settings');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to update email. Please try again.';
      Alert.alert('Error', msg);
      // A rejected/expired code should send the user back to re-enter it, not silently retry.
      if (error.response?.status === 400 || error.response?.status === 410) {
        setStep('otp');
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const digits = otp.split('');
  while (digits.length < 6) digits.push('');

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.headerBtn}>
            <Feather name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Personal Info</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'view' && (
            <>
              <View style={s.infoBanner}>
                <Ionicons name="lock-closed" size={20} color="#a03048" />
                <Text style={s.infoBannerText}>
                  This information is private and will not be displayed on your public profile.
                </Text>
              </View>

              <View style={{ gap: 20, marginBottom: 32 }}>
                <CustomInput
                  label="Email Address"
                  value={user?.email || ''}
                  editable={false}
                  leftIcon="mail-outline"
                />
              </View>

              <PaltuuButton
                label="Change Email"
                onPress={handleRequestChange}
                loading={loading}
              />
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={s.heading}>Verify it's you</Text>
              <Text style={s.subtext}>
                We sent a 6-digit code to{'\n'}
                <Text style={s.emailHighlight}>{maskedEmail || user?.email}</Text>
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

              <PaltuuButton
                label="Continue"
                onPress={() => setStep('newEmail')}
                disabled={otp.length < 6}
                style={{ marginTop: 28 }}
              />
            </>
          )}

          {step === 'newEmail' && (
            <>
              <Text style={s.heading}>Enter new email</Text>
              <Text style={s.subtext}>
                Code verified. Now enter the new email address for your account.
              </Text>

              <View style={{ gap: 20, marginBottom: 32 }}>
                <CustomInput
                  label="New Email Address"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="your.new.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  leftIcon="mail-outline"
                />
              </View>

              <PaltuuButton
                label="Save Changes"
                successLabel="Saved!"
                onPress={handleSaveNewEmail}
                loading={loading}
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
    alignItems: 'center',
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
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    color: '#4B5563',
    lineHeight: 18,
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

export default withFocusUnmount(PersonalInfoScreen);
