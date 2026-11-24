// The owner's page for one listing: photo, status, quick actions, everyone
// who applied, and the listing's details.
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../../src/stores/petStore';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { QueryErrorState } from '../../../src/components/ui/QueryErrorState';
import { FONTS } from '../../../src/constants/typography';
import { formatPhoneDisplay } from '../../../src/utils/phone';
import {
  AC,
  Button,
  Chevron,
  Chip,
  Divider,
  EmptyState,
  IconName,
  PET_PLACEHOLDER,
  PersonAvatar,
  SectionHeader,
  TONE_COLORS,
} from '../../../src/components/adoption/ui';
import { ListingActionsSheet, useListingActions } from '../../../src/components/adoption/ListingActions';
import {
  applicantName,
  assessFit,
  boolLabel,
  fitBadge,
  formatAgeLong,
  formatShortDate,
  getListingStatus,
  LISTING_STATUS_LABEL,
  ListingStatus,
  petLocation,
  petSummary,
  requestId,
  requestStatus,
  sexLabel,
  timeAgo,
} from '../../../src/utils/adoption';

const STATUS_TONE: Record<ListingStatus, 'success' | 'warning' | 'neutral'> = {
  live: 'success',
  review: 'warning',
  paused: 'neutral',
  adopted: 'neutral',
};

const STATUS_ORDER = { pending: 0, approved: 1, rejected: 2 } as const;

function goodWith(pet: any): string {
  const parts: string[] = [];
  if (pet.can_live_with_dogs) parts.push('dogs');
  if (pet.can_live_with_cats) parts.push('cats');
  const minAge = pet.min_age_of_children;
  if (minAge !== null && minAge !== undefined) parts.push(Number(minAge) > 0 ? `kids ${minAge}+` : 'kids');
  const text = parts.join(', ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = Number(id);
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
  const found = myListings.find((p) => p.pet_id === petId);
  // Keep showing the listing if it drops out of the store (deleting removes
  // it before the request finishes, while this page is closing).
  const lastPet = useRef<any>(found);
  if (found) lastPet.current = found;
  const pet = found ?? lastPet.current;
  const [loaded, setLoaded] = useState(!!pet);
  const [sheetOpen, setSheetOpen] = useState(false);
  const actions = useListingActions();

  const load = useCallback(async () => {
    await Promise.all([fetchMyListings(), fetchAdoptionRequests()]);
    setLoaded(true);
  }, [fetchMyListings, fetchAdoptionRequests]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/my-listings'));

  if (!pet) {
    return (
      <View style={[st.page, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={goBack} hitSlop={10} style={{ marginLeft: 16 }} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={AC.ink} />
        </TouchableOpacity>
        {!loaded ? (
          <ActivityIndicator color={AC.primary} style={{ marginTop: 120 }} />
        ) : myListingsError ? (
          <View style={{ paddingTop: 96 }}>
            <QueryErrorState error={myListingsError} fallbackMessage="We couldn't load this listing." onRetry={load} />
          </View>
        ) : (
          <EmptyState icon="paw-outline" title="This listing isn't here anymore" body="It may have been deleted." />
        )}
      </View>
    );
  }

  const status = getListingStatus(pet);
  const statusLabel = LISTING_STATUS_LABEL[status];
  const summary = petSummary(pet);
  const location = petLocation(pet);
  const canMarkAdopted = !!pet.approved && (status === 'live' || status === 'paused');

  const requests = adoptionRequests
    .filter((r) => r.pet_id === petId)
    .sort((a, b) => STATUS_ORDER[requestStatus(a)] - STATUS_ORDER[requestStatus(b)]);

  const quickActions: { key: string; icon: IconName; label: string; onPress: () => void }[] = [];
  if (status !== 'adopted') quickActions.push({ key: 'edit', icon: 'create-outline', label: 'Edit', onPress: () => actions.edit(pet) });
  if (status === 'live' || status === 'paused') {
    quickActions.push({ key: 'share', icon: 'share-social-outline', label: 'Share', onPress: () => actions.share(pet) });
  }
  if (status === 'live') quickActions.push({ key: 'pause', icon: 'pause-circle-outline', label: 'Pause', onPress: () => actions.pause(pet) });
  if (status === 'paused') quickActions.push({ key: 'relist', icon: 'play-circle-outline', label: 'Relist', onPress: () => actions.relist(pet) });
  if (canMarkAdopted) {
    quickActions.push({ key: 'adopted', icon: 'checkmark-circle-outline', label: 'Adopted', onPress: () => actions.markAdopted(pet) });
  }
  if (status === 'review') quickActions.push({ key: 'preview', icon: 'eye-outline', label: 'Preview', onPress: () => actions.viewAsAdopter(pet) });

  const details = [
    { label: 'Breed', value: pet.pet_breed || pet.category },
    { label: 'Age', value: formatAgeLong(pet.age_months) },
    { label: 'Sex', value: sexLabel(pet.sex) },
    { label: 'Good with', value: goodWith(pet) },
    { label: 'Needs', value: pet.must_have_someone_home ? 'Someone home' : '' },
    { label: 'Vaccinated', value: boolLabel(pet.vaccinated) },
    { label: 'Neutered', value: boolLabel(pet.neutered) },
    { label: 'Health', value: pet.health_issues },
    { label: 'Contact number', value: pet.contact_number ? formatPhoneDisplay(pet.contact_number).pretty : '' },
  ].filter((d) => d.value);

  const openRequest = (r: any) =>
    router.push({
      pathname: '/(app)/adoption-requests/[id]',
      params: { id: String(requestId(r)) },
    });

  return (
    <View style={st.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <Image
          source={pet.image_url ? { uri: pet.image_url } : PET_PLACEHOLDER}
          style={st.hero}
          contentFit="cover"
          transition={200}
          accessibilityLabel={pet.pet_name}
        />

        <View style={st.sheet}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Chip tone={STATUS_TONE[status]} label={statusLabel} dot />
            {pet.created_at ? <Text style={st.small}>{`Listed ${formatShortDate(pet.created_at)}`}</Text> : null}
          </View>
          <Text style={st.name}>{pet.pet_name}</Text>
          {summary ? <Text style={st.meta}>{summary}</Text> : null}
          {location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Ionicons name="location-outline" size={16} color={AC.muted} />
              <Text style={[st.meta, { marginTop: 0, flex: 1 }]}>{location}</Text>
            </View>
          ) : null}

          {quickActions.length > 0 ? (
            <View style={st.quickRow}>
              {quickActions.map((a) => {
                const busy = actions.busy === `${pet.pet_id}:${a.key}`;
                return (
                  <TouchableOpacity
                    key={a.key}
                    onPress={a.onPress}
                    disabled={!!actions.busy}
                    activeOpacity={0.7}
                    style={st.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                  >
                    <View style={st.quickIcon}>
                      {busy ? <ActivityIndicator color={AC.primary} /> : <Ionicons name={a.icon} size={22} color={AC.primary} />}
                    </View>
                    <Text style={st.quickLabel}>{a.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {status === 'adopted' ? (
            <Button
              label="Mark as available again"
              icon="arrow-undo-outline"
              variant="secondary"
              loading={actions.busy === `${pet.pet_id}:available`}
              onPress={() => actions.markAvailable(pet)}
              style={{ marginTop: 22 }}
            />
          ) : null}

          {status === 'review' ? (
            <View style={st.reviewNote}>
              <Ionicons name="time-outline" size={18} color={AC.warning} />
              <Text style={st.reviewNoteText}>
                Paltuu reviews every listing before it goes live. People can apply once it's approved.
              </Text>
            </View>
          ) : (
            <>
              <Divider style={{ marginVertical: 24 }} />
              <SectionHeader
                title="Applications"
                action={requests.length > 0 ? { label: 'See all', onPress: () => router.push('/(app)/adoption-requests') } : undefined}
                style={{ marginBottom: 4 }}
              />
              {requests.length === 0 ? (
                <Text style={st.body}>No applications yet. Everyone who applies shows up here.</Text>
              ) : (
                requests.map((r, i) => (
                  <ApplicantRow
                    key={requestId(r)}
                    item={r}
                    pet={pet}
                    last={i === requests.length - 1}
                    onPress={() => openRequest(r)}
                  />
                ))
              )}
            </>
          )}

          {details.length > 0 ? (
            <>
              <Divider style={{ marginVertical: 24 }} />
              <SectionHeader title="Details" style={{ marginBottom: 14 }} />
              <View style={st.detailGrid}>
                {details.map((d) => (
                  <View key={d.label} style={st.detailCell}>
                    <Text style={st.detailLabel}>{d.label}</Text>
                    <Text style={st.detailValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {pet.description ? (
            <>
              <Divider style={{ marginTop: 6, marginBottom: 24 }} />
              <SectionHeader title={`About ${pet.pet_name}`} style={{ marginBottom: 10 }} />
              <Text style={st.about}>{pet.description}</Text>
            </>
          ) : null}

          <Divider style={{ marginTop: 24, marginBottom: 8 }} />
          <TouchableOpacity
            onPress={() => actions.remove(pet, goBack)}
            activeOpacity={0.6}
            style={st.deleteRow}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={20} color={AC.danger} />
            <Text style={st.deleteText}>Delete listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[st.topButtons, { top: insets.top + 4 }]} pointerEvents="box-none">
        <CircleButton icon="chevron-back" label="Back" onPress={goBack} />
        <CircleButton icon="ellipsis-horizontal" label="More actions" onPress={() => setSheetOpen(true)} />
      </View>

      <ListingActionsSheet pet={sheetOpen ? pet : null} onClose={() => setSheetOpen(false)} actions={actions} onDeleted={goBack} />
    </View>
  );
}

function CircleButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={st.circleButton}
    >
      <Ionicons name={icon} size={icon === 'chevron-back' ? 22 : 20} color={AC.ink} />
    </TouchableOpacity>
  );
}

function ApplicantRow({ item, pet, last, onPress }: { item: any; pet: any; last: boolean; onPress: () => void }) {
  const status = requestStatus(item);
  const name = applicantName(item);
  const badge = status === 'pending' ? fitBadge(assessFit(item, pet)) : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[st.applicant, !last && st.applicantBorder]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <PersonAvatar name={name} uri={item.adopter_image} size={44} style={status === 'rejected' ? { opacity: 0.55 } : undefined} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.applicantName} numberOfLines={1}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
          {status === 'pending' && badge ? (
            <>
              <Ionicons
                name={badge.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={TONE_COLORS[badge.tone].fg}
              />
              <Text style={[st.applicantMeta, { fontFamily: FONTS.bodyBold, color: TONE_COLORS[badge.tone].fg }]}>{badge.label}</Text>
              <Text style={st.applicantMeta}>{`· ${timeAgo(item.created_at)}`}</Text>
            </>
          ) : status === 'pending' ? (
            <Text style={st.applicantMeta}>{`Waiting · ${timeAgo(item.created_at)}`}</Text>
          ) : status === 'approved' ? (
            <>
              <Text style={[st.applicantMeta, { fontFamily: FONTS.bodyBold, color: AC.success }]}>Approved</Text>
              <Text style={st.applicantMeta}>{`· ${formatShortDate(item.created_at)}`}</Text>
            </>
          ) : (
            <Text style={st.applicantMeta}>{`Declined · ${formatShortDate(item.created_at)}`}</Text>
          )}
        </View>
      </View>
      <Chevron />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: AC.surface },
  hero: { width: '100%', height: 380, backgroundColor: AC.fill },
  sheet: {
    marginTop: -28,
    backgroundColor: AC.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  topButtons: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AC.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { fontFamily: FONTS.body, fontSize: 13, color: AC.muted },
  name: { marginTop: 10, fontFamily: FONTS.heading, fontSize: 30, lineHeight: 36, color: AC.ink, letterSpacing: -0.5 },
  meta: { marginTop: 2, fontFamily: FONTS.body, fontSize: 15, lineHeight: 22, color: AC.muted },

  quickRow: { flexDirection: 'row', marginTop: 22 },
  quickAction: { width: '25%', alignItems: 'center', gap: 8 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AC.surface,
    borderWidth: 1,
    borderColor: AC.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: AC.ink },

  reviewNote: {
    marginTop: 24,
    padding: 14,
    borderRadius: 16,
    backgroundColor: AC.warningSoft,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reviewNoteText: { flex: 1, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.ink },

  body: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 21, color: AC.muted, marginTop: 4 },

  applicant: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  applicantBorder: { borderBottomWidth: 1, borderBottomColor: AC.divider },
  applicantName: { fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },
  applicantMeta: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailCell: { width: '50%', paddingRight: 16, marginBottom: 18 },
  detailLabel: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16, color: AC.muted },
  detailValue: { marginTop: 2, fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },

  about: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, color: AC.ink },

  deleteRow: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  deleteText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: AC.danger },
});

export default withFocusUnmount(ListingDetailScreen);
