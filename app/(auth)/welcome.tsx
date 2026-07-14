import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthMethodButton } from '../../src/components/ui/AuthMethodButton';
import { PawrvezDialog } from '../../src/components/common/mascot';
import { useAuthStore } from '../../src/stores/authStore';
import { storage } from '../../src/utils/storage';
import client from '../../src/api/client';

// Required for Android browser redirect handling
WebBrowser.maybeCompleteAuthSession();

const APP_VERSION = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
const BUILD_VERSION = Constants.nativeBuildVersion ?? '';

// Pawrvez greets the user, then delivers what used to be the onboarding slides
// as a sequence of dialogs. Shown once, right after a fresh install.
const INTRO_DIALOGS = [
  "Hey, I'm Pawrvez! So happy you're here. Let's find your new best friend together!",
  'Every pet deserves a home — thousands across Pakistan are still waiting for theirs.',
  'Find a vet you can trust: discover clinics and read reviews, all in one place.',
  "You found your people — welcome to Pakistan's largest pet community!",
];

export default function WelcomeScreen() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [dialogIndex, setDialogIndex] = useState(-1);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthAsNewUser = useAuthStore((state) => state.setAuthAsNewUser);

  // The very first time a freshly-installed app lands on this screen, Pawrvez
  // walks through the intro dialogs one after the other. Shown once ever.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (await storage.isWelcomeMascotSeen()) return;
      await storage.markWelcomeMascotSeen();
      timer = setTimeout(() => setDialogIndex(0), 550);
    })();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Advance to the next intro dialog, or close the sequence after the last one.
  const advanceDialog = () =>
    setDialogIndex((i) => (i + 1 < INTRO_DIALOGS.length ? i + 1 : -1));

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

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device.');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName, email } = credential;
      if (!identityToken) {
        throw new Error('Apple Sign-In did not return an identity token.');
      }

      const response = await client.post('/auth/apple/mobile', {
        identityToken,
        fullName: fullName ? {
          givenName: fullName.givenName || null,
          familyName: fullName.familyName || null,
        } : null,
        email: email || null,
      });

      const {
        token: tokenStr,
        refreshToken: refreshStr,
        userId: userIdStr,
        email: emailStr,
        name: nameStr,
        role: roleStr,
        profile_image_url: avatarStr,
        isNewUser,
      } = response.data;

      if (!tokenStr || !refreshStr) {
        throw new Error('Authentication tokens were not returned.');
      }

      const appleUser = {
        id: userIdStr,
        email: emailStr,
        name: nameStr || emailStr,
        role: roleStr || 'regular user',
        profile_image_url: avatarStr || null,
      };

      if (isNewUser) {
        await setAuthAsNewUser(appleUser as any, tokenStr, refreshStr, true);
        router.replace('/oauth-username');
      } else {
        await setAuth(appleUser as any, tokenStr, refreshStr);
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: 'Successfully signed in with Apple',
        });
      }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') {
        console.log('[Apple Sign-In] User cancelled sign-in.');
        return;
      }
      console.error('[Apple Sign-In] Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Sign In Failed',
        text2: err.response?.data?.error || err.message || 'An error occurred during Apple Sign-In.',
      });
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text
          style={styles.headline}
          // adjustsFontSizeToFit is unreliable on Android — combined with a
          // custom font it can render the text fully blank instead of
          // shrinking it, so only iOS gets the shrink-to-fit behavior; Android
          // just wraps to a second line if needed.
          {...(Platform.OS === 'ios'
            ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7 }
            : { numberOfLines: 2 })}
        >
          Find Your New Best Friend
        </Text>
        <Text style={styles.subheadline}>
          Join Pakistan's largest pet community
        </Text>

        <View style={styles.illustrationZone}>
          <Image
            source={require('../../assets/login-journey/login-page.png')}
            style={styles.illustrationImg}
            contentFit="contain"
          />
        </View>
      </View>

      <View style={styles.bottom}>
        <AuthMethodButton
          variant="google"
          label="Continue with Google"
          onPress={handleGoogleSignIn}
          loading={isGoogleLoading}
          disabled={isAppleLoading}
        />
        <View style={{ height: 12 }} />
        <AuthMethodButton
          variant="apple"
          label="Continue with Apple"
          onPress={handleAppleSignIn}
          loading={isAppleLoading}
          disabled={isGoogleLoading || isAppleLoading}
        />
        <View style={{ height: 12 }} />
        <AuthMethodButton
          variant="email"
          label="Continue with email"
          onPress={() => router.push('/(auth)/login')}
          disabled={isGoogleLoading || isAppleLoading}
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

      <PawrvezDialog
        visible={dialogIndex >= 0}
        text={INTRO_DIALOGS[dialogIndex] ?? ''}
        onDismiss={() => setDialogIndex(-1)}
        actionLabel={dialogIndex >= INTRO_DIALOGS.length - 1 ? "Let's go" : 'Next'}
        onAction={advanceDialog}
      />
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
  headline: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginTop: 16,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#555555',
    textAlign: 'center',
    marginTop: 8,
  },
  illustrationZone: {
    flex: 1,
    width: '100%',
    marginTop: 24,
    marginBottom: 20,
  },
  illustrationImg: {
    flex: 1,
    width: '100%',
    transform: [{ scale: 0.95 }, { translateY: -12 }],
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
