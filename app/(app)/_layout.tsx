import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { HeaderProvider, useHeaderContext } from '../../src/context/HeaderContext'; 
import { MainHeader } from '../../src/components/common/MainHeader';   
import { useEffect } from 'react';

function LayoutContent() {
  const router = useRouter();
  const { setOnPlusPress } = useHeaderContext();

  useEffect(() => {
    setOnPlusPress(() => {
      router.push('/(app)/create');
    });
  }, [router, setOnPlusPress]);

  let pathname = '';
  try {
    pathname = usePathname();
  } catch (e) {}

  const showHeader = pathname === '/' || pathname === '/index' || pathname === '' || pathname === '/(app)' || pathname?.includes('bazaar');

  return (
    <>
      {showHeader && <MainHeader />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#a03048',
          tabBarInactiveTintColor: '#999999',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 70 : 60,
            paddingBottom: Platform.OS === 'ios' ? 20 : 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            elevation: 0,
            shadowOpacity: 0,
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
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            ),
          }}
        />

        {/* Hidden Screens */}
        <Tabs.Screen name="adopt" options={{ href: null }} />
        <Tabs.Screen name="pet-care" options={{ href: null }} />
        <Tabs.Screen name="lost-found" options={{ href: null }} />
        <Tabs.Screen name="clinic/[id]" options={{ href: null }} />
        <Tabs.Screen name="vet/[id]" options={{ href: null }} />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="create-pet" options={{ href: null }} />
        <Tabs.Screen name="create-lost-found" options={{ href: null }} />
        <Tabs.Screen name="my-listings" options={{ href: null }} />
        <Tabs.Screen name="my-applications" options={{ href: null }} />
        <Tabs.Screen name="adoption-requests" options={{ href: null }} />
        <Tabs.Screen name="marketplace" options={{ href: null }} />
      </Tabs>
    </>
  );
}

export default function AppLayout() {
  return (
    <HeaderProvider>
      <LayoutContent />
    </HeaderProvider>
  );
}