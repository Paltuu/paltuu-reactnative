import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { IllustrationPlaceholder } from '../../src/components/common/IllustrationPlaceholder';
import { AuthMethodButton } from '../../src/components/ui/AuthMethodButton';
import { useAuthStore } from '../../src/stores/authStore';

// Required for Android browser redirect handling
WebBrowser.maybeCompleteAuthSession();

const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
const BUILD_VERSION = Constants.nativeBuildVersion ?? '';

export default function WelcomeScreen() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthAsNewUser = useAuthStore((state) => state.setAuthAsNewUser);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBaseUrl) {
        throw new Error('API URL is not configured.');
      }

      const redirectUrl = Linking.createURL('oauth2redirect');
      const authUrl = `${apiBaseUrl}/v1/auth/google/mobile?app_redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const { queryParams } = parsed;

        const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

        const error = str(queryParams?.error);
        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        const tokenStr = str(queryParams?.token);
        const refreshStr = str(queryParams?.refreshToken);
        const userIdStr = str(queryParams?.userId);
        const emailStr = str(queryParams?.email);
        const nameStr = str(queryParams?.name);
        const roleStr = str(queryParams?.role);
        const avatarStr = str(queryParams?.profile_image_url);
        const isNewUserStr = str(queryParams?.isNewUser);

        if (!tokenStr || !refreshStr) {
          throw new Error('Authentication tokens were not returned.');
        }

        const googleUser = (userIdStr && emailStr) ? {
          id: userIdStr,
          email: emailStr,
          name: nameStr || emailStr,
          role: roleStr || 'regular user',
          profile_image_url: avatarStr || null,
        } : null;

        if (isNewUserStr === 'true') {
          await setAuthAsNewUser(googleUser as any, tokenStr, refreshStr, true);
          router.replace('/oauth-username');
        } else {
          await setAuth(googleUser as any, tokenStr, refreshStr);
          Toast.show({
            type: 'success',
            text1: 'Welcome back!',
            text2: 'Successfully signed in with Google',
          });
        }
      } else if (result.type === 'cancel') {
        // User dismissed the auth sheet — nothing to do.
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
      text2: "Apple Sign-In isn't available yet.",
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Image
          source={require('../../assets/paltuu_bilkul_tight.svg')}
          style={{ width: 120, height: 64 }}
          contentFit="contain"
          tintColor="#a03048"
        />

        <View style={styles.illustrationZone}>
          <IllustrationPlaceholder label="Mascot standalone, welcoming pose" style={{ flex: 1, width: '100%' }} />
        </View>

        {/* <Text style={styles.tagline}>Pakistan's pet community</Text> */}
      </View>

      <View style={styles.bottom}>
        <AuthMethodButton
          variant="google"
          label="Continue with Google"
          onPress={handleGoogleSignIn}
          loading={isGoogleLoading}
        />
        <View style={{ height: 12 }} />
        <AuthMethodButton
          variant="apple"
          label="Login with Apple"
          onPress={handleAppleSignIn}
          disabled={isGoogleLoading}
        />
        <View style={{ height: 12 }} />
        <AuthMethodButton
          variant="email"
          label="Continue with email"
          onPress={() => router.push('/(auth)/login')}
          disabled={isGoogleLoading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Privacy Policy · Terms of Service</Text>
          {!!APP_VERSION && (
            <Text style={styles.versionText}>
              v{APP_VERSION}{BUILD_VERSION ? ` (${BUILD_VERSION})` : ''}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  top: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  illustrationZone: {
    flex: 1,
    width: '100%',
    marginTop: 24,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#555555',
  },
  bottom: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: '#999999',
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: '#999999',
    marginTop: 4,
  },
});
