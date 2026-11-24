import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../../src/stores/petStore';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { QueryErrorState } from '../../../src/components/ui/QueryErrorState';
import { FONTS } from '../../../src/constants/typography';
import {
  AC,
  AvatarStack,
  Button,
  Card,
  Chevron,
  EmptyState,
  HeaderIconButton,
  InfoNote,
  ListSkeleton,
  PET_PLACEHOLDER,
  PetPhoto,
  RowCard,
  ScreenHeader,
  SectionHeader,
  s as ui,
} from '../../../src/components/adoption/ui';
import { ListingActionsSheet, useListingActions } from '../../../src/components/adoption/ListingActions';
import {
  applicantName,
  formatShortDate,
  getListingStatus,
  joinPetNames,
  petLocation,
  petSummary,
  plural,
  requestStatus,
  timeAgoInline,
} from '../../../src/utils/adoption';

type Person = { name?: string | null; uri?: string | null };

const objectPronoun = (sex?: string | null) => (sex === 'male' ? 'him' : sex === 'female' ? 'her' : 'the listing');

function MyListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { myListings, adoptionRequests, myListingsError, fetchMyListings, fetchAdoptionRequests } = usePetStore(
    useShallow((state) => ({
      myListings: state.myListings,
      adoptionRequests: state.adoptionRequests,
      myListingsError: state.myListingsError,
      fetchMyListings: state.fetchMyListings,
      fetchAdoptionRequests: state.fetchAdoptionRequests,
    }))
  );
  const [loaded, setLoaded] = useState(myListings.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetPet, setSheetPet] = useState<any | null>(null);
  const actions = useListingActions();

  const load = useCallback(async () => {
    await Promise.all([fetchMyListings(), fetchAdoptionRequests()]);
    setLoaded(true);
  }, [fetchMyListings, fetchAdoptionRequests]);

  // Reload on every visit, so changes made on the listing form or a
  // listing's page are here when the owner comes back.
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
  const newListing = () => router.push('/(app)/create-pet');
  const openListing = (pet: any) =>
    router.push({ pathname: '/(app)/my-listings/[id]', params: { id: String(pet.pet_id) } });

  const groups = useMemo(() => {
    const out: Record<'live' | 'review' | 'paused' | 'adopted', any[]> = { live: [], review: [], paused: [], adopted: [] };
    for (const pet of myListings) out[getListingStatus(pet)].push(pet);
    return out;
  }, [myListings]);

  const pending = useMemo(() => adoptionRequests.filter((r) => requestStatus(r) === 'pending'), [adoptionRequests]);

  // Applicant faces per pet (requests carry profile photos; the listing only has names).
  const applicantsByPet = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const r of adoptionRequests) {
      const list = map.get(r.pet_id) ?? [];
      list.push({ name: applicantName(r), uri: r.adopter_image });
      map.set(r.pet_id, list);
    }
    return map;
  }, [adoptionRequests]);

  const adoptedBy = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of adoptionRequests) if (requestStatus(r) === 'approved') map.set(r.pet_id, applicantName(r));
    return map;
  }, [adoptionRequests]);

  const checkIns = groups.live.filter((pet) => !!pet.availability_check_sent_at);

  const subtitle =
    [
      groups.live.length ? `${groups.live.length} live` : null,
      pending.length ? `${plural(pending.length, 'application', 'applications')} waiting` : null,
    ]
      .filter(Boolean)
      .join(' · ') || "Pets you've put up for adoption";

  const sections: React.ReactNode[] = [];
  const sectionStyle = () => [ui.section, sections.length === 0 && { marginTop: 20 }];

  if (pending.length > 0 || checkIns.length > 0) {
    const oldest = pending[pending.length - 1];
    sections.push(
      <View key="waiting" style={sectionStyle()}>
        <SectionHeader title="Waiting on you" />
        <View style={{ gap: 12 }}>
          {pending.length > 0 && (
            <Card
              onPress={() => router.push('/(app)/adoption-requests')}
              style={st.waitingCard}
              accessibilityLabel={`${plural(pending.length, 'new application', 'new applications')}. Review`}
            >
              <AvatarStack people={pending.map((r) => ({ name: applicantName(r), uri: r.adopter_image }))} size={38} max={2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.cardTitle}>{plural(pending.length, 'new application', 'new applications')}</Text>
                <Text style={st.cardSubtitle} numberOfLines={1}>
                  {`For ${joinPetNames(pending.map((r) => r.pet_name))} · ${
                    pending.length === 1 ? timeAgoInline(oldest.created_at) : `oldest ${timeAgoInline(oldest.created_at)}`
                  }`}
                </Text>
              </View>
              <View style={st.reviewPill}>
                <Text style={st.reviewPillText}>Review</Text>
              </View>
            </Card>
          )}

          {checkIns.map((pet) => (
            <Card key={pet.pet_id} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <PetPhoto uri={pet.image_url} size={56} radius={14} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.cardTitle}>{`Is ${pet.pet_name} still looking for a home?`}</Text>
                  <Text style={[st.cardSubtitle, { marginTop: 2 }]}>
                    {`Confirming keeps ${objectPronoun(pet.sex)} near the top of the adoption page.`}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Button
                  label="Adopted"
                  variant="neutral"
                  height={44}
                  style={{ flex: 1 }}
                  loading={actions.busy === `${pet.pet_id}:adopted`}
                  onPress={() => actions.markAdopted(pet)}
                />
                <Button
                  label="Still available"
                  height={44}
                  style={{ flex: 1 }}
                  loading={actions.busy === `${pet.pet_id}:keep`}
                  onPress={() => actions.keepListed(pet)}
                />
              </View>
            </Card>
          ))}
        </View>
      </View>
    );
  }

  if (groups.live.length > 0) {
    sections.push(
      <View key="live" style={sectionStyle()}>
        <SectionHeader title="Live" count={groups.live.length} />
        <View style={{ gap: 16 }}>
          {groups.live.map((pet) => (
            <LiveListingCard
              key={pet.pet_id}
              pet={pet}
              applicants={applicantsByPet.get(pet.pet_id) ?? (pet.recent_applicant_names || []).map((name: string) => ({ name }))}
              onOpen={() => openListing(pet)}
              onMore={() => setSheetPet(pet)}
            />
          ))}
        </View>
      </View>
    );
  }

  if (groups.paused.length > 0) {
    sections.push(
      <View key="paused" style={sectionStyle()}>
        <SectionHeader title="Paused" />
        <View style={{ gap: 12 }}>
          {groups.paused.map((pet) => (
            <RowCard
              key={pet.pet_id}
              image={pet.image_url}
              title={pet.pet_name}
              subtitle="Hidden from the adoption page"
              onPress={() => openListing(pet)}
              right={
                <Button
                  label="Relist"
                  size="sm"
                  variant="secondary"
                  textColor={AC.primary}
                  loading={actions.busy === `${pet.pet_id}:relist`}
                  onPress={() => actions.relist(pet)}
                />
              }
            />
          ))}
        </View>
      </View>
    );
  }

  if (groups.review.length > 0) {
    sections.push(
      <View key="review" style={sectionStyle()}>
        <SectionHeader title="In review" />
        <View style={{ gap: 12 }}>
          {groups.review.map((pet) => (
            <RowCard
              key={pet.pet_id}
              image={pet.image_url}
              title={pet.pet_name}
              subtitle={[pet.pet_breed || pet.category, `Sent ${formatShortDate(pet.created_at)}`].filter(Boolean).join(' · ')}
              onPress={() => openListing(pet)}
            />
          ))}
        </View>
        <InfoNote>Paltuu reviews every listing before it goes live.</InfoNote>
      </View>
    );
  }

  if (groups.adopted.length > 0) {
    sections.push(
      <View key="adopted" style={sectionStyle()}>
        <SectionHeader title="Adopted" />
        <View style={{ gap: 12 }}>
          {groups.adopted.map((pet) => {
            const by = adoptedBy.get(pet.pet_id);
            return (
              <RowCard
                key={pet.pet_id}
                image={pet.image_url}
                title={pet.pet_name}
                subtitle={by ? `Adopted by ${by}` : 'Adopted'}
                onPress={() => openListing(pet)}
              />
            );
          })}
        </View>
      </View>
    );
  }

  let body: React.ReactNode;
  if (!loaded && myListings.length === 0) {
    body = <ListSkeleton />;
  } else if (myListings.length === 0 && myListingsError) {
    body = (
      <View style={{ paddingTop: 96 }}>
        <QueryErrorState error={myListingsError} fallbackMessage="We couldn't load your listings." onRetry={load} />
      </View>
    );
  } else if (myListings.length === 0) {
    body = (
      <EmptyState
        icon="paw-outline"
        title="No listings yet"
        body="List a pet that needs a home. Everyone who applies shows up here, and you choose who adopts."
        action={{ label: 'List a pet', icon: 'add', onPress: newListing }}
      />
    );
  } else {
    body = sections;
  }

  return (
    <View style={ui.page}>
      <ScreenHeader
        title="My Listings"
        subtitle={subtitle}
        onBack={goBack}
        right={<HeaderIconButton icon="add" label="New listing" onPress={newListing} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AC.primary} colors={[AC.primary]} />
        }
      >
        {body}
      </ScrollView>
      <ListingActionsSheet pet={sheetPet} onClose={() => setSheetPet(null)} actions={actions} />
    </View>
  );
}

function LiveListingCard({
  pet,
  applicants,
  onOpen,
  onMore,
}: {
  pet: any;
  applicants: Person[];
  onOpen: () => void;
  onMore: () => void;
}) {
  const summary = petSummary(pet);
  const location = petLocation(pet);
  // The API leaves the counts out when it couldn't load them.
  const countsKnown = pet.application_count !== undefined && pet.application_count !== null;
  const total = Number(pet.application_count) || 0;
  const fresh = Number(pet.pending_application_count) || 0;

  return (
    <Card style={{ borderRadius: 22, overflow: 'hidden' }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${pet.pet_name}`}>
        <Image
          source={pet.image_url ? { uri: pet.image_url } : PET_PLACEHOLDER}
          style={st.livePhoto}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text onPress={onOpen} style={st.liveName} numberOfLines={1}>{pet.pet_name}</Text>
          <TouchableOpacity
            onPress={onMore}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${pet.pet_name}`}
            style={st.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={AC.ink} />
          </TouchableOpacity>
        </View>
        {summary ? <Text style={st.liveMeta} numberOfLines={1}>{summary}</Text> : null}
        {location ? (
          <View style={st.liveLocationRow}>
            <Ionicons name="location-outline" size={15} color={AC.muted} />
            <Text style={[st.liveMeta, { flex: 1 }]} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </View>

      {!countsKnown || total > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpen}
          style={st.liveFooter}
          accessibilityRole="button"
          accessibilityLabel={countsKnown ? `${plural(total, 'application', 'applications')}${fresh ? `, ${fresh} new` : ''}` : 'View applications'}
        >
          {applicants.length > 0 ? <AvatarStack people={applicants} size={28} /> : null}
          <Text style={st.liveApps}>{countsKnown ? plural(total, 'application', 'applications') : 'View applications'}</Text>
          {fresh > 0 ? (
            <View style={st.newBadge}>
              <Text style={st.newBadgeText}>{`${fresh} new`}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Chevron />
        </TouchableOpacity>
      ) : (
        <View style={[st.liveFooter, { justifyContent: 'space-between', paddingTop: 14, paddingBottom: 16 }]}>
          <Text style={st.liveMeta}>No applications yet</Text>
          <Text style={[st.liveMeta, { fontSize: 13 }]}>{`Listed ${formatShortDate(pet.created_at)}`}</Text>
        </View>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  waitingCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },
  cardSubtitle: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },
  reviewPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AC.control,
    backgroundColor: AC.surface,
    justifyContent: 'center',
  },
  reviewPillText: { fontFamily: FONTS.headingSemi, fontSize: 13, color: AC.primary },

  livePhoto: { width: '100%', height: 220, backgroundColor: AC.fill },
  liveName: { flex: 1, fontFamily: FONTS.heading, fontSize: 20, lineHeight: 26, color: AC.ink, letterSpacing: -0.3 },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AC.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
  },
  liveMeta: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted },
  liveLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  liveFooter: {
    marginTop: 14,
    marginHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: AC.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveApps: { fontFamily: FONTS.bodyBold, fontSize: 14, lineHeight: 20, color: AC.ink },
  newBadge: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: AC.primary,
    justifyContent: 'center',
  },
  newBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#FFFFFF' },
});

export default withFocusUnmount(MyListingsScreen);
