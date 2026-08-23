import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../src/api/expressVet';
import { useLocationStore } from '../../../src/stores/locationStore';
import { lowestStartingPrice } from '../../../src/constants/expressVet';
import { FONTS } from '../../../src/constants/typography';

// Entry point for the "Neutering & Spaying" Pets-tab section — same two-choice pattern as
// vet-at-home.tsx. Picking either continues into the existing species.tsx flow unchanged.
const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function NeuteringSpayingChoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const neuteringPrice = lowestStartingPrice(config?.rate_cards ?? [], 'neutering', cityId);
  const spayingPrice = lowestStartingPrice(config?.rate_cards ?? [], 'spaying', cityId);

  const goTo = (category: string) =>
    router.push({ pathname: '/(app)/express-vet/[category]/species', params: { category } } as any);

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
          <Text style={styles.title}>Neutering & Spaying</Text>
          <Text style={styles.subtitle}>Which procedure does your pet need?</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => goTo('neutering')}>
            <View style={styles.cardIcon}>
              <Ionicons name="male-outline" size={26} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Neutering</Text>
              <Text style={styles.cardDescription}>For male pets</Text>
              <Text style={styles.cardPrice}>
                {neuteringPrice != null ? `Starting from PKR ${neuteringPrice.toLocaleString()}` : 'Pricing coming soon'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => goTo('spaying')}>
            <View style={styles.cardIcon}>
              <Ionicons name="female-outline" size={26} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Spaying</Text>
              <Text style={styles.cardDescription}>For female pets</Text>
              <Text style={styles.cardPrice}>
                {spayingPrice != null ? `Starting from PKR ${spayingPrice.toLocaleString()}` : 'Pricing coming soon'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
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
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: DARK,
  },
  cardDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#8A8A94',
    marginTop: 3,
  },
  cardPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#8A8A94',
    marginTop: 6,
  },
});
