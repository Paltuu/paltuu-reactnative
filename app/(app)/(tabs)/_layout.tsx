import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { View, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../../src/constants/images';
import { emitTabPress } from '../../../src/utils/tabPressSubscription';

// Swipeable tab navigator: home <-> pets <-> search <-> profile.
// Built on react-native-tab-view / react-native-pager-view, so during a swipe
// the incoming page is visible and moves in alongside the outgoing one.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

const Icons = {
  homeSelect: require('../../../assets/icons/home-select.svg'),
  homeUnselect: require('../../../assets/icons/home-unselect.svg'),
  searchSelect: require('../../../assets/icons/search-select.svg'),
  searchUnselect: require('../../../assets/icons/search-unselect.svg'),
  pawSelect: require('../../../assets/icons/paw-like-select.svg'),
  pawUnselect: require('../../../assets/icons/paw-like-unselect.svg'),
};

// Map each route to the scroll-to-top channel key used by the screens.
const TAB_PRESS_KEY: Record<string, string> = {
  index: 'home',
  pets: 'pets',
  search: 'search',
  'profile/index': 'profile',
};

function renderIcon(routeName: string, focused: boolean, profileImageUrl?: string | null) {
  switch (routeName) {
    case 'index':
      return (
        <Image
          source={focused ? Icons.homeSelect : Icons.homeUnselect}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
        />
      );
    case 'pets':
      return (
        <Image
          source={focused ? Icons.pawSelect : Icons.pawUnselect}
          style={{ width: 26, height: 26 }}
          contentFit="contain"
        />
      );
    case 'search':
      return (
        <Image
          source={focused ? Icons.searchSelect : Icons.searchUnselect}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
        />
      );
    case 'profile/index':
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
            source={profileImageUrl ? { uri: profileImageUrl } : NO_PROFILE_IMAGE}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
      );
    default:
      return null;
  }
}

function CustomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  return (
    <View
      style={[
        styles.bar,
        {
          height: (Platform.OS === 'ios' ? 52 : 56) + insets.bottom,
          paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 10, 5) : 8,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (focused) {
            // Instagram-style: re-tapping the active tab scrolls its list to top.
            emitTabPress(TAB_PRESS_KEY[route.name] as any);
            return;
          }
          if (!event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.7}
          >
            {renderIcon(route.name, focused, user?.profile_image_url)}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        // Only animate the slide transition for an actual finger swipe (a
        // continuously-dragged gesture, unaffected by this flag) — tapping a
        // bottom tab bar icon calls navigation.navigate under the hood, which
        // would otherwise still play the same pager slide animation, making
        // icon taps look like a swipe. Disabling it here only removes that
        // programmatic-jump animation.
        animationEnabled: false,
        // Lazy-load tabs (like the old bottom-tabs setup) but preload the
        // immediate neighbour so it's already rendered and visible as you swipe.
        lazy: true,
        lazyPreloadDistance: 1,
      }}
    >
      <MaterialTopTabs.Screen name="index" />
      <MaterialTopTabs.Screen name="pets" />
      <MaterialTopTabs.Screen name="search" />
      <MaterialTopTabs.Screen name="profile/index" />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
