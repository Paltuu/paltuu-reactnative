import React from 'react';
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
  GROOMING_SUB_SERVICE_ICONS,
  GROOMING_SUB_SERVICE_LABELS,
  GROOMING_SUB_SERVICE_ORDER,
} from '../../../../src/constants/expressVet';
import { FONTS } from '../../../../src/constants/typography';

// Grooming-only step, inserted between species.tsx and questionnaire.tsx. Every other
// category prices at the category+species level alone (single "Starting from" figure,
// no picker needed) — grooming is the one category with multiple priced sub-services, so
// it gets this one extra screen. Selecting an item here sets `sub_service`, threaded
// through the rest of the flow as a route param exactly like `category`/`species` already
// are (not stored in useExpressVetDraftStore, which only holds free-form user input).
const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function ExpressVetGroomingServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category, species } = useLocalSearchParams<{ category: string; species: string }>();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const priceFor = (subService: string) =>
    (config?.rate_cards ?? []).find(
      (rc) => rc.category === category && rc.species === species && rc.city_id === cityId && rc.sub_service === subService
    )?.starting_price_pkr;

  const availableItems = GROOMING_SUB_SERVICE_ORDER.filter((key) => priceFor(key) !== undefined);

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
          <Text style={styles.subtitle}>Pick one — pricing shown is per visit</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {availableItems.map((key) => {
            const price = priceFor(key);
            const isBundle = key === 'full_groom_package';
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.9}
                style={[styles.row, isBundle && styles.rowBundle]}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/express-vet/[category]/questionnaire',
                    params: { category, species, sub_service: key },
                  } as any)
                }
              >
                <View style={[styles.rowIcon, isBundle && styles.rowIconBundle]}>
                  <Ionicons
                    name={GROOMING_SUB_SERVICE_ICONS[key] ?? 'cut-outline'}
                    size={22}
                    color={isBundle ? '#FFFFFF' : PRIMARY}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowLabel}>{GROOMING_SUB_SERVICE_LABELS[key] ?? key}</Text>
                    {isBundle && (
                      <View style={styles.bundleBadge}>
                        <Text style={styles.bundleBadgeText}>POPULAR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rowDescription}>{GROOMING_SUB_SERVICE_DESCRIPTIONS[key]}</Text>
                  <Text style={styles.rowPrice}>
                    {price !== undefined ? `Starting from PKR ${price.toLocaleString()}` : 'Pricing coming soon'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
  title: { fontFamily: FONTS.heading, fontSize: 20, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
  },
  rowBundle: {
    borderColor: PRIMARY,
    backgroundColor: '#FAF0F2',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBundle: {
    backgroundColor: PRIMARY,
  },
  rowLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
  },
  bundleBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bundleBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rowDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#8A8A94',
    marginTop: 2,
  },
  rowPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PRIMARY,
    marginTop: 4,
  },
});
