import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

/**
 * useGoogleAuth
 *
 * Industry-standard Google OAuth 2.0 implementation for React Native.
 * Follows Google's security best practices:
 * - Authorization Code Flow with PKCE
 * - Platform-specific Client IDs
 * - Secure Token Exchange
 */
export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const isExpoGo = Constants.appOwnership === 'expo';

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const nativeAndroidClientId = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID || '';
  const nativeIosClientId = process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID || '';

  // Expo Go can't receive custom-scheme redirects (paltuu://...), so use proxy.
  // Standalone/dev-client can use the real app scheme.
  const expoOwner = process.env.EXPO_PUBLIC_EXPO_OWNER || '';
  const expoSlug = Constants.expoConfig?.slug || 'paltuu';

  const redirectUri = isExpoGo
    ? expoOwner
      ? `https://auth.expo.io/@${expoOwner}/${expoSlug}`
      : // If owner isn't provided, fall back (may produce exp:// on some setups).
        AuthSession.makeRedirectUri()
    : AuthSession.makeRedirectUri({ scheme: 'paltuu', path: 'oauth2redirect' });

  // 1. Initialize the Google Auth Request
  // By not specifying responseType, it defaults to 'code' (Auth Code Flow)
  const [request, response, promptAsync] = Google.useAuthRequest({
    // On Expo Go (Android/iOS), the provider still requires platform client IDs.
    // We point them at the Web client when using the proxy redirect URI.
    androidClientId: isExpoGo ? webClientId : nativeAndroidClientId,
    iosClientId: isExpoGo ? webClientId : nativeIosClientId,
    webClientId,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });


  const handlePromptAsync = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Google Sign-In is currently mobile-only.');
      return null;
    }

    if (!request) {
      console.warn('🔐 [Google Auth] Request not ready. Ensure .env variables are set.');
      return null;
    }

    console.log('🔐 [Google Auth] Redirect URI:', request.redirectUri);
    setIsLoading(true);
    try {
      console.log('🔐 [Google Auth] Starting Authorization Code flow (PKCE)...');
      const result = await promptAsync(isExpoGo ? { useProxy: true } : undefined);

      if (result.type === 'success') {
        const { code } = result.params;
        console.log('✅ [Google Auth] Received authorization code');

        // 2. Exchange the Code for Tokens
        // This is the secure "Industry Standard" way to get the ID Token
        console.log('🔐 [Google Auth] Exchanging code for tokens...');
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: Platform.select({
              android: isExpoGo ? webClientId : nativeAndroidClientId,
              ios: isExpoGo ? webClientId : nativeIosClientId,
              default: webClientId,
            }),
            code,
            redirectUri: request.redirectUri ?? redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
        );

        if (tokenResult.idToken) {
          console.log('✅ [Google Auth] Successfully received ID token via PKCE exchange');
          return tokenResult.idToken;
        }
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('⚠️ [Google Auth] Flow cancelled by user');
      }

      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      console.error('❌ [Google Auth] Error:', msg);
      Alert.alert('Sign-In Error', msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    promptAsync: handlePromptAsync,
    isLoading: isLoading || !request,
    error: response?.type === 'error' ? response.error?.message : null,
  };
};




