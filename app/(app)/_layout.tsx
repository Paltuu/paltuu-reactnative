import { Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, useHeaderContext } from '../../src/context/HeaderContext';
import { MainHeader } from '../../src/components/common/MainHeader';
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

  // Home renders its own <MainHeader/> *inside* the tab pager (see (tabs)/index.tsx)
  // so the header swipes along with the page. Only non-pager screens that rely on
  // the layout-level header (e.g. bazaar) render it here.
  const showHeader = pathname?.includes('bazaar');
  const isGreyScreen =
    pathname === '/pet-care' || pathname === '/adopt' || pathname?.includes('/clinic') || pathname?.includes('/vet');

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
      {showHeader && <MainHeader />}
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
