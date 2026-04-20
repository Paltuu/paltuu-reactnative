import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#a03048', // primary color
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "paw" : "paw-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bazaar"
        options={{
          title: 'Bazaar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pet-care"
        options={{
          title: 'Care',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lost-found"
        options={{
          title: 'Lost',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "megaphone" : "megaphone-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
