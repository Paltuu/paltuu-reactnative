import { Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, useHeaderContext } from '../../src/context/HeaderContext';
import { useEffect } from 'react';

function LayoutContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnPlusPress, setOnHeartPress } = useHeaderContext();

  useEffect(() => {
    setOnPlusPress(() => {
      router.push('/create-post');
    });
    setOnHeartPress(() => {
      router.push('/notifications');
    });
  }, [router, setOnPlusPress, setOnHeartPress]);

  let pathname = '';
  try {
    pathname = usePathname();
  } catch (e) { }

  // Home, Search, and Bazaar each render their own <MainHeader>/<SearchHeader>
  // (see (tabs)/index.tsx, (tabs)/search.tsx, bazaar.tsx) bound to a private
  // `useHeaderScroll()` instance, so no header is rendered at the layout level.
  // Screens whose own root background is #FAFAFB rather than white — the notch strip below
  // has to match them or a hard white band shows above the header.
  // `startsWith('/express-vet')` deliberately, not `includes('/vet')`: the latter never
  // matched any Vets at Home route (they read `-vet`, not `/vet`), which is exactly why
  // every screen in that flow rendered a white notch over its grey page. This one prefix
  // covers the client flow and the dispatcher console, which share that background.
  const isGreyScreen =
    pathname === '/pet-care' ||
    pathname === '/adopt' ||
    pathname?.includes('/clinic') ||
    pathname?.includes('/vet') ||
    pathname?.startsWith('/express-vet');

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* ── Global Notch Stopper ── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: isGreyScreen ? '#FAFAFB' : '#FFF',
          zIndex: 9999,
        }}
      />
      {/*
        Only "(tabs)" (the real bottom-tab screens: index/pets/search/profile)
        lives in the Tabs navigator. Every other screen here is a Stack sibling
        pushed on top of it, so back navigation follows a real LIFO history
        instead of the bottom-tabs navigator's route-name-keyed history (which
        collapses repeat visits to the same route, e.g. profile -> profile,
        and falls back to the first-ever tab once exhausted).
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* Detail screens reached by tapping into a list/card (lost & found
            post, trending keyword/hashtag/topic). Without an explicit
            animation these fell back to the platform's unset default, which
            — unlike the root stack's `post/[id]`, `notifications`, etc. —
            inconsistently slid in/out from the left instead of the right.
            Pin them to the same slide-from-right convention as every other
            detail push in the app. */}
        <Stack.Screen
          name="lost-found/[id]"
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
        <Stack.Screen
          name="hashtag/[tag]"
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
        <Stack.Screen
          name="keyword/[word]"
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
        <Stack.Screen
          name="topic/[slug]"
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
        <Stack.Screen
          name="profile-menu"
          options={{ animation: 'slide_from_right', gestureEnabled: true }}
        />
      </Stack>
    </View>
  );
}

export default function AppLayout() {
  return (
    <HeaderProvider>
      <LayoutContent />
    </HeaderProvider>
  );
}
