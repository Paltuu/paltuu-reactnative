import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ExpressVetRequest } from '../../api/expressVet';
import { FONTS } from '../../constants/typography';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';

// Persistent mini-bar tracking the client's one active Vets at Home booking — shown above
// the bottom tab bar (see (tabs)/_layout.tsx's CustomTabBar, the only place that renders
// this) on every tab screen, regardless of which one the user is on. Stays up from the
// moment a request is submitted (pending_dispatch — this is also where the "pinging"
// animation the request-creation flow asked for lives, since that's the exact status a
// freshly-submitted request starts in) until the booking is cancelled or completed-and-
// reviewed — see useActiveExpressVetRequest's isTrackableExpressVetRequest for that rule.
export function ActiveBookingBar({ request, height }: { request: ExpressVetRequest; height: number }) {
  const router = useRouter();

  const { label, icon, pinging } = statusPresentation(request);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.bar, { height }]}
      onPress={() =>
        router.push({ pathname: '/(app)/express-vet/requests/[id]', params: { id: request.request_id } } as any)
      }
    >
      <View style={styles.left}>
        {pinging ? <PingingDot /> : <Ionicons name={icon} size={18} color={PRIMARY} />}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-up" size={20} color={PRIMARY} />
    </TouchableOpacity>
  );
}

function statusPresentation(request: ExpressVetRequest): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  pinging: boolean;
} {
  switch (request.status) {
    case 'pending_dispatch':
      return { label: 'Finding you a vet…', icon: 'radio-outline', pinging: true };
    case 'claimed':
      return { label: 'Confirming your booking…', icon: 'call-outline', pinging: true };
    case 'assigned': {
      const when = request.scheduled_at
        ? new Date(request.scheduled_at).toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : null;
      return { label: when ? `Confirmed — arriving ${when}` : 'Confirmed', icon: 'checkmark-circle-outline', pinging: false };
    }
    case 'completed':
      return { label: 'Visit complete — rate your provider', icon: 'star-outline', pinging: false };
    default:
      return { label: 'Booking update', icon: 'paw-outline', pinging: false };
  }
}

// Expanding-ring "ping" — a scaling, fading ring behind a solid dot, looping. Used instead
// of a plain spinner since this represents "broadcasting to dispatchers", not "loading".
function PingingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(2.2, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pingWrap}>
      <Animated.View style={[styles.pingRing, ringStyle]} />
      <View style={styles.pingDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FAF0F2',
    borderTopWidth: 1,
    borderTopColor: '#F0D8DC',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: DARK,
  },
  pingWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  pingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
