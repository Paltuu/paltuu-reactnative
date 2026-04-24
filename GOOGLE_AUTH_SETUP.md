# Google Authentication Setup Guide

This guide explains how to set up and use Google authentication in the Paltuu React Native app.

## Prerequisites

- The backend is already configured with Google OAuth
- You have a Google Cloud Project with OAuth 2.0 credentials

## Setup Steps

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" → "Credentials"
4. Create OAuth 2.0 Client ID(s):
   - **For Development (Expo Go)**: Create a client ID for "Native Application" type
   - **For Production (EAS Build)**: Create Android and/or iOS OAuth 2.0 Client IDs

### 2. Configure Environment Variables

1. Open `.env` file in the project root
2. Add the Google client IDs:
   ```
   # For Expo Go / development (uses Expo proxy redirect)
   # Create this as an OAuth Client ID of type "Web application"
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id_here

   # For EAS builds / dev-client (native redirect paltuu://oauth2redirect)
   EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID=your_android_oauth_client_id_here
   EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID=your_ios_oauth_client_id_here
   ```
3. The **native** IDs should match what your backend expects for mobile token verification (if you validate `aud`).

### 3. Testing Google Auth

#### In Expo Go (Development)
```bash
npm start
# Scan with Expo Go app on your phone
```

When you click "Continue with Google":
1. The app will open a browser window
2. You'll sign in with your Google account
3. The browser will redirect back to the app with the ID token
4. The token is sent to your backend at `/api/v1/auth/google`
5. The backend verifies the token and creates/retrieves the user
6. Your app receives access and refresh tokens and logs you in

#### In Standalone/EAS Build (Production)
```bash
eas build -p ios  # or android
eas submit       # Submit to app stores
```

## How It Works

1. **Google Sign-In Flow**:
   - User taps "Continue with Google" button
   - Opens browser with Google OAuth prompt
   - User authenticates with their Google account
   - Browser redirects back with ID token

2. **Backend Verification**:
   - React Native app sends ID token to `/api/v1/auth/google`
   - Backend verifies the token using Google's auth library
   - Backend checks if user exists, creates if needed
   - Returns access token, refresh token, and user info

3. **Session Management**:
   - Tokens are stored securely using `expo-secure-store`
   - Tokens are used for subsequent API requests
   - Automatic token refresh is handled by the auth hooks

## Troubleshooting

### Google Sign-In Shows "Not Configured"
- For Expo Go: check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env` (Web client)
- For EAS builds/dev-client: check `EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID`
- Verify the client IDs are correct in Google Cloud Console

### "Invalid Google Token" Error from Backend
- Ensure backend has correct `GOOGLE_CLIENT_ID` and `GOOGLE_MOBILE_CLIENT_ID` environment variables
- Check that the Google credentials are valid and not expired

### Browser Doesn't Redirect Back to App
- For Expo Go: Make sure you're in development mode (`__DEV__` is true)
- For EAS Build: Verify the redirect URI matches your app's scheme (`paltuu://`)

### User Not Found After Google Auth
- Check that the backend has the Google auth route `/api/v1/auth/google`
- Verify the backend creates users with email and name from Google profile

## File Overview

- **`src/hooks/useGoogleAuth.ts`**: Main Google OAuth hook using expo-auth-session
- **`src/constants/oauth.ts`**: OAuth configuration constants
- **`src/hooks/useAuth.ts`**: Auth actions including googleAuth mutation
- **`app/(auth)/login.tsx`**: Login screen with Google Sign-In button

## Next Steps

- Add the Google Client ID to your `.env` file
- Test the Google Sign-In flow in your app
- For production, configure the OAuth redirect URIs in Google Cloud Console
