import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useAuthStore } from '../src/stores/authStore';
import { useLocationStore } from '../src/stores/locationStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient';
import { handleDeepLink } from '../src/services/deepLinks';
import '../src/styles/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { NotificationProvider } from '../src/context/NotificationContext';
import { SocialActionsProvider } from '../src/context/SocialActionsContext';
import { PostCardModalsProvider } from '../src/context/PostCardModalsContext';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { toastConfig } from '../src/components/common/toastConfig';

// ─── Module-level: Notification Handler & Background Task ────────────────────
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

try {
  // Must be set before any notification arrives (outside component)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
    console.log(
      '[Paltuu Notifications] 🌙 Background notification received:',
      JSON.stringify({ data, error, executionInfo }, null, 2)
    );
    return Promise.resolve();
  });

  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err) => {
    if (__DEV__) console.log('[Paltuu Notifications] Background task registration:', err.message);
  });
} catch (e: any) {
  if (__DEV__) {
    console.log('[Paltuu Notifications] ⚠️ Native notification setup skipped (normal in Expo Go):', e.message);
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Pixeled: require('../assets/pixel/Pixeled.ttf'),
    CheeseMilky: require('../assets/fonts/Cheese-Milky.otf'),
  });

  const { isAuthenticated, isLoading, hydrate, user, isNewUser, hasSeenOnboarding } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const initialNotifHandled = useRef(false);

  // 1. Initial Hydration
  useEffect(() => {
    hydrate();
  }, []);

  // 1b. Ask for location permission up front, then resolve nearest city
  // (pets/listings are stored by city, not raw coordinates).
  useEffect(() => {
    useLocationStore.getState().resolveCity();
  }, []);

  // 2. Navigation Protection Logic
  useEffect(() => {
    // Wait for the root navigator to actually mount — dispatching before it's
    // ready throws "Attempted to navigate before mounting the Root Layout".
    if (!navigationState?.key) return;
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    // These live outside (auth) on purpose — they run mid-flow after tokens
    // are already issued (post-OTP personalization, post-OAuth username), so
    // they must be exempt from both the "logged out" and "logged in" redirects.
    const onPostAuthFlowScreen = segments[0] === 'interests' || segments[0] === 'oauth-username';
    const onOnboardingSlides = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup && !onPostAuthFlowScreen && !onOnboardingSlides) {
      // TEMP: onboarding slides are disabled — send everyone straight to welcome.
      // Re-enable by restoring: router.replace(!hasSeenOnboarding ? '/onboarding' : '/(auth)/welcome');
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      const { isNewUser: newUser, needsUsername } = useAuthStore.getState();
      router.replace(!newUser ? '/(app)' : needsUsername ? '/oauth-username' : '/interests');
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded, navigationState?.key, hasSeenOnboarding]);

  // 3. Notification query invalidation + deep link handler
  // Token registration & listener setup is handled by <NotificationProvider>.
  // Here we only hook into foreground/response events for app-specific side effects.
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;
    if (!navigationState?.key) return;

    // Cold-start / killed-state: app was opened by tapping a notification.
    // The response fires before the listener below is registered, so we read it
    // once via getLastNotificationResponseAsync and guard with a ref so it only
    // runs on the first time auth is ready (not on every re-render).
    if (!initialNotifHandled.current) {
      initialNotifHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          if (__DEV__) console.log('[Paltuu] Cold-start notification tap detected');
          const data = response.notification.request.content.data;
          if (data?.deep_link) {
            handleDeepLink(data.deep_link as string);
          }
        }
      });
    }

    const foregroundSub = Notifications.addNotificationReceivedListener(() => {
      if (__DEV__) console.log('[Paltuu] Foreground notification → invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (__DEV__) console.log('[Paltuu] Notification tapped → checking deep link');
      const data = response.notification.request.content.data;
      if (data?.deep_link) {
        handleDeepLink(data.deep_link as string);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated, isLoading, user, navigationState?.key]);

  // 4. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <BottomSheetModalProvider>
            <SocialActionsProvider>
            <PostCardModalsProvider>
              <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
                <Stack.Screen name="interests" options={{ headerShown: false }} />
                <Stack.Screen name="oauth-username" options={{ headerShown: false }} />
                <Stack.Screen name="oauth2redirect" options={{ headerShown: false }} />
                {/* Post detail: slides in from the right, covers the tab bar */}
                <Stack.Screen
                  name="post/[id]"
                  options={{ animation: 'slide_from_right', gestureEnabled: true }}
                />
                {/* Re-rooted comment thread: same slide-in as the post detail */}
                <Stack.Screen
                  name="thread/[id]"
                  options={{ animation: 'slide_from_right', gestureEnabled: true }}
                />
                {/* Notifications: slides in from the right, covers the tab bar */}
                <Stack.Screen
                  name="notifications"
                  options={{ animation: 'slide_from_right', gestureEnabled: true }}
                />
                {/* Create post: slides in from the left; a right-to-left swipe
                    anywhere on the page slides it back out to Home (mirrors the
                    left-to-right swipe that opens it). fullScreenGestureEnabled
                    lifts the dismiss gesture off the screen edge to the whole
                    surface; animationMatchesGesture points it right-to-left. */}
                <Stack.Screen
                  name="create-post"
                  options={{
                    animation: 'slide_from_left',
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    animationMatchesGesture: true,
                  }}
                />
                {/* Comment composer: slides up from the bottom, full screen so the
                    keyboard-avoiding view can measure the whole window reliably */}
                <Stack.Screen
                  name="comment/[id]"
                  options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </PostCardModalsProvider>
            </SocialActionsProvider>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </NotificationProvider>
        {/* Toast must be inside QueryClientProvider in case it (or its
            children) calls useQuery internally. OfflineBanner lives inside
            SafeAreaProvider above so it can read real safe-area insets. */}
        <Toast config={toastConfig} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
