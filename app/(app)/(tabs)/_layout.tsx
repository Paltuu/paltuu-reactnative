import { useEffect, useRef } from 'react';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { Animated, View, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/stores/authStore';
import { NO_PROFILE_IMAGE } from '../../../src/constants/images';
import { emitTabPress } from '../../../src/utils/tabPressSubscription';
import { useTabBarHidden } from '../../../src/stores/tabBarStore';
import { useActiveExpressVetRequest } from '../../../src/hooks/useActiveExpressVetRequest';
import { ActiveBookingBar } from '../../../src/components/expressVet/ActiveBookingBar';

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

// Two earlier approaches to this both leaned on the pager's shared, native-
// driven `position` value (interpolating opacity off it directly, then later
// layering a deterministic overlay on top only when focused) to keep the
// highlight in lockstep with an actual finger-driven swipe. Both left a real
// gap: `position` is driven by continuous native onPageScroll events during a
// genuine swipe, and that interpolation doesn't reliably land on exactly 0/1
// when the drag ends — so the tab you swiped AWAY FROM could get stuck
// showing a partially-opaque "select" icon forever, with nothing to correct
// it (a deterministic overlay only for the FOCUSED case fixes the tab you
// land on, not the one you left). Tapping never showed this because a tap
// sets `position` via one explicit synchronous value, not continuous native
// scroll events.
//
// Driving this off a locally-owned Animated.Value instead, explicitly
// animated via Animated.timing whenever `focused` changes, sidesteps the
// whole class of bug: it's never subject to the pager's native scroll
// events, so it can't get left in a stuck intermediate state — every
// animation we start always runs to its exact target. The tradeoff is the
// icon highlight snaps on settle (onPageSelected) rather than crossfading
// continuously with mid-swipe finger position, which is a small, common,
// and much safer compromise than an icon that can render broken.
function AnimatedTabIcon({
  routeName,
  focused,
  profileImageUrl,
}: {
  routeName: string;
  focused: boolean;
  profileImageUrl?: string | null;
}) {
  const opacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: focused ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [focused, opacity]);

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
            opacity,
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
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, opacity }}>
        <Image source={pair.select} style={{ width: pair.size, height: pair.size }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

function CustomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  // Some in-tree full-screen overlays (e.g. the profile photo viewer) ask for the
  // tab bar to be gone while they're open — see src/stores/tabBarStore.ts.
  const tabBarHidden = useTabBarHidden();
  // Only ever queried for Karachi accounts with the feature available — cheap no-op
  // elsewhere since react-query just returns undefined without ever firing the request
  // (see the hook's `enabled` gate wired through isKarachiExpressVet-equivalent logic
  // isn't available here, so this queries unconditionally; harmless — an empty/absent
  // Vets at Home history for a non-Karachi user just means `activeRequest` stays null).
  const { activeRequest } = useActiveExpressVetRequest();
  const baseBarHeight = Platform.OS === 'ios' ? 52 : 56;

  // Collapse the bar entirely (no reserved space) while an overlay owns the screen.
  if (tabBarHidden) return null;

  return (
    <View>
      {/* Persistent active-booking bar — same base height as the tab row below it (not
          counting the tab row's extra bottom-safe-area padding, which is specific to being
          the literal bottom edge element). Tapping it opens the full request detail screen;
          see ActiveBookingBar's own comment for why this isn't a custom expand-in-place
          animation. */}
      {activeRequest && <ActiveBookingBar request={activeRequest} height={baseBarHeight} />}

      <View
        style={[
          styles.bar,
          {
            height: baseBarHeight + insets.bottom,
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
              focused={focused}
              profileImageUrl={user?.profile_image_url}
            />
          </TouchableOpacity>
        );
      })}
      </View>
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
