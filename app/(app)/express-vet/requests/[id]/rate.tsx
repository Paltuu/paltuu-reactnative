import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi, EXPRESS_VET_ADDON_REASON_TAGS } from '../../../../../src/api/expressVet';
import PaltuuButton from '../../../../../src/components/ui/PaltuuButton';
import { useKeyboardVisible } from '../../../../../src/hooks/useKeyboardVisible';
import { FONTS } from '../../../../../src/constants/typography';
import { COLORS } from '../../../../../src/constants/colors';
import { QueryErrorState } from '../../../../../src/components/ui/QueryErrorState';
import { showApiErrorAlert } from '../../../../../src/utils/apiError';

const H_PAD = 20;

function StarPicker({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={rating >= i ? 'star' : 'star-outline'} size={36} color="#F5A623" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function YesNoPill({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['Yes', 'No'] as const).map((opt) => {
          const boolValue = opt === 'Yes';
          const active = value === boolValue;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(boolValue)}
              style={[styles.yesNoPill, active && styles.yesNoPillActive]}
            >
              <Text style={[styles.yesNoPillText, active && styles.yesNoPillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ExpressVetRateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const keyboardVisible = useKeyboardVisible();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-request', id],
    queryFn: () => expressVetApi.getRequestDetail(id),
  });
  const request = data?.request;

  const [rating, setRating] = useState(0);
  const [wasOnTime, setWasOnTime] = useState<boolean | null>(null);
  const [priceAsAgreed, setPriceAsAgreed] = useState<boolean | null>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [showAddon, setShowAddon] = useState(false);
  const [addonTags, setAddonTags] = useState<string[]>([]);
  const [addonTotal, setAddonTotal] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleAddonTag = (tag: string) => {
    setAddonTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      expressVetApi.submitReview(id, {
        rating,
        was_on_time: wasOnTime,
        price_as_agreed: priceAsAgreed,
        review_content: reviewContent.trim() || null,
        addon_reason_tags: showAddon ? addonTags : [],
        addon_total_pkr: showAddon && addonTotal ? Number(addonTotal) : null,
      }),
    onSuccess: () => {
      setSubmitted(true);
      // The persistent booking bar (see (tabs)/_layout.tsx) treats a completed-and-reviewed
      // request as closed out — refresh its query so it disappears immediately instead of
      // waiting for its 30s polling interval.
      queryClient.invalidateQueries({ queryKey: ['express-vet-my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['express-vet-request', id] });
    },
    onError: (err) => showApiErrorAlert(err, 'Could not submit your rating. Please try again.'),
  });

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select a star rating.');
      return;
    }
    submitMutation.mutate();
  };

  if (submitted) {
    return (
      <View style={styles.root}>
        <View style={styles.centerFill}>
          <View style={styles.successIcon}>
            <Ionicons name="heart" size={34} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>Thanks for rating!</Text>
          <Text style={styles.successText}>Your feedback helps us keep Vets at Home reliable.</Text>
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          {/* This screen is a card pushed on top of the booking-detail fullScreenModal
              (see [id].tsx). `replace` would only swap this card and leave that modal
              mounted, rendering the Pets tab inside a modal container — dismissTo pops the
              whole stack back to the real tabs and selects Pets. */}
          <PaltuuButton label="Back to Pets" onPress={() => router.dismissTo('/(app)/pets')} radius={26} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/(app)/pets'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rate Your Visit</Text>
          {!!request?.provider_name && <Text style={styles.subtitle}>with {request.provider_name}</Text>}
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError ? (
        <QueryErrorState error={error} fallbackMessage="Could not load this request." onRetry={refetch} />
      ) : !request ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 24, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {request.final_price_pkr != null && (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total bill</Text>
                <Text style={styles.totalValue}>PKR {request.final_price_pkr.toLocaleString()}</Text>
              </View>
            )}

            <StarPicker rating={rating} onChange={setRating} />

            <View style={{ gap: 10 }}>
              <YesNoPill label="Was the provider on time?" value={wasOnTime} onChange={setWasOnTime} />
              <YesNoPill label="Was the price as agreed?" value={priceAsAgreed} onChange={setPriceAsAgreed} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>
                Anything else? <Text style={styles.optionalTag}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={reviewContent}
                onChangeText={setReviewContent}
                placeholder="Tell us about your experience…"
                placeholderTextColor={COLORS.textPlaceholder}
                multiline
              />
            </View>

            {!showAddon ? (
              <TouchableOpacity style={styles.addAddonRow} onPress={() => setShowAddon(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.addAddonText}>Was there any extra charge during the visit?</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.fieldLabel}>Extra charge details</Text>
                  <TouchableOpacity onPress={() => { setShowAddon(false); setAddonTags([]); setAddonTotal(''); }}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textPlaceholder} />
                  </TouchableOpacity>
                </View>
                <View style={styles.tagGrid}>
                  {EXPRESS_VET_ADDON_REASON_TAGS.map((tag) => {
                    const active = addonTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagChip, active && styles.tagChipActive]}
                        onPress={() => toggleAddonTag(tag)}
                      >
                        <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  value={addonTotal}
                  onChangeText={setAddonTotal}
                  placeholder="Total extra amount paid, PKR"
                  placeholderTextColor={COLORS.textPlaceholder}
                  keyboardType="number-pad"
                />
              </View>
            )}
          </ScrollView>

          {/* Drops the home-indicator inset while the keyboard is up — see address.tsx. */}
          <View style={[styles.bottom, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16 }]}>
            <PaltuuButton
              label="Submit Rating"
              onPress={handleSubmit}
              loading={submitMutation.isPending}
              radius={26}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },

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
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  totalCard: {
    borderRadius: 16,
    backgroundColor: '#FAF0F2',
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  totalValue: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.primary },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark },
  optionalTag: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textPlaceholder },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },

  yesNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
  },
  yesNoLabel: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark, flex: 1 },
  yesNoPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  yesNoPillActive: { borderColor: COLORS.primary, backgroundColor: '#FAF0F2' },
  yesNoPillText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.textDark },
  yesNoPillTextActive: { color: COLORS.primary },

  addAddonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addAddonText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.primary },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tagChipActive: { borderColor: COLORS.primary, backgroundColor: '#FAF0F2' },
  tagChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.textMuted },
  tagChipTextActive: { color: COLORS.primary },

  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark, textAlign: 'center' },
  successText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});
