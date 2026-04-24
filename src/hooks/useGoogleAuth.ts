import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

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

  // 1. Initialize the Google Auth Request
  // By not specifying responseType, it defaults to 'code' (Auth Code Flow)
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    // Force the use of the native scheme 'paltuu://' instead of local IP addresses
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'paltuu',
      path: 'oauth2redirect',
    }),
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

    setIsLoading(true);
    try {
      console.log('🔐 [Google Auth] Starting Authorization Code flow (PKCE)...');
      const result = await promptAsync();

      if (result.type === 'success') {
        const { code } = result.params;
        console.log('✅ [Google Auth] Received authorization code');

        // 2. Exchange the Code for Tokens
        // This is the secure "Industry Standard" way to get the ID Token
        console.log('🔐 [Google Auth] Exchanging code for tokens...');
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: Platform.select({
              android: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID,
              ios: process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID,
              default: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
            }) || '',
            code,
            redirectUri: AuthSession.makeRedirectUri(),
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




