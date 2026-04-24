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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../../src/components/common/CustomInput';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { useAuthActions } from '../../src/hooks/useAuth';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { OAUTH_CONFIG } from '../../src/constants/oauth';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login, googleAuth } = useAuthActions();
  const { promptAsync: googlePromptAsync, isLoading: googleLoading } = useGoogleAuth();

  const handleLogin = () => {
    login.mutate({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const handleGoogleSignIn = async () => {
    if (!OAUTH_CONFIG.ANDROID_CLIENT_ID && !OAUTH_CONFIG.IOS_CLIENT_ID) {
      Alert.alert('Configuration Error', 'Google Client IDs are not configured. Please check your environment variables.');
      return;
    }

    try {
      console.log('🔐 Starting Google Sign-In...');
      const idToken = await googlePromptAsync();

      if (idToken) {
        console.log('✅ Received ID Token from Google');
        // Send the ID token to the backend
        googleAuth.mutate(idToken, {
          onSuccess: (data) => {
            console.log('✅ Successfully authenticated with Google');
            // Navigation is handled automatically by the root layout when isAuthenticated changes
          },
          onError: (error: any) => {
            const errorMsg = error?.response?.data?.message || error?.message || 'Google authentication failed';
            console.error('❌ Google Auth Error:', errorMsg);
            Alert.alert('Sign-In Error', errorMsg);
          },
        });
      } else {
        console.log('❌ No ID token received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google Sign-In failed';
      console.error('❌ Google Sign-In Error:', errorMessage);
      Alert.alert('Sign-In Error', errorMessage);
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

            {googleAuth.isError && (
              <View className="bg-error/10 border border-error rounded-lg p-3 mb-4">
                <Text className="font-body text-sm text-error">
                  {(googleAuth.error as any)?.message || 'Google Sign-In failed. Please try again.'}
                </Text>
              </View>
            )}

            {/* Inputs */}
            <CustomInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
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
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[0.5px] bg-gray-100" />
              <Text className="font-body text-xs text-gray-500 mx-3">
                or continue with
              </Text>
              <View className="flex-1 h-[0.5px] bg-gray-100" />
            </View>

            {/* Google button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={googleLoading || googleAuth.isPending}
              className="h-[52px] border border-gray-100 rounded-xl flex-row justify-center items-center gap-2 bg-surface active:bg-gray-50"
            >
              {/* Simple coloured G since we can't import an SVG here */}
              <View className="w-5 h-5 rounded-full bg-primary/10 items-center justify-center">
                {googleLoading || googleAuth.isPending ? (
                  <Ionicons name="sync" size={12} color="#A03048" />
                ) : (
                  <Text className="font-headingSemi text-[10px] text-primary">G</Text>
                )}
              </View>
              <Text className="font-headingSemi text-base text-dark">
                {googleLoading || googleAuth.isPending ? 'Signing in...' : 'Continue with Google'}
              </Text>
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