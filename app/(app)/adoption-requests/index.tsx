import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../../src/stores/petStore';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { QueryErrorState } from '../../../src/components/ui/QueryErrorState';
import { FONTS } from '../../../src/constants/typography';
import {
  AC,
  Card,
  Chevron,
  Chip,
  EmptyState,
  FilterChip,
  InfoNote,
  PersonAvatar,
  PetPhoto,
  RowsSkeleton,
  ScreenHeader,
} from '../../../src/components/adoption/ui';
import {
  applicantName,
  assessFit,
  fitBadge,
  groupRequestsByPet,
  plural,
  RequestStatus,
  requestId,
  requestStatus,
  timeAgo,
} from '../../../src/utils/adoption';

const FILTERS: { key: RequestStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Declined' },
];

function AdoptionRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { adoptionRequests, myListings, adoptionRequestsError, fetchAdoptionRequests, fetchMyListings } = usePetStore(
    useShallow((state) => ({
      adoptionRequests: state.adoptionRequests,
      myListings: state.myListings,
      adoptionRequestsError: state.adoptionRequestsError,
      fetchAdoptionRequests: state.fetchAdoptionRequests,
      fetchMyListings: state.fetchMyListings,
    }))
  );
  const [loaded, setLoaded] = useState(adoptionRequests.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<RequestStatus>('pending');

  // A "new application" notification or the in-app prompt opens this screen
  // with that application's id: open it on top, then drop the param so it
  // doesn't reopen when this screen remounts.
  const { applicationId } = useLocalSearchParams<{ applicationId?: string }>();
  useEffect(() => {
    if (!applicationId) return;
    router.setParams({ applicationId: '' });
    router.push({ pathname: '/(app)/adoption-requests/[id]', params: { id: String(applicationId) } });
  }, [applicationId]);

  // Listings give each pet's breed and needs, used for the match summary.
  const load = useCallback(async () => {
    await Promise.all([fetchAdoptionRequests(), fetchMyListings()]);
    setLoaded(true);
  }, [fetchAdoptionRequests, fetchMyListings]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'));

  const counts = useMemo(() => {
    const c: Record<RequestStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of adoptionRequests) c[requestStatus(r)] += 1;
    return c;
  }, [adoptionRequests]);

  const petsById = useMemo(() => new Map(myListings.map((p) => [p.pet_id, p])), [myListings]);
  const groups = useMemo(
    () => groupRequestsByPet(adoptionRequests.filter((r) => requestStatus(r) === filter)),
    [adoptionRequests, filter]
  );

  const openRequest = (r: any) =>
    router.push({
      pathname: '/(app)/adoption-requests/[id]',
      params: { id: String(requestId(r)) },
    });

  let body: React.ReactNode;
  if (!loaded && adoptionRequests.length === 0) {
    body = <RowsSkeleton />;
  } else if (adoptionRequests.length === 0 && adoptionRequestsError) {
    body = (
      <View style={{ paddingTop: 96 }}>
        <QueryErrorState error={adoptionRequestsError} fallbackMessage="We couldn't load your adoption requests." onRetry={load} />
      </View>
    );
  } else if (adoptionRequests.length === 0) {
    body = (
      <EmptyState
        icon="file-tray-outline"
        title="No applications yet"
        body="When someone applies to adopt one of your pets, their application shows up here."
      />
    );
  } else if (groups.length === 0) {
    body =
      filter === 'pending' ? (
        <EmptyState icon="file-tray-outline" title="You're all caught up" body="New applications for your pets will show up here." />
      ) : filter === 'approved' ? (
        <EmptyState icon="checkmark-circle-outline" title="No approved applications" body="When you approve someone, you'll find their application here." />
      ) : (
        <EmptyState icon="close-circle-outline" title="No declined applications" body="Applications you decline are kept here." />
      );
  } else {
    body = (
      <>
        {groups.map((group, gi) => {
          const pet = petsById.get(group.petId);
          const breed = pet?.pet_breed || pet?.category;
          const countLabel =
            filter === 'pending'
              ? `${group.items.length} waiting`
              : plural(group.items.length, filter === 'approved' ? 'approved' : 'declined', filter === 'approved' ? 'approved' : 'declined');
          return (
            <View key={group.petId} style={{ marginTop: gi === 0 ? 22 : 30, paddingHorizontal: 20 }}>
              <View style={st.groupHeader}>
                <PetPhoto uri={pet?.image_url || group.image} size={40} radius={12} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.groupTitle} numberOfLines={1} accessibilityRole="header">{group.petName}</Text>
                  <Text style={st.groupSubtitle} numberOfLines={1}>{[breed, countLabel].filter(Boolean).join(' · ')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(app)/my-listings/[id]', params: { id: String(group.petId) } })}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${group.petName}'s listing`}
                >
                  <Text style={st.link}>View listing</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 12, gap: 12 }}>
                {group.items.map((r) => (
                  <RequestCard key={requestId(r)} item={r} pet={pet} onPress={() => openRequest(r)} />
                ))}
              </View>
            </View>
          );
        })}
        {filter === 'pending' ? (
          <InfoNote style={{ marginHorizontal: 24, marginTop: 16 }}>
            Approving someone marks the pet as adopted and declines everyone else who applied for it.
          </InfoNote>
        ) : null}
      </>
    );
  }

  return (
    <View style={st.page}>
      <ScreenHeader
        title="Adoption Requests"
        subtitle={counts.pending ? `${counts.pending} waiting on you` : 'Nothing waiting on you'}
        onBack={goBack}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AC.primary} colors={[AC.primary]} />
        }
      >
        {adoptionRequests.length > 0 ? (
          <View style={st.filters} accessibilityRole="tablist">
            {FILTERS.map((f) => (
              <FilterChip key={f.key} label={f.label} count={counts[f.key]} selected={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </View>
        ) : null}
        {body}
      </ScrollView>
    </View>
  );
}

function RequestCard({ item, pet, onPress }: { item: any; pet: any; onPress: () => void }) {
  const status = requestStatus(item);
  const name = applicantName(item);
  const badge = status === 'pending' && pet ? fitBadge(assessFit(item, pet)) : null;
  const message = (item.additional_details || item.pet_description || '').trim();
  return (
    <Card onPress={onPress} style={{ padding: 16 }} accessibilityLabel={`${name}'s application`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PersonAvatar name={name} uri={item.adopter_image} size={44} style={status === 'rejected' ? { opacity: 0.55 } : undefined} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
          <Text style={st.meta} numberOfLines={1}>{[item.city_name, timeAgo(item.created_at)].filter(Boolean).join(' · ')}</Text>
        </View>
        <Chevron />
      </View>
      {badge ? (
        <Chip
          tone={badge.tone}
          icon={badge.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
          label={badge.label}
          style={{ marginTop: 12 }}
        />
      ) : status === 'approved' ? (
        <Chip tone="success" icon="checkmark-circle" label="Approved" style={{ marginTop: 12 }} />
      ) : status === 'rejected' ? (
        <Chip tone="neutral" label="Declined" style={{ marginTop: 12 }} />
      ) : null}
      {message ? (
        <Text style={st.message} numberOfLines={2}>{message}</Text>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: AC.page },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupTitle: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22, color: AC.ink, letterSpacing: -0.2 },
  groupSubtitle: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },
  link: { fontFamily: FONTS.bodyBold, fontSize: 13, color: AC.primary },
  name: { fontFamily: FONTS.bodyBold, fontSize: 16, lineHeight: 21, color: AC.ink },
  meta: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },
  message: { marginTop: 10, fontFamily: FONTS.body, fontSize: 14, lineHeight: 21, color: AC.ink },
});

export default withFocusUnmount(AdoptionRequestsScreen);
