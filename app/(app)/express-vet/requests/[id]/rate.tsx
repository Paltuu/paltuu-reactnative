import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi, EXPRESS_VET_ADDON_REASON_TAGS } from '../../../../../src/api/expressVet';
import PaltuuButton from '../../../../../src/components/ui/PaltuuButton';
import { FONTS } from '../../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
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
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isPending } = useQuery({
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
    onSuccess: () => setSubmitted(true),
    onError: () => Alert.alert('Something went wrong', 'Could not submit your rating. Please try again.'),
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
            <Ionicons name="heart" size={34} color={PRIMARY} />
          </View>
          <Text style={styles.successTitle}>Thanks for rating!</Text>
          <Text style={styles.successText}>Your feedback helps us keep Vets at Home reliable.</Text>
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <PaltuuButton label="Back to Pets" onPress={() => router.replace('/(app)/pets')} radius={26} />
        </View>
      </View>
    );
  }

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
          <Text style={styles.title}>Rate Your Visit</Text>
          {!!request?.provider_name && <Text style={styles.subtitle}>with {request.provider_name}</Text>}
        </View>
      </View>

      {isPending || !request ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 24, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                placeholderTextColor="#B0B7C3"
                multiline
              />
            </View>

            {!showAddon ? (
              <TouchableOpacity style={styles.addAddonRow} onPress={() => setShowAddon(true)}>
                <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                <Text style={styles.addAddonText}>Was there any extra charge during the visit?</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.fieldLabel}>Extra charge details</Text>
                  <TouchableOpacity onPress={() => { setShowAddon(false); setAddonTags([]); setAddonTotal(''); }}>
                    <Ionicons name="close-circle" size={20} color="#B0B7C3" />
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
                  placeholderTextColor="#B0B7C3"
                  keyboardType="number-pad"
                />
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
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
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  fieldLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK },
  optionalTag: { fontFamily: FONTS.body, fontSize: 12, color: '#B0B7C3' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: DARK,
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
  yesNoLabel: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK, flex: 1 },
  yesNoPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  yesNoPillActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  yesNoPillText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: DARK },
  yesNoPillTextActive: { color: PRIMARY },

  addAddonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addAddonText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: PRIMARY },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tagChipActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  tagChipText: { fontFamily: FONTS.bodyBold, fontSize: 11, color: '#8A8A94' },
  tagChipTextActive: { color: PRIMARY },

  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontFamily: FONTS.heading, fontSize: 22, color: DARK, textAlign: 'center' },
  successText: { fontFamily: FONTS.body, fontSize: 13, color: '#8A8A94', textAlign: 'center' },

  bottom: { paddingHorizontal: H_PAD, paddingTop: 8 },
});
