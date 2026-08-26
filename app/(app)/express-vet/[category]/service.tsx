import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../../src/api/expressVet';
import { useLocationStore } from '../../../../src/stores/locationStore';
import {
  EXPRESS_VET_SPECIES_LABELS,
  GROOMING_SUB_SERVICE_DESCRIPTIONS,
  GROOMING_SUB_SERVICE_LABELS,
  GROOMING_SUB_SERVICE_ORDER,
} from '../../../../src/constants/expressVet';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { FONTS } from '../../../../src/constants/typography';
import { COLORS } from '../../../../src/constants/colors';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';

// Grooming-only step, inserted between species.tsx and questionnaire.tsx. Every other
// category prices at the category+species level alone (single "Starting from" figure, no
// picker needed) — grooming is the one category priced as a real cart: pick "Quick Clean"
// (a fixed-price package), any individual items, or both together (extras on top of the
// package). The running total is what gets shown as this booking's "Starting from" price —
// still an estimate, confirmed on the dispatcher's call, same as every other category.
const H_PAD = 20;
const QUICK_CLEAN_KEY = 'quick_clean';

export default function ExpressVetGroomingServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category, species } = useLocalSearchParams<{ category: string; species: string }>();
  const cityId = useLocationStore((s) => s.cityId);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: config, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const priceFor = (subService: string) =>
    (config?.rate_cards ?? []).find(
      (rc) => rc.category === category && rc.species === species && rc.city_id === cityId && rc.sub_service === subService
    )?.starting_price_pkr;

  const availableItems = GROOMING_SUB_SERVICE_ORDER.filter((key) => priceFor(key) !== undefined);
  const total = selected.reduce((sum, key) => sum + (priceFor(key) ?? 0), 0);

  // Quick Clean is an either/or, not an add-on: it's the package deal, everything else is
  // "build your own". Selecting it clears any à la carte picks, and picking an à la carte
  // item clears it — so the two modes can never be mixed into a double-charged basket
  // (Quick Clean already contains bath/haircut/nails/ears).
  const quickCleanSelected = selected.includes(QUICK_CLEAN_KEY);
  const hasALaCarte = selected.some((k) => k !== QUICK_CLEAN_KEY);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleContinue = () => {
    router.push({
      pathname: '/(app)/express-vet/[category]/questionnaire',
      params: { category, species, sub_service: selected.join(',') },
    } as any);
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
          <Text style={styles.title}>What does your {EXPRESS_VET_SPECIES_LABELS[species]?.toLowerCase() ?? 'pet'} need?</Text>
          <Text style={styles.subtitle}>Choose the Quick Clean package, or build your own</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError ? (
        <QueryErrorState error={error} fallbackMessage="Could not load grooming services." onRetry={refetch} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 24, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {availableItems.map((key) => {
              const price = priceFor(key);
              const isPackage = key === QUICK_CLEAN_KEY;
              const active = selected.includes(key);
              // Either/or: with the package chosen, à la carte items are locked, and once
              // any à la carte item is chosen the package is locked. Shown as visibly
              // disabled rather than silently swapping the basket under the user.
              const disabled = isPackage ? hasALaCarte : quickCleanSelected;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.9}
                  disabled={disabled}
                  style={[
                    styles.row,
                    isPackage && styles.rowPackage,
                    active && styles.rowActive,
                    disabled && styles.rowDisabled,
                  ]}
                  onPress={() => toggle(key)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rowLabel}>{GROOMING_SUB_SERVICE_LABELS[key] ?? key}</Text>
                      {isPackage && (
                        <View style={styles.packageBadge}>
                          <Text style={styles.packageBadgeText}>PACKAGE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowDescription}>{GROOMING_SUB_SERVICE_DESCRIPTIONS[key]}</Text>
                    <Text style={styles.rowPrice}>
                      {price !== undefined ? `PKR ${price.toLocaleString()}` : 'Pricing coming soon'}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={active ? COLORS.primary : '#D1D5DB'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{selected.length === 0 ? 'Nothing selected yet' : 'Starting from'}</Text>
              <Text style={styles.totalValue}>{selected.length > 0 ? `PKR ${total.toLocaleString()}` : ''}</Text>
            </View>
            <PaltuuButton label="Continue" onPress={handleContinue} radius={26} disabled={selected.length === 0} />
          </View>
        </>
      )}
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
  title: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    padding: 14,
  },
  rowPackage: {
    borderColor: '#F0D8DC',
  },
  rowActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FAF0F2',
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.textDark,
  },
  packageBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  packageBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rowDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 4,
  },

  bottom: {
    paddingHorizontal: H_PAD,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  totalValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.primary,
  },
});
