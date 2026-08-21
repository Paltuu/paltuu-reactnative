import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../src/api/expressVet';
import { useLocationStore } from '../../../src/stores/locationStore';
import { EXPRESS_VET_CATEGORY_ICONS, lowestStartingPrice } from '../../../src/constants/expressVet';
import { FONTS } from '../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function ExpressVetIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending } = useQuery({
    queryKey: ['express-vet-config'],
    queryFn: expressVetApi.getConfig,
    staleTime: 1000 * 60 * 30,
  });

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
          <Text style={styles.title}>Vets at Home</Text>
          <Text style={styles.subtitle}>Home-visit vet & grooming care in Karachi</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/express-vet/requests' as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.myRequestsLink}>My Requests</Text>
        </TouchableOpacity>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {(config?.categories ?? []).map((category) => {
              const price = lowestStartingPrice(config?.rate_cards ?? [], category.key, cityId);
              return (
                <TouchableOpacity
                  key={category.key}
                  activeOpacity={0.9}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/express-vet/[category]/species',
                      params: { category: category.key },
                    } as any)
                  }
                >
                  <View style={styles.cardIcon}>
                    <Ionicons
                      name={EXPRESS_VET_CATEGORY_ICONS[category.key] ?? 'paw'}
                      size={30}
                      color={PRIMARY}
                    />
                  </View>
                  <Text style={styles.cardLabel}>{category.label}</Text>
                  <Text style={styles.cardPrice}>
                    {price != null ? `Starting from PKR ${price.toLocaleString()}` : 'Pricing coming soon'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  title: { fontFamily: FONTS.heading, fontSize: 26, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },
  myRequestsLink: { fontFamily: FONTS.bodyBold, fontSize: 12, color: PRIMARY },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    gap: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: DARK,
  },
  cardPrice: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#8A8A94',
  },
});
