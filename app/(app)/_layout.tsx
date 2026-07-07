import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, useHeaderContext } from '../../src/context/HeaderContext';
import { MainHeader } from '../../src/components/common/MainHeader';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../src/constants/images';

const ACTIVE_COLOR = '#a03048';
const INACTIVE_COLOR = '#999999';

const Icons = {
  homeSelect: require('../../assets/icons/home-select.svg'),
  homeUnselect: require('../../assets/icons/home-unselect.svg'),
  searchSelect: require('../../assets/icons/search-select.svg'),
  searchUnselect: require('../../assets/icons/search-unselect.svg'),
  pawSelect: require('../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../assets/icons/paw-like-unselect.svg'),
};

function LayoutContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnPlusPress, setOnHeartPress } = useHeaderContext();
  const user = useAuthStore((state) => state.user);

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

  const showHeader = pathname === '/' || pathname === '/index' || pathname === '' || pathname === '/(app)' || pathname?.includes('bazaar');
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
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? Icons.homeSelect : Icons.homeUnselect}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="pets"
          options={{
            title: 'Pets',
            tabBarIcon: ({ focused }) => {
              const isPawActive = focused || 
                pathname === '/pets' || 
                pathname === '/adopt' || 
                pathname === '/pet-care' || 
                pathname === '/create-pet' || 
                pathname === '/lost-found' ||
                pathname?.includes('/clinic') ||
                pathname?.includes('/vet');
              return (
                <Image
                  source={isPawActive ? Icons.pawSelect : Icons.pawUnselect}
                  style={{ width: 26, height: 26 }}
                  contentFit="contain"
                />
              );
            },
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? Icons.searchSelect : Icons.searchUnselect}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: focused ? 2 : 1,
                  borderColor: focused ? '#a03048' : '#CCCCCC',
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={user?.profile_image_url ? { uri: user.profile_image_url } : NO_PROFILE_IMAGE}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
            ),
          }}
        />

        {/* Hidden Screens */}
        <Tabs.Screen name="bazaar" options={{ href: null }} />
        <Tabs.Screen name="pet-profile/[id]" options={{ href: null }} />
        <Tabs.Screen name="pet-profile/create" options={{ href: null }} />
        <Tabs.Screen name="pet-profile/gallery-manager" options={{ href: null }} />
        <Tabs.Screen name="profile/[id]" options={{ href: null }} />
        <Tabs.Screen name="profile/saved/index" options={{ href: null }} />
        <Tabs.Screen name="profile/saved/[collection_id]/index" options={{ href: null }} />
        <Tabs.Screen name="profile/settings" options={{ href: null }} />
        <Tabs.Screen name="profile/edit" options={{ href: null }} />
        <Tabs.Screen name="profile/personal-info" options={{ href: null }} />
        <Tabs.Screen name="profile/help" options={{ href: null }} />
        <Tabs.Screen name="profile/about" options={{ href: null }} />
        <Tabs.Screen name="profile/privacy" options={{ href: null }} />
        <Tabs.Screen name="profile/blocked" options={{ href: null }} />
        <Tabs.Screen name="adopt" options={{ href: null }} />
        <Tabs.Screen name="pet-care" options={{ href: null }} />
        <Tabs.Screen name="lost-found" options={{ href: null }} />
        <Tabs.Screen name="clinic/[id]" options={{ href: null }} />
        <Tabs.Screen name="vet/[id]" options={{ href: null }} />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="create-pet" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="create-lost-found" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="my-listings" options={{ href: null }} />
        <Tabs.Screen name="my-applications" options={{ href: null }} />
        <Tabs.Screen name="adoption-requests" options={{ href: null }} />
        <Tabs.Screen name="marketplace" options={{ href: null }} />
        <Tabs.Screen name="apply-adopt" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="pet-details" options={{ href: null }} />
        <Tabs.Screen name="follow-list" options={{ href: null }} />
        <Tabs.Screen name="hashtag/[tag]" options={{ href: null }} />
        <Tabs.Screen name="topic/[slug]" options={{ href: null }} />
        <Tabs.Screen name="media-grid" options={{ href: null }} />
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