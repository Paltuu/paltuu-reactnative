import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';

const STEPS = [
  {
    heading: "What's your name?",
    subtext: 'Add your name so other pet lovers can find you.',
  },
  {
    heading: "What's your email?",
    subtext: "You'll use this to log in and get your verification code.",
  },
  {
    heading: 'Create a password',
    subtext: 'Must be at least 8 characters.',
  },
];

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: '#E5E7EB' };
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);
  const score = [hasLower || hasUpper, hasNumber, hasSymbol, pw.length >= 10].filter(Boolean).length;
  if (pw.length < 8) return { level: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { level: 2, label: 'Fair', color: '#F59E0B' };
  return { level: 3, label: 'Strong', color: '#10B981' };
}

export default function RegisterScreen() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  const strength = getPasswordStrength(password);

  const handleNext = () => {
    if (step === 0) {
      if (!name.trim()) {
        Alert.alert('Name required', 'Please enter your full name.');
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (!email.trim() || !email.includes('@')) {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }
      setStep(2);
    } else {
      if (password.length < 8) {
        Alert.alert('Password too short', 'Password must be at least 8 characters.');
        return;
      }
      router.push({
        pathname: '/(auth)/username',
        params: { name, email, password },
      });
    }
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const { heading, subtext } = STEPS[step];

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={handleBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          {/* Step heading */}
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtext}>{subtext}</Text>

          {/* Name */}
          {step === 0 && (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#B0B7C3"
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          )}

          {/* Email */}
          {step === 1 && (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. john@example.com"
              placeholderTextColor="#B0B7C3"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          )}

          {/* Password */}
          {step === 2 && (
            <View>
              <View style={styles.passwordWrap}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { paddingRight: 52 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#B0B7C3"
                  secureTextEntry={!showPassword}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength meter */}
              {password.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((bar) => (
                      <View
                        key={bar}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: strength.level >= bar ? strength.color : '#E5E7EB' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottom}>
          <PaltuuButton
            label={step === 2 ? 'Continue' : 'Next'}
            onPress={handleNext}
          />

          {step === 0 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: '#111827',
    backgroundColor: '#FAFAFA',
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
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 99,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    width: 44,
    textAlign: 'right',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
  },
});
