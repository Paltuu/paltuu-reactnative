import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { OfflineBanner } from '../src/components/common/OfflineBanner';

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
  });

  const { isAuthenticated, isLoading, hydrate, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 1. Initial Hydration
  useEffect(() => {
    hydrate();
  }, []);

  // 2. Navigation Protection Logic
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and trying to access auth screens
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading, segments, fontsLoaded]);

  // 3. Notification query invalidation + deep link handler
  // Token registration & listener setup is handled by <NotificationProvider>.
  // Here we only hook into foreground/response events for app-specific side effects.
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;

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
  }, [isAuthenticated, isLoading, user]);

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
            <BottomSheetModalProvider>
              {!fontsLoaded && !fontError ? null : (
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
              )}
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </NotificationProvider>
      </QueryClientProvider>
      <Toast />
      <OfflineBanner />
    </GestureHandlerRootView>
  );
}
