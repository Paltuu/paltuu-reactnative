import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../../src/api/expressVet';
import { useLocationStore } from '../../../../src/stores/locationStore';
import { EXPRESS_VET_SPECIES_ICONS, EXPRESS_VET_SPECIES_LABELS } from '../../../../src/constants/expressVet';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function ExpressVetSpeciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category: string }>();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const categoryConfig = config?.categories.find((c) => c.key === category);

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
          <Text style={styles.title}>{categoryConfig?.label ?? 'Choose Pet'}</Text>
          <Text style={styles.subtitle}>Who is this visit for?</Text>
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
          {(categoryConfig?.species ?? []).map((species) => {
            const rateCard = (config?.rate_cards ?? []).find(
              (rc) => rc.category === category && rc.species === species && rc.city_id === cityId
            );
            return (
              <TouchableOpacity
                key={species}
                activeOpacity={0.9}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/express-vet/[category]/questionnaire',
                    params: { category, species },
                  } as any)
                }
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={EXPRESS_VET_SPECIES_ICONS[species] ?? 'paw'} size={24} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{EXPRESS_VET_SPECIES_LABELS[species] ?? species}</Text>
                  <Text style={styles.rowSub}>
                    {rateCard ? `Starting from PKR ${rateCard.starting_price_pkr.toLocaleString()}` : 'Pricing coming soon'}
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
  title: { fontFamily: FONTS.heading, fontSize: 24, color: DARK },
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
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
  },
  rowSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#8A8A94',
    marginTop: 2,
  },
});
