import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { usePetStore } from '../../src/stores/petStore';
import { petApi } from '../../src/api/pets';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import { FONTS } from '../../src/constants/typography';
import { formatPhoneDisplay } from '../../src/utils/phone';
import { showApiErrorAlert } from '../../src/utils/apiError';
import {
  AC,
  AdoptionSheet,
  Button,
  Card,
  Chevron,
  Chip,
  EmptyState,
  KeyValueCard,
  PetPhoto,
  RowCard,
  RowsSkeleton,
  ScreenHeader,
  SectionHeader,
  SheetRow,
  StepProgress,
} from '../../src/components/adoption/ui';
import { boolLabel, formatAgeShort, formatShortDate, requestStatus } from '../../src/utils/adoption';

// The app doesn't offer fostering, but /applications/my still returns any old
// foster applications, and withdrawing one has to name the right table.
const kindOf = (a: any): 'adoption' | 'foster' => (a.application_type === 'foster' ? 'foster' : 'adoption');
const keyOf = (a: any) => `${kindOf(a)}-${a.application_id}`;
const isHomed = (a: any) => a.adoption_status === 'adopted';

function MyApplicationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { myApplications, myApplicationsError, fetchMyApplications, withdrawApplication } = usePetStore(
    useShallow((state) => ({
      myApplications: state.myApplications,
      myApplicationsError: state.myApplicationsError,
      fetchMyApplications: state.fetchMyApplications,
      withdrawApplication: state.withdrawApplication,
    }))
  );
  const [loaded, setLoaded] = useState(myApplications.length > 0);
  // True once this visit's first load has finished (the store may hold an older list).
  const [fresh, setFresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Keyed rather than a copy, so the sheet shows the latest status after a refresh.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = selectedKey ? myApplications.find((a) => keyOf(a) === selectedKey) ?? null : null;
  const [contact, setContact] = useState<{ petName: string; phone: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    await fetchMyApplications();
    setLoaded(true);
    setFresh(true);
  }, [fetchMyApplications]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // An "approved / not approved" notification or the in-app prompt opens this
  // screen with the application's id: show it once the list has it, then drop
  // the param so it doesn't reopen when the screen remounts.
  const { applicationId } = useLocalSearchParams<{ applicationId?: string }>();
  useEffect(() => {
    if (!applicationId || !fresh) return;
    const match = myApplications.find((a) => kindOf(a) === 'adoption' && String(a.application_id) === String(applicationId));
    router.setParams({ applicationId: '' });
    if (match) setSelectedKey(keyOf(match));
  }, [applicationId, fresh, myApplications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'));

  const { active, past } = useMemo(() => {
    const sorted = [...myApplications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return {
      active: sorted.filter((a) => requestStatus(a) !== 'rejected'),
      past: sorted.filter((a) => requestStatus(a) === 'rejected'),
    };
  }, [myApplications]);

  const approvedCount = active.filter((a) => requestStatus(a) === 'approved').length;
  const reviewCount = active.length - approvedCount;
  const subtitle =
    [approvedCount ? `${approvedCount} approved` : null, reviewCount ? `${reviewCount} in review` : null]
      .filter(Boolean)
      .join(' · ') || "Pets you've applied to adopt";

  const openPet = (a: any) => router.push({ pathname: '/(app)/pet-details', params: { id: a.pet_id } });

  const contactOwner = async (a: any) => {
    setBusy(`contact:${keyOf(a)}`);
    try {
      const pet = await petApi.getPetDetails(a.pet_id);
      const phone = pet?.contact_number;
      if (!phone) {
        Alert.alert('No phone number', "The owner hasn't added a phone number to this listing.");
        return;
      }
      setContact({ petName: a.pet_name, phone });
    } catch (error) {
      showApiErrorAlert(error, "We couldn't load the owner's contact details. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const withdraw = (a: any) =>
    Alert.alert(`Withdraw your application for ${a.pet_name}?`, "The owner won't see it anymore.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setBusy(`withdraw:${keyOf(a)}`);
          try {
            await withdrawApplication(a.application_id, kindOf(a));
            Toast.show({ type: 'success', text1: 'Application withdrawn' });
          } catch (error) {
            showApiErrorAlert(error, "We couldn't withdraw your application. Please try again.");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  let body: React.ReactNode;
  if (!loaded && myApplications.length === 0) {
    body = <RowsSkeleton />;
  } else if (myApplications.length === 0 && myApplicationsError) {
    body = (
      <View style={{ paddingTop: 96 }}>
        <QueryErrorState error={myApplicationsError} fallbackMessage="We couldn't load your applications." onRetry={load} />
      </View>
    );
  } else if (myApplications.length === 0) {
    body = (
      <EmptyState
        icon="heart-outline"
        title="No applications yet"
        body="When you apply to adopt a pet, you can follow it here."
        action={{ label: 'Browse pets', onPress: () => router.push('/(app)/adopt') }}
      />
    );
  } else {
    body = (
      <>
        {active.length > 0 ? (
          <View style={[st.section, { marginTop: 20 }]}>
            <SectionHeader title="Active" />
            <View style={{ gap: 16 }}>
              {active.map((a) => (
                <ActiveApplicationCard
                  key={keyOf(a)}
                  item={a}
                  onOpenPet={() => openPet(a)}
                  onAnswers={() => setSelectedKey(keyOf(a))}
                  onContact={() => contactOwner(a)}
                  onWithdraw={() => withdraw(a)}
                  contactLoading={busy === `contact:${keyOf(a)}`}
                  withdrawing={busy === `withdraw:${keyOf(a)}`}
                />
              ))}
            </View>
          </View>
        ) : null}

        {past.length > 0 ? (
          <View style={[st.section, active.length === 0 && { marginTop: 20 }]}>
            <SectionHeader title="Past" />
            <View style={{ gap: 12 }}>
              {past.map((a) => (
                <RowCard
                  key={keyOf(a)}
                  image={a.image_url}
                  title={a.pet_name}
                  subtitle={isHomed(a) ? `Not selected · ${a.pet_name} found a home` : 'Not selected'}
                  onPress={() => setSelectedKey(keyOf(a))}
                />
              ))}
            </View>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={st.page}>
      <ScreenHeader title="My Applications" subtitle={subtitle} onBack={goBack} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AC.primary} colors={[AC.primary]} />
        }
      >
        {body}
      </ScrollView>

      <AnswersModal
        item={selected}
        onClose={() => setSelectedKey(null)}
        onOpenPet={(a) => {
          setSelectedKey(null);
          openPet(a);
        }}
      />

      <AdoptionSheet visible={!!contact} onClose={() => setContact(null)}>
        {(choose) =>
          contact ? (
            <View>
              <Text style={st.sheetTitle}>{`Contact ${contact.petName}'s owner`}</Text>
              <Text style={st.sheetSubtitle}>{formatPhoneDisplay(contact.phone).pretty || contact.phone}</Text>
              <View style={{ marginTop: 8 }}>
                <SheetRow
                  icon="logo-whatsapp"
                  label="WhatsApp"
                  onPress={() =>
                    choose(() => {
                      const digits = formatPhoneDisplay(contact.phone).digits || String(contact.phone).replace(/\D/g, '');
                      Linking.openURL(`https://wa.me/${digits}`);
                    })
                  }
                />
                <SheetRow
                  icon="call-outline"
                  label="Call"
                  onPress={() =>
                    choose(() => Linking.openURL(`tel:${formatPhoneDisplay(contact.phone).e164 || contact.phone}`))
                  }
                />
              </View>
              <Button label="Cancel" variant="neutral" radius={14} onPress={() => choose()} style={{ marginTop: 14 }} />
            </View>
          ) : null
        }
      </AdoptionSheet>
    </View>
  );
}

function ActiveApplicationCard({
  item,
  onOpenPet,
  onAnswers,
  onContact,
  onWithdraw,
  contactLoading,
  withdrawing,
}: {
  item: any;
  onOpenPet: () => void;
  onAnswers: () => void;
  onContact: () => void;
  onWithdraw: () => void;
  contactLoading: boolean;
  withdrawing: boolean;
}) {
  const approved = requestStatus(item) === 'approved';
  const petLine = [item.breed, formatAgeShort(item.age_months), item.city_name].filter(Boolean).join(' · ');
  const color = approved ? AC.success : AC.warning;

  return (
    <Card style={{ borderRadius: 22, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onOpenPet}
        activeOpacity={0.7}
        style={st.cardTop}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.pet_name}`}
      >
        <PetPhoto uri={item.image_url} size={72} radius={16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.petName} numberOfLines={1}>{item.pet_name}</Text>
          {petLine ? <Text style={st.petLine} numberOfLines={1}>{petLine}</Text> : null}
          <Text style={st.small}>{`Sent ${formatShortDate(item.created_at)}`}</Text>
        </View>
        <Chevron />
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 16, paddingBottom: approved ? 0 : 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={approved ? 'checkmark-circle' : 'time'} size={22} color={color} />
          <Text style={[st.statusText, { color }]}>{approved ? 'Approved' : 'In review'}</Text>
        </View>
        <Text style={st.statusBody}>
          {approved
            ? 'The owner would like to meet you. Get in touch to arrange a visit.'
            : "The owner hasn't decided yet. You'll get a notification when they do."}
        </Text>
        <StepProgress
          labels={approved ? ['Sent', 'Reviewed', 'Approved'] : ['Sent', 'In review', 'Decision']}
          current={approved ? 2 : 1}
          color={color}
        />
      </View>

      {approved ? (
        <View style={{ padding: 16 }}>
          <Button label="Contact owner" icon="call-outline" loading={contactLoading} onPress={onContact} />
        </View>
      ) : (
        <>
          <TouchableOpacity onPress={onAnswers} activeOpacity={0.6} style={st.cardRow} accessibilityRole="button">
            <Ionicons name="document-text-outline" size={20} color={AC.ink} />
            <Text style={[st.cardRowText, { flex: 1 }]}>Your answers</Text>
            <Chevron />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onWithdraw}
            disabled={withdrawing}
            activeOpacity={0.6}
            style={[st.cardRow, withdrawing && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={20} color={AC.danger} />
            <Text style={[st.cardRowText, { color: AC.danger }]}>{withdrawing ? 'Withdrawing…' : 'Withdraw application'}</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

function AnswersModal({
  item,
  onClose,
  onOpenPet,
}: {
  item: any | null;
  onClose: () => void;
  onOpenPet: (item: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const status = item ? requestStatus(item) : 'pending';
  return (
    <Modal
      visible={!!item}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {item ? (
        <SafeAreaView style={st.page} edges={['top', 'left', 'right']}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle} accessibilityRole="header">Your application</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={AC.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Card style={st.modalPet}>
              <PetPhoto uri={item.image_url} size={52} radius={12} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.small}>You applied for</Text>
                <Text style={st.rowTitle} numberOfLines={1}>{item.pet_name}</Text>
              </View>
              {status === 'approved' ? (
                <Chip tone="success" label="Approved" />
              ) : status === 'rejected' ? (
                <Chip tone="neutral" label="Not selected" />
              ) : (
                <Chip tone="warning" label="In review" />
              )}
            </Card>

            <SectionHeader title="About you" style={{ marginTop: 28 }} />
            <KeyValueCard
              rows={[
                { label: 'Sent', value: formatShortDate(item.created_at) },
                { label: 'Name', value: item.adopter_name },
                { label: 'Address', value: item.adopter_address },
                {
                  label: 'Phone',
                  value: item.contact_number ? formatPhoneDisplay(item.contact_number).pretty || item.contact_number : '',
                },
              ]}
            />

            <SectionHeader title="Your home" style={{ marginTop: 28 }} />
            <KeyValueCard
              rows={[
                { label: 'Youngest child', value: item.age_of_youngest_child ? String(item.age_of_youngest_child) : '' },
                { label: 'Other pets', value: item.other_pets_details },
                { label: 'Other pets neutered', value: boolLabel(item.other_pets_neutered) },
                { label: 'Secure outdoor area', value: boolLabel(item.has_secure_outdoor_area) },
                { label: 'Pet will sleep', value: item.pet_sleep_location },
                { label: 'Left alone', value: item.pet_left_alone },
              ]}
            />

            {item.additional_details ? (
              <>
                <SectionHeader title="Your message" style={{ marginTop: 28 }} />
                <Card style={{ padding: 16 }}>
                  <Text style={st.message}>{item.additional_details}</Text>
                </Card>
              </>
            ) : null}
          </ScrollView>
          <View style={[st.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <Button label={`View ${item.pet_name}`} variant="secondary" onPress={() => onOpenPet(item)} />
          </View>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: AC.page },
  section: { marginTop: 28, paddingHorizontal: 20 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  petName: { fontFamily: FONTS.heading, fontSize: 20, lineHeight: 26, color: AC.ink, letterSpacing: -0.3 },
  petLine: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted },
  small: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 16, color: AC.muted },
  statusText: { fontFamily: FONTS.heading, fontSize: 16, lineHeight: 22 },
  statusBody: { marginTop: 4, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted },
  cardRow: {
    height: 52,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: AC.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardRowText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: AC.ink },

  sheetTitle: { marginTop: 12, fontFamily: FONTS.heading, fontSize: 18, lineHeight: 24, color: AC.ink },
  sheetSubtitle: { marginTop: 2, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20, color: AC.muted },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AC.cardBorder,
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: 20, color: AC.ink },
  modalPet: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, lineHeight: 20, color: AC.ink },
  message: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 23, color: AC.ink },
  modalFooter: {
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: AC.surface,
    borderTopWidth: 1,
    borderTopColor: AC.divider,
  },
});

export default withFocusUnmount(MyApplicationsScreen);
