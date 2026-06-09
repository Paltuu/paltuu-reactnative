import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, Text } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderProvider, useHeaderContext } from '../../src/context/HeaderContext';
import { MainHeader } from '../../src/components/common/MainHeader';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/stores/authStore';

function LayoutContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setOnPlusPress, setOnHeartPress } = useHeaderContext();
  const user = useAuthStore((state) => state.user);

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
          name="pets"
          options={{
            title: 'Pets',
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -16,
                  borderWidth: 3.5,
                  borderColor: '#FFFFFF',
                  backgroundColor: '#a03048',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 4,
                }}
              >
                <Image
                  source={require('../../assets/primary_icon.svg')}
                  style={{ width: 26, height: 26 }}
                  contentFit="contain"
                  tintColor="#FFFFFF"
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
            tabBarIcon: ({ color, focused }) => {
              if (user?.profile_image_url) {
                return (
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
                      source={{ uri: user.profile_image_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                );
              }
              
              // Google-style initials placeholder
              const getInitials = () => {
                if (user?.name) {
                  const parts = user.name.trim().split(/\s+/);
                  if (parts.length > 1) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  return parts[0].slice(0, 2).toUpperCase();
                }
                if (user?.email) {
                  return user.email.slice(0, 2).toUpperCase();
                }
                return 'U';
              };
              
              return (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: focused ? 2 : 1,
                    borderColor: focused ? '#a03048' : '#CCCCCC',
                    backgroundColor: '#FAF0F2',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#a03048',
                      fontSize: 10,
                      fontWeight: 'bold',
                      letterSpacing: -0.2,
                    }}
                  >
                    {getInitials()}
                  </Text>
                </View>
              );
            },
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