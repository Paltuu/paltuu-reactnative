import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { useAuthStore } from '../src/stores/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient';
import '../src/styles/global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
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

  // 3. Hide Splash Screen
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {!fontsLoaded && !fontError ? null : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        )}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
