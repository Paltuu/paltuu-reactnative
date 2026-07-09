import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../../src/constants/images';

const Icons = {
  homeSelect: require('../../../assets/icons/home-select.svg'),
  homeUnselect: require('../../../assets/icons/home-unselect.svg'),
  searchSelect: require('../../../assets/icons/search-select.svg'),
  searchUnselect: require('../../../assets/icons/search-unselect.svg'),
  pawSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  return (
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
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? Icons.pawSelect : Icons.pawUnselect}
              style={{ width: 26, height: 26 }}
              contentFit="contain"
            />
          ),
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
    </Tabs>
  );
}
