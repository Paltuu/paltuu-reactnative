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

// Entry point for the "Vet at Home" Pets-tab section — the client never sees "Normal Vet"
// as a bare tile name; it's presented here as one of two choices, framed by urgency rather
// than a category label. Picking either continues into the existing species.tsx flow
// unchanged, just with `category` set to whichever was picked.
const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function VetAtHomeChoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

  const expressPrice = lowestStartingPrice(config?.rate_cards ?? [], 'express_vet', cityId);
  const normalPrice = lowestStartingPrice(config?.rate_cards ?? [], 'normal_vet', cityId);

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
          <Text style={styles.title}>Vet at Home</Text>
          <Text style={styles.subtitle}>How urgent is this?</Text>
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
          <TouchableOpacity activeOpacity={0.9} style={[styles.card, styles.cardUrgent]} onPress={() => goTo('express_vet')}>
            <View style={[styles.cardIcon, styles.cardIconUrgent]}>
              <Ionicons name="flash" size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Express Vet</Text>
              <Text style={styles.cardDescription}>Same-day emergency care — a vet comes as soon as one's available</Text>
              <Text style={[styles.cardPrice, styles.cardPriceUrgent]}>
                {expressPrice != null ? `Starting from PKR ${expressPrice.toLocaleString()}` : 'Pricing coming soon'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => goTo('normal_vet')}>
            <View style={styles.cardIcon}>
              <Ionicons name="calendar-outline" size={26} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Normal Vet</Text>
              <Text style={styles.cardDescription}>Not urgent — scheduled within the next 1-2 days</Text>
              <Text style={styles.cardPrice}>
                {normalPrice != null ? `Starting from PKR ${normalPrice.toLocaleString()}` : 'Pricing coming soon'}
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
  cardUrgent: {
    borderColor: PRIMARY,
    backgroundColor: '#FAF0F2',
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconUrgent: {
    backgroundColor: PRIMARY,
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
    lineHeight: 16,
  },
  cardPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#8A8A94',
    marginTop: 6,
  },
  cardPriceUrgent: {
    color: PRIMARY,
  },
});
