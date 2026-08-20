import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Animated, View, Platform, TouchableOpacity, StyleSheet } from 'react-native';
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

const ICON_PAIRS: Record<string, { select: any; unselect: any; size: number }> = {
  index: { select: Icons.homeSelect, unselect: Icons.homeUnselect, size: 24 },
  pets: { select: Icons.pawSelect, unselect: Icons.pawUnselect, size: 26 },
  search: { select: Icons.searchSelect, unselect: Icons.searchUnselect, size: 24 },
};

// Driven by the pager's live `position` (a native-driven Animated value that
// updates on the UI thread as the finger moves) instead of `state.index`
// (which only updates once React Navigation processes the settled
// `onPageSelected` event on the JS thread). Using `state.index` made the
// highlighted icon visibly lag behind the page content, which the pager
// already renders/transitions natively. Interpolating opacity off `position`
// keeps the highlight in lockstep with the actual swipe.
function AnimatedTabIcon({
  routeName,
  index,
  position,
  focused,
  profileImageUrl,
}: {
  routeName: string;
  index: number;
  position: Animated.AnimatedInterpolation<number>;
  focused: boolean;
  profileImageUrl?: string | null;
}) {
  const interpolatedOpacity = position.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  // Tapping a tab (as opposed to swiping) makes react-native-tab-view jump the
  // pager via `setPageWithoutAnimation` while also manually forcing `position`
  // to the new index. On Android those native `onPageScroll` events can still
  // land afterward and race that manual set, sometimes leaving `position`
  // stuck at a fractional value — the icon renders half-faded forever even
  // though the tab is genuinely focused. `state.index` (passed down as
  // `focused`) is settled instantly and reliably by React Navigation itself,
  // so once it says this tab is focused, trust it over the racy shared value.
  const focusedOpacity = focused ? 1 : interpolatedOpacity;

  if (routeName === 'profile/index') {
    return (
      <View style={{ width: 26, height: 26 }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: '#CCCCCC',
            overflow: 'hidden',
          }}
        >
          <Image
            source={profileImageUrl ? { uri: profileImageUrl } : NO_PROFILE_IMAGE}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 2,
            borderColor: '#a03048',
            opacity: focusedOpacity,
          }}
        />
      </View>
    );
  }

  const pair = ICON_PAIRS[routeName];
  if (!pair) return null;
  return (
    <View style={{ width: pair.size, height: pair.size }}>
      <Image source={pair.unselect} style={{ width: pair.size, height: pair.size }} contentFit="contain" />
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity: focusedOpacity }}>
        <Image source={pair.select} style={{ width: pair.size, height: pair.size }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

function CustomTabBar({ state, navigation, position }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  return (
    <View
      style={[
        styles.bar,
        {
          height: (Platform.OS === 'ios' ? 52 : 56) + insets.bottom,
          // Reserve the FULL bottom inset so the icons clear the device's native
          // navigation bar and stay centered in the visible band above it. The
          // old formula subtracted 10 here, which pulled the icons down into the
          // system-nav zone on Android (cramped, sitting low rather than
          // centered). iOS keeps the tighter home-indicator spacing it had.
          paddingBottom:
            Platform.OS === 'android'
              ? insets.bottom > 0
                ? insets.bottom
                : 8
              : insets.bottom > 0
                ? Math.max(insets.bottom - 10, 5)
                : 8,
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
            <AnimatedTabIcon
              routeName={route.name}
              index={index}
              position={position}
              focused={focused}
              profileImageUrl={user?.profile_image_url}
            />
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
        // icon taps look like a swipe. On Android this also avoids ViewPager2
        // animating through intermediate pages on a multi-tab jump (e.g.
        // Profile→Home, index 3→0), which flashed Pets/Search; iOS's pager
        // doesn't render those intermediate pages so it never flashed there.
        // This only disables the programmatic transition — swipe gestures are
        // native/gesture-driven, so swiping still shows the incoming page.
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
