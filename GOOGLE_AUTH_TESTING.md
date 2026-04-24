# Google Authentication - Complete Setup & Testing Guide

## ✅ Setup Checklist

### Backend Configuration
- [ ] `GOOGLE_CLIENT_ID` set in `.env` (web OAuth client)
- [ ] `GOOGLE_MOBILE_CLIENT_ID` set in `.env` (mobile OAuth client)
- [ ] `GOOGLE_CLIENT_SECRET` set in `.env`
- [ ] Backend running on `http://localhost:3000`

### React Native App Configuration
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` set in `.env` file (Expo Go / development)
- [ ] `EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID` set in `.env` file (Android EAS/dev-client)
- [ ] `EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID` set in `.env` file (iOS EAS/dev-client)
- [ ] Package name `com.paltuu.app` configured in `app.json`
- [ ] SHA-1 fingerprint added to Google Cloud Console
- [ ] Google OAuth credentials updated with package name and fingerprint

### Google Cloud Console Configuration
- [ ] OAuth 2.0 credentials created
- [ ] Android app configured with:
  - Package name: `com.paltuu.app`
  - SHA-1 fingerprint: `834A577282C3EEDEA4D1C8E9E305491FA05CDA07`

## 🚀 Testing Steps

### 1. Start the Backend
```bash
cd d:\paltuu\Pet\petproj
npm run dev
# or
npm start
```
Verify backend is running on `http://localhost:3000`

### 2. Start the Expo App
```bash
cd d:\paltuu-new\paltuu-reactnative
npm start
```

### 3. Open in Expo Go or Emulator
- Scan QR code with Expo Go (phone)
- Or press `a` for Android emulator

### 4. Test Google Sign-In Flow

#### Step 1: Navigate to Login Screen
- App should show login screen
- Check console for:
  ```
  ✅ OAUTH_CONFIG loaded with GOOGLE_CLIENT_ID
  ```

#### Step 2: Click "Continue with Google"
- Should open browser with Google login
- Console should show:
  ```
  🔐 [Google Auth] Starting OAuth flow with clientId: 326404521...
  🔐 [Google Auth] Redirect URI: [your-redirect-uri]
  ```

#### Step 3: Complete Google Sign-In
- Sign in with your Google account
- Browser redirects back to app
- Console should show:
  ```
  ✅ [Google Auth] Successfully received ID token
  🔐 [Google Auth] Starting Google Sign-In...
  ✅ Received ID Token from Google
  ✅ Successfully authenticated with Google
  ```

#### Step 4: Verify User is Logged In
- App should redirect to `/(app)` home screen
- User info should be displayed
- Tokens should be stored in secure storage

## 🔍 Debugging

### Check Environment Variables
Verify `.env` file has:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID=your_android_client_id.apps.googleusercontent.com
EXPO_PUBLIC_IOS_GOOGLE_CLIENT_ID=your_ios_client_id.apps.googleusercontent.com
```

### Check Console Logs
Open React Native debugger and look for these logs:

**Expected Success Flow:**
```
🔐 [Google Auth] Starting OAuth flow...
🔐 [Google Auth] Prompting user...
✅ [Google Auth] Successfully received ID token
✅ Google Auth Success: { user: { email: 'user@gmail.com' } }
✅ Successfully authenticated with Google
```

**Common Error Messages:**

1. **"Configuration Error - Google Client ID is not configured"**
   - Fix: Add `EXPO_PUBLIC_GOOGLE_CLIENT_ID` to `.env`

2. **"Invalid Google Token"** (from backend)
   - Fix: Verify `GOOGLE_MOBILE_CLIENT_ID` matches the OAuth client used
   - Check Google Cloud Console credentials are valid

3. **"Google Sign-In cancelled by user"**
   - This is normal when user taps cancel in browser

4. **"No ID token received from Google"**
   - May indicate incorrect OAuth setup
   - Check that `responseType: 'id_token'` is set

### Monitor Backend Logs
```bash
# Check that backend receives the request
GET /api/v1/auth/google
POST /api/v1/auth/google
```

Backend should log:
```
[Auth] Google login received
[Auth] Token verified successfully
[Auth] User created/found
```

## 📱 Files Involved

- **Login Screen**: `app/(auth)/login.tsx`
- **Google Auth Hook**: `src/hooks/useGoogleAuth.ts`
- **Auth Actions**: `src/hooks/useAuth.ts`
- **Auth API**: `src/api/auth.ts`
- **Auth Store**: `src/stores/authStore.ts`
- **OAuth Config**: `src/constants/oauth.ts`
- **Root Layout**: `app/_layout.tsx` (handles redirect)

## 🔐 Security Notes

1. **Never commit `.env` files** with real credentials
2. **ID tokens are short-lived** - currently handled by backend
3. **Refresh tokens are stored** in `expo-secure-store`
4. **Sensitive data** is stored securely, not in AsyncStorage

## 🎯 Next Steps

After successful Google Auth:
1. Set up profile completion (if needed)
2. Add social features
3. Build for production with EAS:
   ```bash
   eas build -p android
   ```

## 📞 Troubleshooting Checklist

- [ ] Backend is running and accessible
- [ ] `GOOGLE_MOBILE_CLIENT_ID` is correct
- [ ] `.env` file has all required variables
- [ ] Network requests can reach backend
- [ ] Browser redirects back to app
- [ ] Tokens are being received
- [ ] User data is being stored

If still having issues, check the console logs for the specific error message and refer to the debugging section above.
