import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
// Side-effect import: patches expo-router's push/navigate to drop duplicate
// calls fired within 800ms (rapid double-taps on icons/list rows). Must run
// once at app start, before any screen navigates. See navigationGuard.ts.
import '../src/utils/navigationGuard';
import '../src/styles/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';
import { NotificationProvider } from '../src/context/NotificationContext';
import { DispatcherCallProvider } from '../src/context/DispatcherCallProvider';
import { isExpressVetAlertOpenEvent } from '../src/services/androidDispatchAlert';
import { useIncomingCallStore } from '../src/stores/incomingCallStore';
import { SocialActionsProvider } from '../src/context/SocialActionsContext';
import { PostCardModalsProvider } from '../src/context/PostCardModalsContext';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { toastConfig } from '../src/components/common/toastConfig';
import { storage } from '../src/utils/storage';

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
  // Android cold start via the dispatcher ringing alert: checked once, ahead of the normal
  // redirect decision below, so the app can land directly on the call screen instead of
  // landing on the dispatch console first and then hopping to the call screen a beat later
  // (that hop is what read as a flash of the wrong screen — DispatcherCallProvider's own
  // check for this ran as an afterthought, well after this effect had already redirected
  // somewhere else). `route` stays null until this resolves one way or the other, and the
  // redirect effect below waits on it rather than proceeding without an answer.
  const pendingDispatchAlert = useRef<{ checked: boolean; checking: boolean; route: string | null }>({
    checked: Platform.OS !== 'android',
    checking: false,
    route: null,
  });
  const [dispatchAlertCheckTick, setDispatchAlertCheckTick] = useState(0);

  // 1. Initial Hydration
  useEffect(() => {
    hydrate();
  }, []);

  // 1a. Android nav-bar button color. Under edge-to-edge (edgeToEdgeEnabled),
  // Expo's enableEdgeToEdge() defaults the nav bar to LIGHT (white) icons and
  // overrides the theme's windowLightNavigationBar, so on our white screens the
  // 3-button icons vanish and the system pairs them with a dark contrast scrim
  // (the grey strip). setButtonStyleAsync is the one setter that still works in
  // edge-to-edge; 'dark' = dark icons for our light UI. The app is light-only
  // (userInterfaceStyle: "light"), so this holds app-wide.
  //
  // Loaded lazily inside try/catch on purpose: expo-navigation-bar is a NATIVE
  // module that isn't in older binaries this JS may be OTA-updated onto, where
  // `requireNativeModule('ExpoNavigationBar')` throws at import. The guard makes
  // it a no-op there (nav bar just stays as-is) and it activates once a build
  // that bundles the native module ships.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      const NavigationBar = require('expo-navigation-bar');
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
    } catch {}
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

    // Dispatchers aren't normal users of the consumer app — they get the Dispatcher
    // Console and nothing else (no tabs, no social feed, no Pets/adopt/marketplace).
    // Same login/session system underneath, just a completely different landing area.
    // Read off `user` (the reactive selector, in this effect's deps) rather than
    // getState(): role arrives asynchronously via fetchProfile() on sessions restored
    // from storage, and getState() alone left the effect with no reason to re-run when
    // it landed — a dispatcher could sit in the consumer app until some unrelated
    // segment change happened to re-trigger this.
    const isDispatcher = user?.role === 'dispatcher';
    const inAppGroup = segments[0] === '(app)';
    // Anchor on the group as well as the child segment: `segments[1]` is meaningless
    // outside (app), and matching it alone would treat any root route whose second
    // segment happened to be this string as "already on the console".
    const onDispatchConsole = inAppGroup && (segments as string[])[1] === 'express-vet-dispatch';

    // Check once, ahead of any redirect below, whether this launch was the OS auto-opening
    // the app for the full-screen ringing alert (killed-app cold start) — see the ref's
    // declaration above for why this has to happen before the redirect decision, not after.
    // `checking` (distinct from `checked`) guards against a second copy of this async check
    // firing if some unrelated dependency (e.g. segments) re-runs this effect while the
    // first one is still in flight.
    if (Platform.OS === 'android' && isAuthenticated && isDispatcher && !pendingDispatchAlert.current.checked) {
      if (!pendingDispatchAlert.current.checking) {
        pendingDispatchAlert.current.checking = true;
        (async () => {
          try {
            const notifee = require('@notifee/react-native').default;
            const initial = await notifee.getInitialNotification();
            if (initial && isExpressVetAlertOpenEvent({ detail: initial })) {
              const alertId = initial.notification?.id;
              const raw = initial.notification?.data?.payload;
              if (alertId && typeof raw === 'string') {
                useIncomingCallStore.getState().register(alertId, JSON.parse(raw));
                pendingDispatchAlert.current.route = `/(app)/express-vet-dispatch/incoming-alert?alertId=${alertId}`;
              }
            }
          } catch {
            // Nothing to recover — proceed with the normal landing below.
          }
          pendingDispatchAlert.current.checked = true;
          setDispatchAlertCheckTick((t) => t + 1); // re-run this effect now the check is resolved
        })();
      }
      return; // nothing to decide until the check above resolves
    }

    if (!isAuthenticated && !inAuthGroup && !onPostAuthFlowScreen && !onOnboardingSlides) {
      // TEMP: onboarding slides are disabled — send everyone straight to welcome.
      // Re-enable by restoring: router.replace(!hasSeenOnboarding ? '/onboarding' : '/(auth)/welcome');
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      const { isNewUser: newUser, needsUsername } = useAuthStore.getState();
      if (!newUser) {
        router.replace(
          (pendingDispatchAlert.current.route ?? (isDispatcher ? '/(app)/express-vet-dispatch' : '/(app)')) as any
        );
      } else {
        router.replace(needsUsername ? '/oauth-username' : '/interests');
      }
    } else if (
      isAuthenticated &&
      isDispatcher &&
      !onDispatchConsole &&
      !onPostAuthFlowScreen &&
      !onOnboardingSlides
    ) {
      // Catches deep links, notification taps, or manual navigation into any other
      // part of the consumer app (e.g. a social post link) and bounces back.
      // Deliberately NOT limited to the (app) group: post/[id], thread/[id], media/[id],
      // notifications, follow-requests and create-post are all root-level siblings of
      // (app), so gating on `inAppGroup` let a notification tap or a shared post link
      // drop a dispatcher straight into the consumer app. `(auth)` is already handled by
      // the branch above, and the two post-auth flow screens stay exempt so a brand-new
      // dispatcher account can still finish onboarding before being pinned to the console.
      router.replace((pendingDispatchAlert.current.route ?? '/(app)/express-vet-dispatch') as any);
    }
  }, [
    isAuthenticated,
    dispatchAlertCheckTick,
    isLoading,
    segments,
    fontsLoaded,
    navigationState?.key,
    hasSeenOnboarding,
    user?.role,
  ]);

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

  // 4. Hide Splash Screen — wait for fonts AND auth hydration so protected
  // screens don't fire authenticated API calls before tokens are in memory.
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isLoading]);

  // 5. OTA landing confirmation — Updates.updateId is only set once an OTA
  // bundle is actually running (null on the embedded/dev bundle). Comparing
  // against the last-seen id and toasting on change gives a visible signal,
  // on both platforms, that a published update really reached this device —
  // without having to dig through Profile > About.
  useEffect(() => {
    const currentUpdateId = Updates.updateId;
    if (!currentUpdateId) return;
    (async () => {
      const lastSeen = await storage.getLastSeenOtaUpdateId();
      if (lastSeen === currentUpdateId) return;
      await storage.setLastSeenOtaUpdateId(currentUpdateId);
      if (lastSeen) {
        Toast.show({
          type: 'success',
          text1: 'App updated',
          text2: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} · ${currentUpdateId.slice(0, 8)}`,
        });
      }
    })();
  }, []);

  const appReady = (fontsLoaded || !!fontError) && !isLoading;

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
        <DispatcherCallProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <BottomSheetModalProvider>
            <SocialActionsProvider>
            <PostCardModalsProvider>
              <Stack screenOptions={{ headerShown: false }}>
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
                {/* Tapped-media detail (X/Twitter-style): same slide-in as the
                    post detail — the swipe-down-to-dismiss gesture inside it
                    is an additional way out, not a replacement for this one */}
                <Stack.Screen
                  name="media/[id]"
                  options={{ animation: 'slide_from_right', gestureEnabled: true }}
                />
                {/* Notifications: slides in from the right, covers the tab bar */}
                <Stack.Screen
                  name="notifications"
                  options={{ animation: 'slide_from_right', gestureEnabled: true }}
                />
                {/* Follow requests: same slide-in as Notifications, one level deeper */}
                <Stack.Screen
                  name="follow-requests"
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
                {/* Quote-post composer: same full-screen slide-up as the
                    comment composer, editable full screen (not a bottom sheet) */}
                <Stack.Screen
                  name="quote/[id]"
                  options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </PostCardModalsProvider>
            </SocialActionsProvider>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </DispatcherCallProvider>
        </NotificationProvider>
        {/* Toast must be inside QueryClientProvider in case it (or its
            children) calls useQuery internally. OfflineBanner lives inside
            SafeAreaProvider above so it can read real safe-area insets. */}
        <Toast config={toastConfig} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
