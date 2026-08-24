import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi, ExpressVetRequest } from '../../../../src/api/expressVet';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

const STATUS_LABELS: Record<ExpressVetRequest['status'], string> = {
  pending_dispatch: 'Pending — waiting for a dispatcher',
  claimed: 'Being confirmed — a dispatcher is calling you',
  assigned: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const CANCELLABLE_STATUSES: ExpressVetRequest['status'][] = ['pending_dispatch', 'claimed'];

export default function ExpressVetRequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id, justSubmitted } = useLocalSearchParams<{ id: string; justSubmitted?: string }>();

  const { data, isPending } = useQuery({
    queryKey: ['express-vet-request', id],
    queryFn: () => expressVetApi.getRequestDetail(id),
  });
  const request = data?.request;

  const cancelMutation = useMutation({
    mutationFn: () => expressVetApi.cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['express-vet-request', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-my-requests'] });
    },
    onError: () => Alert.alert('Something went wrong', 'Could not cancel this request. Please try again.'),
  });

  const handleCancel = () => {
    Alert.alert('Cancel this request?', 'This cannot be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel Request', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() =>
            // After a fresh submit, back history is the now-stale species/questionnaire/address
            // screens from the form — jumping straight to Pets avoids walking back through those.
            justSubmitted === '1'
              ? router.replace('/(app)/pets')
              : router.canGoBack()
                ? router.back()
                : router.replace('/(app)/express-vet/requests')
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Request Details</Text>
        </View>
      </View>

      {isPending || !request ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {justSubmitted === '1' && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#1E7A34" />
                <Text style={styles.successBannerText}>
                  Request sent! Our team will call you shortly to confirm details and price.
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardIcon}>
                  <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[request.category] ?? 'paw'} size={22} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryLabel}>{request.category.replace('_', ' ')}</Text>
                  <Text style={styles.statusLabel}>{STATUS_LABELS[request.status]}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Row label="Address" value={request.address_line} />
              {!!request.address_landmark && <Row label="Landmark" value={request.address_landmark} />}
              {!!request.maps_link && <Row label="Maps Link" value={request.maps_link} />}
              <Row label="Contact" value={request.contact_phone} />
              {!!request.scheduled_at && (
                <Row
                  label="Visit time"
                  value={new Date(request.scheduled_at).toLocaleString('en-PK', {
                    timeZone: 'Asia/Karachi',
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                />
              )}
              <Row
                label={request.status === 'completed' ? 'Total bill' : 'Price'}
                value={
                  request.final_price_pkr != null
                    ? `PKR ${request.final_price_pkr.toLocaleString()}${request.status === 'completed' ? '' : ' (confirmed)'}`
                    : `From PKR ${request.starting_price_pkr.toLocaleString()} (estimate)`
                }
              />
            </View>

            {request.status === 'assigned' || request.status === 'completed' ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Provider</Text>
                <View style={styles.providerRow}>
                  {request.provider_photo_url ? (
                    <Image source={{ uri: request.provider_photo_url }} style={styles.providerPhoto} contentFit="cover" />
                  ) : (
                    <View style={[styles.providerPhoto, styles.providerPhotoFallback]}>
                      <Ionicons name="person" size={20} color="#B0B7C3" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{request.provider_name}</Text>
                    {request.provider_years_experience != null && (
                      <Text style={styles.providerMeta}>{request.provider_years_experience} yrs experience</Text>
                    )}
                    {request.provider_rating != null && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="star" size={13} color="#F5A623" />
                        <Text style={styles.providerMeta}>{request.provider_rating}</Text>
                      </View>
                    )}
                  </View>
                  {!!request.provider_phone_number && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => Linking.openURL(`tel:${request.provider_phone_number}`)}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                      <Text style={styles.contactButtonText}>Contact</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!request.provider_qualifications && (
                  <Text style={styles.providerQualifications}>{request.provider_qualifications}</Text>
                )}
              </View>
            ) : null}
          </ScrollView>

          {(justSubmitted === '1' || CANCELLABLE_STATUSES.includes(request.status)) && (
            <View style={[styles.bottom, { paddingBottom: insets.bottom + 16, gap: 8 }]}>
              {justSubmitted === '1' && (
                <PaltuuButton label="Back to Pets" onPress={() => router.replace('/(app)/pets')} radius={26} />
              )}
              {CANCELLABLE_STATUSES.includes(request.status) && (
                <TouchableOpacity onPress={handleCancel} disabled={cancelMutation.isPending} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Request'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {request.status === 'completed' && request.review_rating == null && (
            <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
              <PaltuuButton
                label="Rate this visit"
                onPress={() =>
                  router.push({ pathname: '/(app)/express-vet/requests/[id]/rate', params: { id } } as any)
                }
                radius={26}
              />
            </View>
          )}
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

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F4EA',
    borderRadius: 14,
    padding: 14,
  },
  successBannerText: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#1E7A34',
    lineHeight: 17,
  },

  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: DARK, textTransform: 'capitalize' },
  statusLabel: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#8A8A94' },

  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontFamily: FONTS.body, fontSize: 13, color: '#8A8A94' },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK, flex: 1, textAlign: 'right' },

  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerPhoto: { width: 48, height: 48, borderRadius: 24 },
  providerPhotoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  providerName: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK },
  providerMeta: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94' },
  providerQualifications: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 10, lineHeight: 17 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  contactButtonText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: '#FFFFFF' },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#B3261E',
  },
});
