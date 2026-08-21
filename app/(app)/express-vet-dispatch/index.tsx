import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Switch, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetDispatchRequest, ExpressVetProvider } from '../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../src/constants/expressVet';
import { getRealtimeSocket, disconnectRealtimeSocket } from '../../../src/services/realtime';
import { useAuthStore } from '../../../src/stores/authStore';
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
  const logout = useAuthStore((s) => s.logout);

  const { data: dutyData } = useQuery({
    queryKey: ['express-vet-dispatch-duty'],
    queryFn: expressVetDispatchApi.getDuty,
  });
  const [isOnDuty, setIsOnDuty] = useState(false);
  useEffect(() => {
    if (dutyData) setIsOnDuty(dutyData.status.is_on_duty);
  }, [dutyData]);

  const { data: stats } = useQuery({
    queryKey: ['express-vet-dispatch-stats'],
    queryFn: expressVetDispatchApi.getStats,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['express-vet-dispatch-jobs-preview'],
    queryFn: () => expressVetDispatchApi.getJobs(),
  });
  const jobsPreview = (jobsData?.data ?? []).slice(0, 3);

  const { data: providersData } = useQuery({
    queryKey: ['express-vet-providers-preview'],
    queryFn: () => expressVetDispatchApi.searchProviders({}),
  });
  const providersPreview = (providersData?.data ?? []).slice(0, 3);

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
        {router.canGoBack() && (
          // A dispatcher-role account lands here directly on login (see app/_layout.tsx) with
          // no back history — this is their app root, so there's nothing to fall back to.
          // Admins reach this screen from the profile menu and do have a real back stack.
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dispatcher Console</Text>
          <Text style={styles.subtitle}>{isOnDuty ? 'On duty' : 'Off duty'}</Text>
        </View>
        <Switch value={isOnDuty} onValueChange={handleToggleDuty} trackColor={{ true: PRIMARY }} />
        {/* Dispatcher-role accounts can't reach the normal profile menu (where logout
            normally lives) — this is the only way out for them, so it has to live here. */}
        <TouchableOpacity
          onPress={() => Alert.alert('Log out?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => logout() },
          ])}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 14 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#8A8A94" />
        </TouchableOpacity>
      </View>

      {/* Existing work, not new incoming requests — so this stays visible even off duty. */}
      <View style={[styles.statsRow, { paddingHorizontal: H_PAD }]}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/express-vet-dispatch/jobs' as any)}
        >
          <Text style={styles.statValue}>{stats?.in_progress ?? '—'}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/express-vet-dispatch/jobs' as any)}
        >
          <Text style={styles.statValue}>{stats?.completed_today ?? '—'}</Text>
          <Text style={styles.statLabel}>Completed Today</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 16 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Jobs</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/express-vet-dispatch/jobs' as any)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        {jobsPreview.length === 0 ? (
          <Text style={styles.sectionEmptyText}>No jobs yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {jobsPreview.map((job) => (
              <TouchableOpacity
                key={job.request_id}
                style={styles.previewRow}
                onPress={() =>
                  router.push({ pathname: '/(app)/express-vet-dispatch/requests/[id]', params: { id: job.request_id } } as any)
                }
              >
                <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[job.category] ?? 'paw'} size={18} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewRowText} numberOfLines={1}>
                    {job.category.replace('_', ' ')} — {job.client_name}
                  </Text>
                  <Text style={styles.previewRowSubtext} numberOfLines={1}>
                    {job.provider_name ? `${job.provider_name} · ` : ''}{job.address_line}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={styles.previewRowMeta}>{job.status === 'completed' ? 'Done' : 'In Progress'}</Text>
                  <Text style={styles.previewRowPrice}>
                    PKR {(job.final_price_pkr ?? job.starting_price_pkr).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: H_PAD, paddingBottom: 16 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Providers</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/express-vet-dispatch/providers' as any)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        {providersPreview.length === 0 ? (
          <Text style={styles.sectionEmptyText}>No providers yet — one gets added automatically the first time you assign a job.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {providersPreview.map((provider: ExpressVetProvider) => (
              <TouchableOpacity
                key={provider.provider_id}
                style={styles.previewRow}
                onPress={() =>
                  router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: provider.provider_id } } as any)
                }
              >
                {provider.photo_url ? (
                  <Image source={{ uri: provider.photo_url }} style={styles.previewAvatar} contentFit="cover" />
                ) : (
                  <Ionicons name="person-circle-outline" size={30} color="#C4C4CC" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewRowText} numberOfLines={1}>
                    {provider.name}
                  </Text>
                  <Text style={styles.previewRowSubtext} numberOfLines={1}>
                    {provider.categories.map((c) => c.replace('_', ' ')).join(', ')}
                    {provider.years_experience != null ? ` · ${provider.years_experience}y exp` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={styles.previewRowMeta}>
                    {provider.rating != null ? `${provider.rating} ★` : 'No ratings'}
                  </Text>
                  <Text style={styles.previewRowSubtext}>{provider.total_reviews} review{provider.total_reviews === 1 ? '' : 's'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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

  statsRow: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontFamily: FONTS.heading, fontSize: 26, color: DARK },
  statLabel: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: DARK },
  seeAllText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: PRIMARY },
  sectionEmptyText: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94' },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewRowText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK, textTransform: 'capitalize' },
  previewRowSubtext: { fontFamily: FONTS.body, fontSize: 11, color: '#8A8A94', marginTop: 2, textTransform: 'capitalize' },
  previewRowMeta: { fontFamily: FONTS.body, fontSize: 11, color: '#8A8A94' },
  previewRowPrice: { fontFamily: FONTS.bodyBold, fontSize: 12, color: DARK },
  previewAvatar: { width: 30, height: 30, borderRadius: 15 },

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
