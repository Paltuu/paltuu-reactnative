import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { Image } from 'expo-image';
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
      router.push('/(app)/create-post');
    });
    setOnHeartPress(() => {
      router.push('/(app)/notifications');
    });
  }, [router, setOnPlusPress, setOnHeartPress]);

  let pathname = '';
  try {
    pathname = usePathname();
  } catch (e) { }

  const showHeader = pathname === '/' || pathname === '/index' || pathname === '' || pathname === '/(app)' || pathname?.includes('bazaar');

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
          backgroundColor: '#FFF',
          zIndex: 9999,
        }}
      />
      {showHeader && <MainHeader />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#a03048',
          tabBarInactiveTintColor: '#999999',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 52 + insets.bottom : 56 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 10, 5) : 8,
            paddingTop: 8,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bazaar"
          options={{
            title: 'Bazaar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pets"
          options={{
            title: 'Pets',
            tabBarIcon: ({ focused }) => (
              <View
                className={`w-14 h-14 rounded-full items-center justify-center -mt-8 border-4 border-white ${focused ? 'bg-primary' : 'bg-primarySoft'
                  }`}
              >
                <Image
                  source={require('../../assets/primary_icon.svg')}
                  style={{ width: 32, height: 32, tintColor: 'white' }}
                  contentFit="contain"
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            ),
          }}
        />

        {/* Hidden Screens */}
        <Tabs.Screen name="profile/[id]" options={{ href: null }} />
        <Tabs.Screen name="profile/saved/index" options={{ href: null }} />
        <Tabs.Screen name="profile/saved/[collection_id]/index" options={{ href: null }} />
        <Tabs.Screen name="adopt" options={{ href: null }} />
        <Tabs.Screen name="pet-care" options={{ href: null }} />
        <Tabs.Screen name="lost-found" options={{ href: null }} />
        <Tabs.Screen name="clinic/[id]" options={{ href: null }} />
        <Tabs.Screen name="vet/[id]" options={{ href: null }} />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="create-pet" options={{ href: null }} />
        <Tabs.Screen name="create-post" options={{ href: null }} />
        <Tabs.Screen name="create-lost-found" options={{ href: null }} />
        <Tabs.Screen name="my-listings" options={{ href: null }} />
        <Tabs.Screen name="my-applications" options={{ href: null }} />
        <Tabs.Screen name="adoption-requests" options={{ href: null }} />
        <Tabs.Screen name="marketplace" options={{ href: null }} />
        <Tabs.Screen name="apply-adopt" options={{ href: null }} />
        <Tabs.Screen name="pet-details" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null }} />
        <Tabs.Screen name="follow-list" options={{ href: null }} />
      </Tabs>
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