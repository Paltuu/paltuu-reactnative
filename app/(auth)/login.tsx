import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CustomInput } from '../../src/components/common/CustomInput';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { useAuthActions } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/stores/authStore';

// Required for Android browser redirect handling
WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthActions();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = () => {
    login.mutate({
      email: identifier.trim(),
      password,
    });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBaseUrl) {
        throw new Error('API URL is not configured.');
      }

      const authUrl = `${apiBaseUrl}/v1/auth/google/mobile`;
      const redirectUrl = Linking.createURL('oauth2redirect');

      console.log('[Google Sign-In] Initiating session:', { authUrl, redirectUrl });

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { queryParams } = parsed;

        const token = queryParams?.token;
        const refreshToken = queryParams?.refreshToken;
        const error = queryParams?.error;

        if (error) {
          throw new Error(decodeURIComponent(Array.isArray(error) ? error[0] : error));
        }

        const tokenStr = Array.isArray(token) ? token[0] : token;
        const refreshStr = Array.isArray(refreshToken) ? refreshToken[0] : refreshToken;

        if (tokenStr && refreshStr) {
          await setAuth(null, tokenStr, refreshStr);
          Toast.show({
            type: 'success',
            text1: 'Welcome!',
            text2: 'Successfully signed in with Google',
          });
        } else {
          throw new Error('Authentication tokens were not returned.');
        }
      } else if (result.type === 'cancel') {
        console.log('[Google Sign-In] Flow cancelled by user');
      } else {
        throw new Error('Could not complete authentication session.');
      }
    } catch (err: any) {
      console.error('[Google Sign-In] Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: err.message || 'An error occurred during Google Sign-In.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero / Branding ── */}
          <View className="bg-primary px-5 pt-8 pb-16 items-center rounded-b-[40px]">
            {/* Decorative paw blobs */}
            <View
              className="absolute top-4 right-6 w-20 h-20 rounded-full bg-white/10"
              pointerEvents="none"
            />
            <View
              className="absolute bottom-6 left-4 w-12 h-12 rounded-full bg-white/10"
              pointerEvents="none"
            />

            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 140, height: 52 }}
              resizeMode="contain"
            />

            <Text className="font-body text-sm text-white/70 mt-3 tracking-widest uppercase">
              your pet's social home
            </Text>
          </View>

          {/* ── Card that floats over hero ── */}
          <View className="mx-5 -mt-8 bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
            {/* Heading */}
            <Text className="font-heading text-2xl text-dark mb-1">
              Welcome back!
            </Text>
            <Text className="font-body text-sm text-gray-500 mb-6">
              Sign in to see what your furry community is up to.
            </Text>

            {/* Error messages */}
            {login.isError && (
              <View className="bg-error/10 border border-error rounded-lg p-3 mb-4">
                <Text className="font-body text-sm text-error">
                  {(login.error as any)?.message || 'Login failed. Please try again.'}
                </Text>
              </View>
            )}

            {/* Inputs */}
            <CustomInput
              label="Email or Username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              placeholder="Enter your email or username"
            />

            <View className="mt-4">
              <CustomInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
              />
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => { }}
              className="self-end mt-2 mb-6"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="font-headingSemi text-xs text-primary">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* CTA */}
            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
            />

            {/* Divider */}
            <View className="flex-row items-center my-5">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-3 text-xs font-body text-gray-400">or connect with</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || login.isPending}
              className={`h-[52px] border border-gray-200 rounded-button flex-row justify-center items-center w-full bg-white ${
                isGoogleLoading ? 'opacity-40' : ''
              }`}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
              <Text className="text-dark text-base font-headingSemi">Sign in with Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View className="flex-row justify-center mt-6">
            <Text className="font-body text-sm text-gray-500">
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="font-headingSemi text-sm text-primary">
                Create one
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}