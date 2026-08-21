import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Switch, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetDispatchRequest } from '../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../src/constants/expressVet';
import { getRealtimeSocket, disconnectRealtimeSocket } from '../../../src/services/realtime';
import { FONTS } from '../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;
const INBOX_QUERY_KEY = ['express-vet-dispatch-inbox'];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function ExpressVetDispatchIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: dutyData } = useQuery({
    queryKey: ['express-vet-dispatch-duty'],
    queryFn: expressVetDispatchApi.getDuty,
  });
  const [isOnDuty, setIsOnDuty] = useState(false);
  useEffect(() => {
    if (dutyData) setIsOnDuty(dutyData.status.is_on_duty);
  }, [dutyData]);

  const { data, isPending } = useQuery({
    queryKey: INBOX_QUERY_KEY,
    queryFn: expressVetDispatchApi.getInbox,
    enabled: isOnDuty,
    // Socket updates (below) are the fast path; this polling is the resilience fallback —
    // the shared realtime socket can get disconnected by navigation elsewhere in the app
    // (see src/context/SocialRealtimeContext.tsx, which only keeps it alive on "social" routes).
    refetchInterval: isOnDuty ? 30000 : false,
  });
  const requests = data?.data ?? [];

  const dutyMutation = useMutation({
    mutationFn: (next: boolean) => expressVetDispatchApi.setDuty(next),
    onSuccess: (result) => setIsOnDuty(result.status.is_on_duty),
  });

  // Own socket lifecycle scoped to this screen (mount -> connect, unmount -> disconnect)
  // rather than relying on SocialRealtimeContext, since this isn't a "social" route and
  // that provider tears the shared socket down here.
  useEffect(() => {
    let socket: any = null;
    let active = true;

    (async () => {
      socket = await getRealtimeSocket();
      if (!active || !socket) return;
      const onNewOrClaimed = () => queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
      socket.on('express_vet:new_request', onNewOrClaimed);
      socket.on('express_vet:claimed', onNewOrClaimed);
    })();

    return () => {
      active = false;
      disconnectRealtimeSocket();
    };
  }, [queryClient]);

  const handleToggleDuty = (value: boolean) => {
    setIsOnDuty(value);
    dutyMutation.mutate(value);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/pets'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dispatcher Console</Text>
          <Text style={styles.subtitle}>{isOnDuty ? 'On duty' : 'Off duty'}</Text>
        </View>
        <Switch value={isOnDuty} onValueChange={handleToggleDuty} trackColor={{ true: PRIMARY }} />
      </View>

      <View style={[styles.navRow, { paddingHorizontal: H_PAD }]}>
        <TouchableOpacity style={styles.navLink} onPress={() => router.push('/(app)/express-vet-dispatch/jobs' as any)}>
          <Ionicons name="briefcase-outline" size={16} color={PRIMARY} />
          <Text style={styles.navLinkText}>My Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navLink} onPress={() => router.push('/(app)/express-vet-dispatch/providers' as any)}>
          <Ionicons name="people-outline" size={16} color={PRIMARY} />
          <Text style={styles.navLinkText}>Providers</Text>
        </TouchableOpacity>
      </View>

      {!isOnDuty ? (
        <View style={styles.centerFill}>
          <Ionicons name="moon-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Go on duty to see incoming requests.</Text>
        </View>
      ) : isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>No pending requests right now.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => <InboxRow item={item} onPress={() => router.push({
            pathname: '/(app)/express-vet-dispatch/requests/[id]',
            params: { id: item.request_id },
          } as any)} />}
        />
      )}
    </View>
  );
}

function InboxRow({ item, onPress }: { item: ExpressVetDispatchRequest; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.row} onPress={onPress}>
      {item.client_photo_url ? (
        <Image source={{ uri: item.client_photo_url }} style={styles.clientPhoto} contentFit="cover" />
      ) : (
        <View style={[styles.clientPhoto, styles.clientPhotoFallback]}>
          <Ionicons name="person" size={20} color="#B0B7C3" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[item.category] ?? 'paw'} size={14} color={PRIMARY} />
          <Text style={styles.rowCategory}>{item.category.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.rowClient}>{item.client_name}</Text>
        <Text style={styles.rowAddress} numberOfLines={1}>{item.address_line}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.rowPrice}>PKR {item.starting_price_pkr.toLocaleString()}</Text>
        <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: '#8A8A94', textAlign: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  navRow: { flexDirection: 'row', gap: 16, paddingVertical: 12 },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navLinkText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: PRIMARY },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
  },
  clientPhoto: { width: 48, height: 48, borderRadius: 24 },
  clientPhotoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  rowCategory: { fontFamily: FONTS.bodyBold, fontSize: 11, color: PRIMARY, textTransform: 'capitalize' },
  rowClient: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK, marginTop: 2 },
  rowAddress: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },
  rowPrice: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK },
  rowTime: { fontFamily: FONTS.body, fontSize: 11, color: '#B0B7C3' },
});
