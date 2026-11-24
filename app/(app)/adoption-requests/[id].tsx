// One adoption application, as the pet's owner sees it: who applied, how they
// match the pet's needs, their home and message, and approve / decline.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../../src/stores/petStore';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';
import { QueryErrorState } from '../../../src/components/ui/QueryErrorState';
import { FONTS } from '../../../src/constants/typography';
import { formatPhoneDisplay } from '../../../src/utils/phone';
import {
  AC,
  AdoptionSheet,
  Button,
  Card,
  Chevron,
  Chip,
  EmptyState,
  IconName,
  KeyValueCard,
  PersonAvatar,
  PetPhoto,
  SectionHeader,
} from '../../../src/components/adoption/ui';
import { showAdoptionError } from '../../../src/components/adoption/ListingActions';
import {
  applicantName,
  assessFit,
  boolLabel,
  firstName,
  fitBadge,
  FitRow,
  formatAgeShort,
  requestId,
  requestStatus,
  timeAgoInline,
} from '../../../src/utils/adoption';

const FIT_ICONS: Record<FitRow['key'], IconName> = {
  children: 'people-outline',
  pets: 'paw-outline',
  company: 'time-outline',
};

const NO_OTHER_PETS = /^\s*(no|none|nil|nothing|n\/?a)\b/i;

function AdoptionRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    adoptionRequests,
    myListings,
    adoptionRequestsError,
    fetchAdoptionRequests,
    fetchMyListings,
    updateApplicationStatus,
  } = usePetStore(
    useShallow((state) => ({
      adoptionRequests: state.adoptionRequests,
      myListings: state.myListings,
      adoptionRequestsError: state.adoptionRequestsError,
      fetchAdoptionRequests: state.fetchAdoptionRequests,
      fetchMyListings: state.fetchMyListings,
      updateApplicationStatus: state.updateApplicationStatus,
    }))
  );

  const item = adoptionRequests.find((r) => String(requestId(r)) === String(id));
  const pet = item ? myListings.find((p) => p.pet_id === item.pet_id) : undefined;
  const [loaded, setLoaded] = useState(!!item);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The other pending applicants as they were when the sheet opened: approving
  // declines them in the store, which would otherwise rewrite the sheet as it closes.
  const [confirmOthers, setConfirmOthers] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);

  // Opened from a notification, or the lists haven't loaded this session.
  const load = async () => {
    await Promise.all([fetchAdoptionRequests(), myListings.length ? null : fetchMyListings()]);
    setLoaded(true);
  };
  useEffect(() => {
    if (!item || !pet) load();
  }, [id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/adoption-requests'));

  if (!item) {
    return (
      <View style={[st.page, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={goBack} hitSlop={10} style={{ marginLeft: 16 }} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={AC.ink} />
        </TouchableOpacity>
        {!loaded ? (
          <ActivityIndicator color={AC.primary} style={{ marginTop: 120 }} />
        ) : adoptionRequestsError ? (
          <View style={{ paddingTop: 96 }}>
            <QueryErrorState error={adoptionRequestsError} fallbackMessage="We couldn't load this application." onRetry={load} />
          </View>
        ) : (
          <EmptyState
            icon="file-tray-outline"
            title="This application isn't here anymore"
            body="The applicant may have withdrawn it, or the listing was deleted."
          />
        )}
      </View>
    );
  }

  const status = requestStatus(item);
  const name = applicantName(item);
  const first = firstName(name);
  const petName = item.pet_name;
  const phone = item.contact_info;

  // Other pending applicants for the same pet: the arrows step through them,
  // and approving this one declines them.
  const pendingForPet = adoptionRequests.filter(
    (r) => r.pet_id === item.pet_id && requestStatus(r) === 'pending'
  );
  const index = pendingForPet.indexOf(item);
  const others = pendingForPet.filter((r) => r !== item);
  const showStepper = status === 'pending' && pendingForPet.length > 1;
  const goTo = (r: any) => router.setParams({ id: String(requestId(r)) });

  const fitRows = pet ? assessFit(item, pet) : [];
  const badge = fitRows.length ? fitBadge(fitRows) : null;
  const message = (item.additional_details || item.pet_description || '').trim();
  const otherPets = (item.other_pets_details || '').trim();
  const homeRows = [
    { label: 'Lives in', value: item.adopter_address || item.city_name },
    { label: 'Secure outdoor area', value: boolLabel(item.has_secure_outdoor_area) },
    { label: 'Pet will sleep', value: item.pet_sleep_location },
    {
      label: 'Other pets neutered',
      value: otherPets && !NO_OTHER_PETS.test(otherPets) ? boolLabel(item.other_pets_neutered) : '',
    },
  ];

  const call = () => phone && Linking.openURL(`tel:${formatPhoneDisplay(phone).e164 || phone}`);
  const whatsApp = () => {
    if (!phone) return;
    const digits = formatPhoneDisplay(phone).digits || String(phone).replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${digits}`);
  };

  const approve = async (choose: (action?: () => void) => void) => {
    setApproving(true);
    try {
      await updateApplicationStatus(requestId(item), 'adoption', 'approved');
      choose(() => {
        Toast.show({ type: 'success', text1: `${first} is approved for ${petName}`, text2: 'Get in touch to arrange the handover.' });
        goBack();
      });
    } catch (error) {
      showAdoptionError(error, "We couldn't approve this application. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const decline = () =>
    Alert.alert(`Decline ${first}'s application?`, `${first} gets a notification.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          const next = others[index] ?? others[others.length - 1];
          setDeclining(true);
          try {
            await updateApplicationStatus(requestId(item), 'adoption', 'rejected');
            Toast.show({ type: 'success', text1: `${first}'s application is declined` });
            if (next) goTo(next);
            else goBack();
          } catch (error) {
            showAdoptionError(error, "We couldn't decline this application. Please try again.");
          } finally {
            setDeclining(false);
          }
        },
      },
    ]);

  const statusChip =
    status === 'pending' ? (
      <Chip tone="warning" icon="time-outline" label="Waiting for your decision" />
    ) : status === 'approved' ? (
      <Chip tone="success" icon="checkmark-circle" label="Approved" />
    ) : (
      <Chip tone="neutral" icon="close-circle-outline" label="Declined" />
    );

  const footerHeight = status === 'pending' ? 76 + insets.bottom : 0;

  return (
    <View style={st.page}>
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={goBack} hitSlop={10} style={st.headerButton} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={AC.ink} />
        </TouchableOpacity>
        <View style={st.headerButton} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={st.headerTitle} accessibilityRole="header">Application</Text>
          <Text style={st.headerSubtitle}>
            {showStepper ? `${index + 1} of ${pendingForPet.length} waiting` : status === 'pending' ? 'Waiting' : status === 'approved' ? 'Approved' : 'Declined'}
          </Text>
        </View>
        {showStepper ? (
          <>
            <TouchableOpacity
              onPress={() => goTo(pendingForPet[index - 1])}
              disabled={index <= 0}
              style={st.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Previous application"
            >
              <Ionicons name="chevron-up" size={22} color={index <= 0 ? AC.faint : AC.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goTo(pendingForPet[index + 1])}
              disabled={index >= pendingForPet.length - 1}
              style={st.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Next application"
            >
              <Ionicons name="chevron-down" size={22} color={index >= pendingForPet.length - 1 ? AC.faint : AC.ink} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={st.headerButton} />
            <View style={st.headerButton} />
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: footerHeight + 32 }} showsVerticalScrollIndicator={false}>
        <Card style={st.applicantCard}>
          <PersonAvatar name={name} uri={item.adopter_image} size={84} />
          <Text style={st.applicantName}>{name}</Text>
          <Text style={st.applicantMeta}>
            {[`Applied ${timeAgoInline(item.created_at)}`, item.city_name].filter(Boolean).join(' · ')}
          </Text>
          <View style={{ marginTop: 12 }}>{statusChip}</View>
          <View style={st.contactRow}>
            <ContactTile icon="call-outline" label="Call" onPress={call} disabled={!phone} />
            <ContactTile icon="logo-whatsapp" label="WhatsApp" onPress={whatsApp} disabled={!phone} />
            <ContactTile
              icon="person-circle-outline"
              label="Profile"
              onPress={() => router.push(`/(app)/profile/${item.user_id}`)}
              disabled={!item.user_id}
            />
          </View>
        </Card>

        <Card
          onPress={() => router.push({ pathname: '/(app)/my-listings/[id]', params: { id: String(item.pet_id) } })}
          style={st.petRow}
          accessibilityLabel={`Applying to adopt ${petName}`}
        >
          <PetPhoto uri={pet?.image_url || item.image_url} size={52} radius={12} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.small}>Applying to adopt</Text>
            <Text style={st.rowTitle} numberOfLines={1}>{petName}</Text>
            {pet ? (
              <Text style={st.small} numberOfLines={1}>
                {[pet.pet_breed || pet.category, formatAgeShort(pet.age_months)].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
          <Chevron />
        </Card>

        {fitRows.length > 0 ? (
          <View style={st.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={st.sectionTitle} accessibilityRole="header">{`How ${first} matches`}</Text>
              {badge ? (
                <Chip
                  tone={badge.tone}
                  icon={badge.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  label={badge.label}
                  style={{ height: 26 }}
                />
              ) : null}
            </View>
            <Card style={{ overflow: 'hidden' }}>
              {fitRows.map((row, i) => (
                <View key={row.key}>
                  {i > 0 ? <View style={st.fitDivider} /> : null}
                  <View style={st.fitRow}>
                    <View style={st.fitIcon}>
                      <Ionicons name={FIT_ICONS[row.key]} size={18} color={AC.ink} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.rowTitle}>{row.title}</Text>
                      <Text style={st.small}>{`${petName}: ${row.pet}`}</Text>
                      <Text style={st.small}>{`${first}: ${row.them}`}</Text>
                    </View>
                    {row.verdict === 'fits' ? (
                      <Ionicons name="checkmark-circle" size={24} color={AC.success} accessibilityLabel="Matches" />
                    ) : row.verdict === 'check' ? (
                      <Ionicons name="alert-circle" size={24} color={AC.warning} accessibilityLabel="Worth checking" />
                    ) : (
                      <Text style={st.yourCall}>Your call</Text>
                    )}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {homeRows.some((r) => r.value) ? (
          <View style={st.section}>
            <SectionHeader title="Home" />
            <KeyValueCard rows={homeRows} />
          </View>
        ) : null}

        {message ? (
          <View style={st.section}>
            <SectionHeader title="Message" />
            <Card style={{ padding: 16 }}>
              <Text style={st.message}>{message}</Text>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {status === 'pending' ? (
        <View style={[st.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button label="Decline" variant="secondary" height={52} radius={14} loading={declining} disabled={approving} onPress={decline} style={{ flex: 1 }} />
          <Button
            label="Approve"
            height={52}
            radius={14}
            disabled={declining}
            onPress={() => {
              setConfirmOthers(others);
              setConfirmOpen(true);
            }}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      <AdoptionSheet visible={confirmOpen} onClose={() => setConfirmOpen(false)}>
        {(choose) => (
          <View style={{ paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
              <View style={st.ring}>
                <PetPhoto uri={pet?.image_url || item.image_url} size={64} radius={32} />
              </View>
              <View style={[st.ring, { marginLeft: -14 }]}>
                <PersonAvatar name={name} uri={item.adopter_image} size={64} />
              </View>
            </View>
            <Text style={st.confirmTitle}>{`Approve ${first} for ${petName}?`}</Text>
            <View style={{ marginTop: 18, gap: 14 }}>
              <Consequence
                icon="paw-outline"
                text={`${petName} is marked as adopted and comes off the adoption page.`}
              />
              {confirmOthers.length > 0 ? (
                <Consequence
                  icon="close-circle-outline"
                  text={
                    confirmOthers.length === 1
                      ? `${applicantName(confirmOthers[0])}'s pending application is declined.`
                      : `The ${confirmOthers.length} other pending applications are declined.`
                  }
                />
              ) : null}
              <Consequence
                icon="notifications-outline"
                text={
                  confirmOthers.length === 0
                    ? `${first} gets a notification.`
                    : confirmOthers.length === 1
                      ? `${first} and ${firstName(applicantName(confirmOthers[0]))} both get a notification.`
                      : `${first} and everyone else who applied get a notification.`
                }
              />
            </View>
            <Button
              label={`Approve ${first}`}
              height={52}
              radius={14}
              loading={approving}
              onPress={() => approve(choose)}
              style={{ marginTop: 24 }}
            />
            <Button
              label="Cancel"
              variant="neutral"
              height={52}
              radius={14}
              disabled={approving}
              onPress={() => choose()}
              style={{ marginTop: 10 }}
            />
          </View>
        )}
      </AdoptionSheet>
    </View>
  );
}

function ContactTile({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[st.contactTile, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name={icon} size={22} color={AC.primary} />
      <Text style={st.contactLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Consequence({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Ionicons name={icon} size={20} color={AC.primary} />
      <Text style={st.consequence}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: AC.page },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, backgroundColor: AC.page },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22, color: AC.ink },
  headerSubtitle: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16, color: AC.muted },

  applicantCard: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 22,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  applicantName: {
    marginTop: 12,
    fontFamily: FONTS.heading,
    fontSize: 22,
    lineHeight: 28,
    color: AC.ink,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  applicantMeta: { marginTop: 2, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted, textAlign: 'center' },
  contactRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 18 },
  contactTile: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AC.control,
    backgroundColor: AC.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  contactLabel: { fontFamily: FONTS.bodyBold, fontSize: 12, color: AC.primary },

  petRow: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },
  small: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18, color: AC.muted },

  section: { marginTop: 28, marginHorizontal: 20 },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22, color: AC.ink, letterSpacing: -0.2, flexShrink: 1 },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  fitDivider: { height: 1, backgroundColor: AC.divider, marginLeft: 66 },
  fitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: AC.fill, alignItems: 'center', justifyContent: 'center' },
  yourCall: { fontFamily: FONTS.bodyBold, fontSize: 12, color: AC.muted },
  message: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, color: AC.ink },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: AC.surface,
    borderTopWidth: 1,
    borderTopColor: AC.divider,
  },

  ring: { padding: 3, borderRadius: 35, backgroundColor: AC.surface },
  confirmTitle: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 26,
    color: AC.ink,
    letterSpacing: -0.3,
  },
  consequence: { flex: 1, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.ink },
});

export default withFocusUnmount(AdoptionRequestScreen);
