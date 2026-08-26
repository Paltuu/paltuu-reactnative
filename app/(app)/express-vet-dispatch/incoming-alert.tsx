import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useIncomingCallStore, IncomingExpressVetCallPayload } from '../../../src/stores/incomingCallStore';
import { dismissAndroidIncomingAlert } from '../../../src/services/androidDispatchAlert';
import { expressVetDispatchApi } from '../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../src/constants/expressVet';
import { COLORS } from '../../../src/constants/colors';
import { FONTS } from '../../../src/constants/typography';

/**
 * Android-only full-screen incoming-job alert — what a notifee `fullScreenAction`
 * notification (src/services/androidDispatchAlert.ts) opens into, whether by the
 * dispatcher tapping it or the OS auto-launching it over a locked screen. This screen
 * owns the accept/dismiss decision that CallKeep's native call UI used to own on its own;
 * iOS never reaches this screen (it still gets the real CallKit incoming-call UI).
 *
 * Back button is blocked deliberately — same as the old CallKeep UI, a job alert should
 * only go away via an explicit Accept or Dismiss tap, not an accidental back-swipe.
 */
export default function IncomingAlertScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alertId } = useLocalSearchParams<{ alertId: string }>();
  const [payload, setPayload] = useState<IncomingExpressVetCallPayload | undefined>(
    alertId ? useIncomingCallStore.getState().get(alertId) : undefined
  );
  const [busy, setBusy] = useState(false);

  // Only block back while there's an actual alert to force a decision on — otherwise this
  // would trap the dispatcher on a permanent black screen with no way out (this route can
  // be the app's very first screen on a killed-app cold start, so router.back() has no
  // history to fall back to; see the effect below for why payload can end up empty).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => !!payload);
    return () => sub.remove();
  }, [payload]);

  useEffect(() => {
    if (!alertId) {
      router.replace('/(app)/express-vet-dispatch');
      return;
    }
    const current = useIncomingCallStore.getState().get(alertId);
    if (!current) {
      // Payload already cleared (e.g. dismissed elsewhere), or — if this is ever reached —
      // DispatcherCallProvider's rehydration-from-notification-data didn't find anything to
      // recover either. Either way there's nothing to show; route to the console instead of
      // router.back(), which is a no-op with no history when this is the app's first screen.
      router.replace('/(app)/express-vet-dispatch');
      return;
    }
    setPayload(current);
  }, [alertId]);

  const close = async () => {
    if (alertId) await dismissAndroidIncomingAlert(alertId);
    router.back();
  };

  const handleDismiss = () => {
    close();
  };

  const handleAccept = async () => {
    if (!payload || busy) return;
    setBusy(true);
    try {
      await expressVetDispatchApi.claim(payload.request_id);
      await close();
      router.push({
        pathname: '/(app)/express-vet-dispatch/requests/[id]',
        params: { id: payload.request_id },
      } as any);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        Toast.show({ type: 'info', text1: 'Already claimed by another dispatcher' });
        await close();
      } else {
        setBusy(false);
        Toast.show({ type: 'error', text1: 'Could not claim this request', text2: 'Try again' });
      }
    }
  };

  if (!payload) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.eyebrow}>Incoming Vets at Home request</Text>

        {payload.client_photo_url ? (
          <Image source={{ uri: payload.client_photo_url }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Ionicons name="person" size={48} color={COLORS.textPlaceholder} />
          </View>
        )}

        <Text style={styles.clientName}>{payload.client_name}</Text>

        <View style={styles.categoryRow}>
          <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[payload.category] ?? 'paw'} size={16} color={COLORS.primary} />
          <Text style={styles.categoryText}>{payload.category.replace(/_/g, ' ')}</Text>
        </View>

        <Text style={styles.address}>{payload.address_line}</Text>
        <Text style={styles.price}>Starting from PKR {payload.starting_price_pkr.toLocaleString()}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.dismissBtn]} onPress={handleDismiss} disabled={busy}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
            <Text style={styles.actionLabel}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={handleAccept} disabled={busy}>
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{busy ? 'Claiming…' : 'Accept'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.textDark },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, justifyContent: 'space-between' },
  eyebrow: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#C4C4CC', letterSpacing: 0.5, textTransform: 'uppercase' },
  photo: { width: 120, height: 120, borderRadius: 60, marginTop: 24 },
  photoFallback: { backgroundColor: '#2B2B45', alignItems: 'center', justifyContent: 'center' },
  clientName: { fontFamily: FONTS.heading, fontSize: 26, color: '#FFFFFF', marginTop: 20, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  categoryText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#FFFFFF', textTransform: 'capitalize' },
  address: { fontFamily: FONTS.body, fontSize: 14, color: '#C4C4CC', marginTop: 10, textAlign: 'center' },
  price: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#FFFFFF', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 20, width: '100%', justifyContent: 'center' },
  actionBtn: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 50, gap: 6 },
  dismissBtn: { backgroundColor: '#D64545' },
  acceptBtn: { backgroundColor: '#3AA65C' },
  actionLabel: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#FFFFFF' },
});
