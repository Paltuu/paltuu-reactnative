import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { OnboardingHeader } from '../../src/components/auth/OnboardingHeader';
import { useAuthActions } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const { email: prefillEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(() => (typeof prefillEmail === 'string' ? prefillEmail : ''));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuthActions();

  const handleLogin = () => {
    login.mutate({ email: email.trim(), password });
  };

  // Falls back to Welcome if there's no navigation history to pop (e.g. this
  // screen was reached directly), instead of a dead "GO_BACK" error.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader onBack={handleBack} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          <Text style={styles.heading}>Welcome back</Text>

          {login.isError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                {(login.error as any)?.response?.data?.message || 'Login failed. Please try again.'}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor="#B0B7C3"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <View style={[styles.passwordWrap, { marginTop: 12 }]}>
            <TextInput
              style={[styles.input, { paddingRight: 52 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#B0B7C3"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrap}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.bottom}>
          <PaltuuButton
            label="Log In"
            successLabel="Welcome back!"
            onPress={handleLogin}
            loading={login.isPending}
            radius={26}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A2E',
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#C0392B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#C0392B',
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
  },
  bottom: {
    paddingHorizontal: 20,
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
    color: '#555555',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#a03048',
  },
});
