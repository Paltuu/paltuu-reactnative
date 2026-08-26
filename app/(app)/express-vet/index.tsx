import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi } from '../../../src/api/expressVet';
import { useLocationStore } from '../../../src/stores/locationStore';
import { EXPRESS_VET_SECTIONS, lowestStartingPriceForCategories } from '../../../src/constants/expressVet';
import { FONTS } from '../../../src/constants/typography';
import { COLORS } from '../../../src/constants/colors';
import { QueryErrorState } from '../../../src/components/ui/QueryErrorState';

const H_PAD = 20;

export default function ExpressVetIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useLocationStore((s) => s.cityId);

  const { data: config, isPending, isError, error, refetch } = useQuery({
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
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError ? (
        <QueryErrorState error={error} fallbackMessage="Could not load Vets at Home." onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 14 }}>
            {EXPRESS_VET_SECTIONS.map((section) => {
              const price = lowestStartingPriceForCategories(config?.rate_cards ?? [], section.categoryKeys, cityId);
              return (
                <TouchableOpacity
                  key={section.key}
                  activeOpacity={0.9}
                  style={styles.card}
                  onPress={() =>
                    section.categoryKeys.length === 1
                      ? router.push({
                          pathname: '/(app)/express-vet/[category]/species',
                          params: { category: section.categoryKeys[0] },
                        } as any)
                      : router.push(section.route as any)
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLabel}>{section.label}</Text>
                    <Text style={styles.cardSubtitle}>{section.subtitle}</Text>
                    <Text style={styles.cardPrice}>
                      {price != null ? `Starting from PKR ${price.toLocaleString()}` : 'Pricing coming soon'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
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
  title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  myRequestsLink: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.primary },

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
  cardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardPrice: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#999999',
    marginTop: 5,
  },
});
