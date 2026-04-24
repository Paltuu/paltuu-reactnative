// OAuth Configuration for Paltuu Mobile App
// Update with your Google OAuth credentials

export const OAUTH_CONFIG = {
  // Used for Expo Go (proxy redirect) and can also be used as a fallback.
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID || '',
  IOS_CLIENT_ID: process.env.EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID || '',
};

// Validate that required config is present
if (
  !OAUTH_CONFIG.GOOGLE_CLIENT_ID &&
  !OAUTH_CONFIG.ANDROID_CLIENT_ID &&
  !OAUTH_CONFIG.IOS_CLIENT_ID
) {
  console.warn('⚠️ Google Client IDs not set. Google Sign-In will not work.');
  console.warn(
    'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID (Expo Go) and/or EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID / EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID in your .env file'
  );
}

