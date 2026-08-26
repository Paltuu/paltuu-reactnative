import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetDispatchRequest } from '../../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import { getRealtimeSocket, disconnectRealtimeSocket } from '../../../../src/services/realtime';
import { useAuthStore } from '../../../../src/stores/authStore';
import { useDispatcherScopeStore } from '../../../../src/stores/dispatcherScopeStore';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';
import { COLORS } from '../../../../src/constants/colors';
import { FONTS } from '../../../../src/constants/typography';

const H_PAD = 20;
const INBOX_QUERY_KEY = ['express-vet-dispatch-inbox'];

type Tab = 'unconfirmed' | 'ongoing' | 'completed';
const VALID_TABS: Tab[] = ['unconfirmed', 'ongoing', 'completed'];

function isValidTab(value: unknown): value is Tab {
  return typeof value === 'string' && (VALID_TABS as string[]).includes(value);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function ExpressVetJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const scope = useDispatcherScopeStore((s) => s.scope);
  const setScope = useDispatcherScopeStore((s) => s.setScope);

  const { tab: tabParam } = useLocalSearchParams<{ tab?: 'unconfirmed' | 'ongoing' | 'completed' }>();
  const [tab, setTab] = useState<Tab>(isValidTab(tabParam) ? tabParam : 'unconfirmed');

  // Deep-linking (e.g. the stat tiles on the console home screen) navigates to this same
  // route with a different `tab` param — expo-router may reuse this screen instance rather
  // than remounting it, so the initial-state-only read above wouldn't pick up a later change.
  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== tab) setTab(tabParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const effectiveScope = isAdmin && scope === 'team' ? 'team' : undefined;
  const jobStatus: 'assigned' | 'completed' | undefined =
    tab === 'ongoing' ? 'assigned' : tab === 'completed' ? 'completed' : undefined;

  // Pool-wide inbox — moved here from express-vet-dispatch/index.tsx. Always fetched
  // (not gated on the selected tab) so it stays fresh via its own poll + the realtime socket
  // below for as long as this screen is mounted, regardless of which tab is showing.
  const {
    data: inboxData,
    isPending: inboxPending,
    isError: inboxIsError,
    error: inboxError,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: INBOX_QUERY_KEY,
    queryFn: expressVetDispatchApi.getInbox,
    refetchInterval: 30000,
  });

  const {
    data: jobsData,
    isPending: jobsPending,
    isError: jobsIsError,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['express-vet-dispatch-jobs', jobStatus, effectiveScope],
    queryFn: () => expressVetDispatchApi.getJobs({ status: jobStatus, scope: effectiveScope }),
    enabled: !!jobStatus,
  });

  // Own socket lifecycle scoped to this screen (mount -> connect, unmount -> disconnect)
  // rather than relying on SocialRealtimeContext, since this isn't a "social" route and that
  // provider tears the shared socket down here. Moved from express-vet-dispatch/index.tsx
  // along with the inbox it feeds — connected for the whole time this screen is mounted, not
  // conditional on which tab is selected.
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

  const items = tab === 'unconfirmed' ? inboxData?.data ?? [] : jobsData?.data ?? [];
  const isPending = tab === 'unconfirmed' ? inboxPending : jobsPending;
  const isError = tab === 'unconfirmed' ? inboxIsError : jobsIsError;
  const error = tab === 'unconfirmed' ? inboxError : jobsError;
  const refetch = tab === 'unconfirmed' ? refetchInbox : refetchJobs;

  const goToRequest = (id: string) =>
    router.push({ pathname: '/(app)/express-vet-dispatch/requests/[id]', params: { id } } as any);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/express-vet-dispatch'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Jobs</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { paddingHorizontal: H_PAD }]}>
        {VALID_TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'unconfirmed' ? 'Unconfirmed' : t === 'ongoing' ? 'Ongoing' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mine/Team is admin-only, and only meaningful once a status (ongoing/completed) is in
          play — pending_dispatch requests in the Unconfirmed tab have no owning dispatcher. */}
      {isAdmin && tab !== 'unconfirmed' && (
        <View style={[styles.scopeRow, { paddingHorizontal: H_PAD }]}>
          <TouchableOpacity
            style={[styles.scopeChip, scope === 'mine' && styles.scopeChipActive]}
            onPress={() => setScope('mine')}
          >
            <Text style={[styles.scopeChipText, scope === 'mine' && styles.scopeChipTextActive]}>Mine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scopeChip, scope === 'team' && styles.scopeChipActive]}
            onPress={() => setScope('team')}
          >
            <Text style={[styles.scopeChipText, scope === 'team' && styles.scopeChipTextActive]}>Team</Text>
          </TouchableOpacity>
        </View>
      )}

      {isError ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load this list. Please try again."
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>
            {tab === 'unconfirmed' ? 'No pending requests right now.' : 'Nothing here yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) =>
            tab === 'unconfirmed' ? (
              <InboxRow item={item} onPress={() => goToRequest(item.request_id)} />
            ) : (
              <JobRow item={item} onPress={() => goToRequest(item.request_id)} />
            )
          }
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
          <Ionicons name="person" size={20} color={COLORS.textPlaceholder} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[item.category] ?? 'paw'} size={14} color={COLORS.primary} />
          <Text style={styles.inboxCategory}>{item.category.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.inboxClient}>{item.client_name}</Text>
        <Text style={styles.inboxAddress} numberOfLines={1}>{item.address_line}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.inboxPrice}>PKR {item.starting_price_pkr.toLocaleString()}</Text>
        <Text style={styles.inboxTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function JobRow({ item, onPress }: { item: ExpressVetDispatchRequest; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[item.category] ?? 'paw'} size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.jobCategory}>{item.category.replace('_', ' ')}</Text>
        <Text style={styles.jobClient}>{item.client_name}</Text>
        {!!item.provider_name && <Text style={styles.jobMeta}>Provider: {item.provider_name}</Text>}
        {!!item.dispatcher_name && <Text style={styles.jobMeta}>Assigned by {item.dispatcher_name}</Text>}
      </View>
      <Text style={styles.jobPrice}>PKR {(item.final_price_pkr ?? item.starting_price_pkr).toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },

  tabRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  tabText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark },
  tabTextActive: { color: COLORS.primary },

  scopeRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  scopeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  scopeChipText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.textMuted },
  scopeChipTextActive: { color: COLORS.primary },

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
  inboxCategory: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.primary, textTransform: 'capitalize' },
  inboxClient: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark, marginTop: 2 },
  inboxAddress: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  inboxPrice: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark },
  inboxTime: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textPlaceholder },

  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobCategory: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark, textTransform: 'capitalize' },
  jobClient: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  jobMeta: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textPlaceholder, marginTop: 2 },
  jobPrice: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark },
});
