import { useEffect, useRef } from 'react';
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
import { registerForPushNotifications } from '../src/services/notifications';
import { handleDeepLink } from '../src/services/deepLinks';
import '../src/styles/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

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

  // 3. Notifications Registration & Listeners
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;

    // Register token
    registerForPushNotifications();

    try {
      const Notifications = require('expo-notifications');
      
      // App is foregrounded — notification arrives
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        if (__DEV__) console.log('[Expo Notifications] Foreground message received');
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      // User taps the notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        if (__DEV__) console.log('[Expo Notifications] Notification tapped');
        const data = response.notification.request.content.data;
        if (data?.deep_link) {
          handleDeepLink(data.deep_link as string);
        }
      });
    } catch (e) {
      if (__DEV__) console.log('Expo notifications not supported in this simulator build.');
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
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
      </QueryClientProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
