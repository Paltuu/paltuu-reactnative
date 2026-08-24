import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// This route exists only because the OAuth redirect URI needs *some* app path
// to land on. The actual sign-in promise (in welcome.tsx's handleGoogleSignIn)
// is resolved separately by expo-web-browser's own internal Linking listener,
// not by this screen. But expo-router treats any incoming deep link matching
// a registered route as real navigation, so on Android — where the redirect
// is a generic `paltuu://oauth2redirect` deep link — landing here yanks the
// user off whatever screen was awaiting the sign-in result (e.g. Welcome)
// right as that promise is resolving, racing against it. iOS never hits this:
// ASWebAuthenticationSession resolves via a native completion callback that
// doesn't go through Linking at all, so expo-router never sees a URL to
// navigate on. Bounce straight back so the screen that's actually awaiting
// the result is the one still on screen when it resolves.
export default function OAuth2Redirect() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web' && router.canGoBack()) {
      router.back();
    }
  }, [router]);

  return null;
}
