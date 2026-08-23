import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../../src/api/expressVet';
import { useLocationStore } from '../../../../src/stores/locationStore';
import { useExpressVetDraftStore } from '../../../../src/stores/expressVetDraftStore';
import { EXPRESS_VET_SPECIES_LABELS, GROOMING_SUB_SERVICE_LABELS } from '../../../../src/constants/expressVet';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function ExpressVetReviewAndSubmitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { category, species, sub_service } = useLocalSearchParams<{ category: string; species: string; sub_service?: string }>();
  const { cityId, latitude, longitude } = useLocationStore();
  const draft = useExpressVetDraftStore();

  const [acknowledged, setAcknowledged] = useState(false);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const categoryConfig = config?.categories.find((c) => c.key === category);
  const rateCard = (config?.rate_cards ?? []).find(
    (rc) =>
      rc.category === category &&
      rc.species === species &&
      rc.city_id === cityId &&
      (rc.sub_service ?? null) === (sub_service ?? null)
  );

  const submitMutation = useMutation({
    mutationFn: () =>
      expressVetApi.createRequest({
        category,
        species,
        sub_service: sub_service ?? null,
        city_id: cityId!,
        questionnaire_answers: draft.questionnaireAnswers,
        address_line: draft.addressLine,
        address_landmark: draft.addressLandmark || null,
        latitude,
        longitude,
        contact_phone: draft.contactPhone,
      }),
    onSuccess: ({ request }) => {
      draft.reset();
      queryClient.invalidateQueries({ queryKey: ['express-vet-my-requests'] });
      router.replace({
        pathname: '/(app)/express-vet/requests/[id]',
        params: { id: request.request_id, justSubmitted: '1' },
      } as any);
    },
    onError: () => {
      Alert.alert('Something went wrong', 'Could not submit your request. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!cityId) {
      Alert.alert('Location needed', 'We need your location to submit this request.');
      return;
    }
    if (!acknowledged) {
      Alert.alert('Please confirm', 'Please acknowledge the pricing disclaimer to continue.');
      return;
    }
    submitMutation.mutate();
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
          <Text style={styles.title}>Review & Submit</Text>
          <Text style={styles.subtitle}>Double-check before you send this</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Row label="Service" value={categoryConfig?.label ?? category} />
              {!!sub_service && <Row label="Package" value={GROOMING_SUB_SERVICE_LABELS[sub_service] ?? sub_service} />}
              <Row label="For" value={EXPRESS_VET_SPECIES_LABELS[species] ?? species} />
              <Row label="Address" value={draft.addressLine} />
              {!!draft.addressLandmark && <Row label="Landmark" value={draft.addressLandmark} />}
              <Row label="Contact" value={draft.contactPhone} />
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceValue}>
                {rateCard ? `PKR ${rateCard.starting_price_pkr.toLocaleString()}` : 'Pricing unavailable'}
              </Text>
              <Text style={styles.priceDisclaimer}>
                This is a starting estimate. Your final price will be confirmed by our team on a quick call
                before your appointment.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.ackRow}
              onPress={() => setAcknowledged((v) => !v)}
            >
              <Ionicons
                name={acknowledged ? 'checkbox' : 'square-outline'}
                size={22}
                color={acknowledged ? PRIMARY : '#D1D5DB'}
              />
              <Text style={styles.ackText}>
                I understand the price above is a starting estimate and will be confirmed before my appointment.
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
            <PaltuuButton
              label="Submit Request"
              successLabel="Request sent!"
              onPress={handleSubmit}
              loading={submitMutation.isPending}
              radius={26}
            />
          </View>
        </>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontFamily: FONTS.body, fontSize: 13, color: '#8A8A94' },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK, flex: 1, textAlign: 'right' },

  priceCard: {
    borderRadius: 16,
    backgroundColor: '#FAF0F2',
    padding: 16,
    gap: 6,
  },
  priceLabel: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94' },
  priceValue: { fontFamily: FONTS.heading, fontSize: 24, color: PRIMARY },
  priceDisclaimer: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', lineHeight: 17, marginTop: 4 },

  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ackText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
});
