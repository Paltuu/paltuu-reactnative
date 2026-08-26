import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi } from '../../../../src/api/expressVetDispatch';
import { expressVetApi, ExpressVetQuestionnaireField } from '../../../../src/api/expressVet';
import { useAuthStore } from '../../../../src/stores/authStore';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';
import { showApiErrorAlert } from '../../../../src/utils/apiError';
import { COLORS } from '../../../../src/constants/colors';
import { FONTS } from '../../../../src/constants/typography';
import { dismissAllExpressVetAlerts } from '../../../../src/services/androidDispatchAlert';

const H_PAD = 20;

function formatAnswer(field: ExpressVetQuestionnaireField | undefined, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field?.type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

function resolveFields(
  schema: Record<string, any> | undefined,
  category: string,
  species: string
): ExpressVetQuestionnaireField[] {
  const categorySchema = schema?.[category];
  if (!categorySchema) return [];
  if (Array.isArray(categorySchema.fields)) return categorySchema.fields;
  return categorySchema[species]?.fields ?? [];
}

export default function ExpressVetDispatchRequestDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-dispatch-request', id],
    queryFn: () => expressVetDispatchApi.getRequestDetail(id),
  });
  const request = data?.request;

  const { data: config } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const fields = request ? resolveFields(config?.questionnaires.schema, request.category, request.species) : [];

  const claimMutation = useMutation({
    mutationFn: () => expressVetDispatchApi.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-request', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-inbox'] });
      // This screen is also where the separate generic push notification deep-links
      // straight to (bypassing incoming-alert.tsx and its own alertId-scoped dismiss
      // entirely), so without this the full-screen ring notification was left looping
      // forever whenever a dispatcher claimed from here instead.
      if (Platform.OS === 'android') dismissAllExpressVetAlerts();
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        Alert.alert('Already claimed', 'Another dispatcher claimed this request first.');
        router.back();
      } else {
        showApiErrorAlert(err, 'Could not claim this request. Please try again.');
      }
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => expressVetDispatchApi.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-request', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-inbox'] });
      router.back();
    },
    onError: (err) => showApiErrorAlert(err, 'Could not release this request. Please try again.'),
  });

  const completeMutation = useMutation({
    mutationFn: () => expressVetDispatchApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-request', id] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-dispatch-jobs'] });
    },
    onError: (err) => showApiErrorAlert(err, 'Could not mark this job complete. Please try again.'),
  });

  const isAdmin = currentUser?.role === 'admin';
  const isMine = request && currentUser && Number(request.claimed_by_dispatcher_id) === Number(currentUser.id);
  const canComplete =
    request && currentUser && (isAdmin || Number(request.assigned_by_dispatcher_id) === Number(currentUser.id));

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() =>
            // Once completed, back history may include the now-stale assign screen (claim -> assign
            // -> back here) — jump straight to the console instead of walking back through it.
            request?.status === 'completed'
              ? router.replace('/(app)/express-vet-dispatch' as any)
              : router.canGoBack()
                ? router.back()
                : router.replace('/(app)/express-vet-dispatch')
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Case Details</Text>
        </View>
      </View>

      {isError ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load this request. Please try again."
          onRetry={() => refetch()}
        />
      ) : isPending || !request ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.clientRow}>
                {request.client_photo_url ? (
                  <Image source={{ uri: request.client_photo_url }} style={styles.clientPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.clientPhoto, styles.clientPhotoFallback]}>
                    <Ionicons name="person" size={22} color={COLORS.textPlaceholder} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{request.client_name}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${request.contact_phone}`)}>
                    <Text style={styles.clientPhone}>{request.contact_phone}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${request.contact_phone}`)}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[request.category] ?? 'paw'} size={20} color={COLORS.primary} />
                <Text style={styles.categoryLabel}>
                  {request.category.replace('_', ' ')} — {request.species}
                </Text>
              </View>
              <Row label="Address" value={request.address_line} />
              {!!request.address_landmark && <Row label="Landmark" value={request.address_landmark} />}
              {/* The whole point of collecting this is one-tap navigation for whoever's
                  going out — a plain text row would make them copy-paste a URL by hand. */}
              {!!request.maps_link && (
                <TouchableOpacity style={styles.mapsLinkRow} onPress={() => Linking.openURL(request.maps_link!)}>
                  <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
                </TouchableOpacity>
              )}
              <Row label="Starting price" value={`PKR ${request.starting_price_pkr.toLocaleString()}`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Questionnaire</Text>
              {fields.map((field) => {
                const answer = request.questionnaire_answers?.[field.key];
                // Photo answers are stored as S3 URLs (see the client's questionnaire.tsx
                // PhotoField) — render the actual image, since a raw URL string in a Row is
                // useless to the dispatcher triaging the case. Tap opens it full-size.
                if (field.type === 'photo' && typeof answer === 'string' && answer) {
                  return (
                    <View key={field.key} style={{ gap: 6 }}>
                      <Text style={styles.rowLabel}>{field.label}</Text>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL(answer)}>
                        <Image source={{ uri: answer }} style={styles.answerPhoto} contentFit="cover" />
                      </TouchableOpacity>
                    </View>
                  );
                }
                return <Row key={field.key} label={field.label} value={formatAnswer(field, answer)} />;
              })}
            </View>

            {(request.status === 'assigned' || request.status === 'completed') && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Provider</Text>
                <View style={styles.clientRow}>
                  {request.provider_photo_url ? (
                    <Image source={{ uri: request.provider_photo_url }} style={styles.clientPhoto} contentFit="cover" />
                  ) : (
                    <View style={[styles.clientPhoto, styles.clientPhotoFallback]}>
                      <Ionicons name="person" size={20} color={COLORS.textPlaceholder} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{request.provider_name}</Text>
                    <Text style={styles.rowLabel}>PKR {request.final_price_pkr?.toLocaleString()} confirmed</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
            {request.status === 'pending_dispatch' && (
              <PaltuuButton
                label="Claim Request"
                onPress={() => claimMutation.mutate()}
                loading={claimMutation.isPending}
                radius={26}
              />
            )}
            {request.status === 'claimed' && (isMine || isAdmin) && (
              <View style={{ gap: 8 }}>
                <PaltuuButton
                  label="Assign Provider"
                  onPress={() =>
                    router.push({ pathname: '/(app)/express-vet-dispatch/requests/[id]/assign', params: { id } } as any)
                  }
                  radius={26}
                />
                <TouchableOpacity
                  onPress={() => releaseMutation.mutate()}
                  disabled={releaseMutation.isPending}
                  style={styles.releaseButton}
                >
                  <Text style={styles.releaseButtonText}>
                    {releaseMutation.isPending ? 'Releasing…' : 'Release back to pool'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {request.status === 'claimed' && !isMine && !isAdmin && (
              <Text style={styles.claimedByOther}>Claimed by another dispatcher.</Text>
            )}
            {request.status === 'assigned' && canComplete && (
              <PaltuuButton
                label="Mark Complete"
                onPress={() => completeMutation.mutate()}
                loading={completeMutation.isPending}
                radius={26}
              />
            )}
            {request.status === 'completed' && (
              <PaltuuButton
                label="Back to Dispatch Console"
                onPress={() => router.replace('/(app)/express-vet-dispatch' as any)}
                radius={26}
              />
            )}
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
      <Text style={styles.rowValue} numberOfLines={3}>
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
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },

  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textDark, textTransform: 'capitalize' },

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientPhoto: { width: 52, height: 52, borderRadius: 26 },
  clientPhotoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  clientName: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.textDark },
  clientPhone: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary, marginTop: 2 },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textMuted },
  answerPhoto: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#F3F4F6' },
  mapsLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  mapsLinkText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, flex: 1 },
  rowValue: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark, flex: 1, textAlign: 'right' },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
  releaseButton: { alignItems: 'center', paddingVertical: 14 },
  releaseButtonText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#B3261E' },
  claimedByOther: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
