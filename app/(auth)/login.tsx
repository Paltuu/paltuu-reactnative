import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { CustomInput } from '../../src/components/common/CustomInput';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import GoogleButton from '../../src/components/ui/GoogleButton';
import AppleButton from '../../src/components/ui/AppleButton';
import { useAuthActions } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/stores/authStore';
import { PawrvezTooltip, PawrvezDialog } from '../../src/components/common/mascot';

// Required for Android browser redirect handling
WebBrowser.maybeCompleteAuthSession();


export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showMascotTooltip, setShowMascotTooltip] = useState(false);
  const [showMascotDialog, setShowMascotDialog] = useState(false);
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
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

      const redirectUrl = Linking.createURL('oauth2redirect');
      const authUrl = `${apiBaseUrl}/v1/auth/google/mobile?app_redirect=${encodeURIComponent(redirectUrl)}`;

      console.log('[Google Sign-In] Initiating session:', { authUrl, redirectUrl });

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { queryParams } = parsed;

        const token = queryParams?.token;
        const refreshToken = queryParams?.refreshToken;
        const error = queryParams?.error;
        const userId = queryParams?.userId;
        const name = queryParams?.name;
        const email = queryParams?.email;
        const role = queryParams?.role;
        const profile_image_url = queryParams?.profile_image_url;

        if (error) {
          throw new Error(decodeURIComponent(Array.isArray(error) ? error[0] : error));
        }

        const str = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

        const tokenStr = str(token);
        const refreshStr = str(refreshToken);
        const userIdStr = str(userId);
        const emailStr = str(email);
        const nameStr = str(name);
        const roleStr = str(role);
        const avatarStr = str(profile_image_url);

        if (tokenStr && refreshStr) {
          const googleUser = (userIdStr && emailStr) ? {
            id: userIdStr,
            email: emailStr,
            name: nameStr || emailStr,
            role: roleStr || 'regular user',
            profile_image_url: avatarStr || null,
          } : null;
          await setAuth(googleUser as any, tokenStr, refreshStr);
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

  const handleAppleSignIn = () => {
    Toast.show({
      type: 'info',
      text1: 'Coming soon',
      text2: 'Apple Sign-In isn\'t available yet.',
    });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-bg">
      <StatusBar style="light" />
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
          <View
            className="bg-primary px-5 items-center justify-center rounded-b-[10px]"
            style={{ height: screenHeight * 0.45 }}
          >
            <View style={{ alignItems: 'center', marginTop: -40 }}>
              <Image
                source={require('../../assets/paltuu_bilkul_tight.svg')}
                style={{ width: 140, height: 74 }}
                contentFit="contain"
                tintColor="#ffffff"
              />

              <Text className="font-heading text-sm text-white/70 mt-3 tracking-widest uppercase">
                The pet Super App
              </Text>
            </View>
          </View>

          {/* ── Card that floats over hero ── */}
          <View
            className="mx-5 bg-surface rounded-[32px] p-6"
            style={{ marginTop: -128 + screenHeight * 0.05 }}
          >
            {/* Heading */}
            <Text className="font-heading text-2xl text-dark text-center mb-6">
              Welcome back!
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
              leftIcon="mail-outline"
              keyboardType="email-address"
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
              leftIcon="lock-closed-outline"
            />

            {/* Forgot password */}
            <PawrvezTooltip
              visible={showMascotTooltip}
              text="Psst... enter your email and we'll send you a reset link!"
              onDismiss={() => setShowMascotTooltip(false)}
              placement="top"
            >
              <TouchableOpacity
                onPress={() => setShowMascotTooltip(true)}
                className="self-end mt-2 mb-6"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="font-headingSemi text-xs text-primary">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </PawrvezTooltip>

            {/* DEV ONLY: Pawrvez mascot playground — remove once positioning is finalized */}
            {__DEV__ && (
              <View className="flex-row justify-center gap-3 mb-4">
                <TouchableOpacity
                  onPress={() => setShowMascotTooltip(true)}
                  className="bg-gray-100 rounded-lg px-3 py-2"
                >
                  <Text className="font-body text-xs text-gray-700">Show tooltip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowMascotDialog(true)}
                  className="bg-gray-100 rounded-lg px-3 py-2"
                >
                  <Text className="font-body text-xs text-gray-700">Show dialog</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* CTA */}
            <PaltuuButton
              label="Sign In"
              successLabel="Welcome back!"
              onPress={handleLogin}
              loading={login.isPending}
              disabled={isGoogleLoading}
              loaderType="dots"
              collapseOnLoad={false}
            />

            {/* Divider */}
            <View className="flex-row items-center my-5">
              <View className="flex-1 h-[1px] bg-gray-200" />
              <Text className="mx-3 text-xs font-body text-gray-400">or connect with</Text>
              <View className="flex-1 h-[1px] bg-gray-200" />
            </View>

            <GoogleButton
              onPress={handleGoogleSignIn}
              loading={isGoogleLoading}
              disabled={login.isPending}
            />

            <View className="h-3" />

            <AppleButton
              onPress={handleAppleSignIn}
              disabled={login.isPending || isGoogleLoading}
            />
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

      {/* DEV ONLY: Pawrvez mascot playground — remove once positioning is finalized */}
      {__DEV__ && (
        <PawrvezDialog
          visible={showMascotDialog}
          text="Woohoo! You're back! Login to find out what your paltuu has been up to while you were away!"
          actionLabel="Let's go!"
          onDismiss={() => setShowMascotDialog(false)}
        />
      )}
    </SafeAreaView>
  );
}