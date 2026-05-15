import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const GAP = 10;
const HALF = (width - H_PAD * 2 - GAP) / 2;

// ── Unsplash photo URLs (no signup needed, direct-serve) ─────────────────────
const ADOPT_IMG =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80'; // golden retriever
const POST_IMG =
  'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80'; // kitten
const LOST_IMG =
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&q=80'; // dog sniffing ground
const CARE_IMG =
  'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&q=80'; // vet with dog
const VET_IMG =
  'https://images.unsplash.com/photo-1559190394-df5a28aab5c5?w=600&q=80'; // vet clinic

export default function PetsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 110,
        }}
      >
        {/* ── Page header ─────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>FOR YOUR PET</Text>
            <Text style={styles.pageTitle}>Pets Hub</Text>
          </View>
        </View>

        {/* ── HERO CARD — Adopt ───────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.93}
          onPress={() => router.push('/(app)/adopt' as any)}
          style={styles.heroCard}
        >
          <Image source={{ uri: ADOPT_IMG }} style={styles.heroImg} />
          {/* dark gradient overlay */}
          <View style={styles.heroDark} />

          {/* badge */}
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ADOPT</Text>
          </View>

          {/* bottom copy */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>Find a{'\n'}Companion</Text>
            <Text style={styles.heroSub}>
              Browse pets looking for a forever home
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Two small cards ─────────────────────────────────── */}
        <View style={styles.twoCol}>
          {/* Post a Pet */}
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => router.push('/(app)/create-pet' as any)}
            style={styles.smallCard}
          >
            <Image source={{ uri: POST_IMG }} style={styles.smallImg} />
            <View style={styles.smallDark} />
            <View style={styles.smallContent}>
              <Text style={styles.smallTitle}>Post a Pet</Text>
              <Text style={styles.smallSub}>List for adoption</Text>
            </View>
          </TouchableOpacity>

          {/* Lost & Found */}
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => router.push('/(app)/lost-found' as any)}
            style={[styles.smallCard, { borderColor: '#F59E0B' }]}
          >
            <Image source={{ uri: LOST_IMG }} style={styles.smallImg} />
            <View style={styles.smallDark} />
            {/* amber accent line */}
            <View style={styles.amberLine} />
            <View style={styles.smallContent}>
              <Text style={[styles.smallTitle, { color: '#FCD34D' }]}>
                Lost & Found
              </Text>
              <Text style={styles.smallSub}>Search missing pets</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Section divider ─────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>More Services</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* ── URGENT — Report Lost / Found ────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.93}
          onPress={() => router.push('/(app)/create-lost-found' as any)}
          style={styles.urgentCard}
        >
          {/* left accent */}
          <View style={styles.urgentAccent} />
          <View style={styles.urgentInner}>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>URGENT</Text>
            </View>
            <Text style={styles.urgentTitle}>Report Lost or Found</Text>
            <Text style={styles.urgentSub}>
              Help reunite pets with their families
            </Text>
          </View>
          {/* decorative paw placeholder (pet silhouette) */}
          <View style={styles.urgentImgWrap}>
            <Text style={{ fontSize: 52 }}>🐶</Text>
            <View style={styles.urgentQuestion}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>?</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Pet Care & Vet Nearby ────────────────────────────── */}
        <View style={styles.twoCol}>
          {/* Pet Care */}
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => router.push('/(app)/pet-care' as any)}
            style={styles.serviceCard}
          >
            <Image source={{ uri: CARE_IMG }} style={styles.serviceImg} />
            <View style={styles.serviceDark} />
            <View style={styles.serviceContent}>
              <Text style={styles.serviceTitle}>Pet Care</Text>
              <Text style={styles.serviceSub}>Pro services{'\n'}for your pet</Text>
            </View>
          </TouchableOpacity>

          {/* Vet Nearby */}
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => router.push('/(app)/vet-nearby' as any)}
            style={styles.serviceCard}
          >
            <Image source={{ uri: VET_IMG }} style={styles.serviceImg} />
            <View style={styles.serviceDark} />
            <View style={styles.serviceContent}>
              <Text style={styles.serviceTitle}>Vet Nearby</Text>
              <Text style={styles.serviceSub}>Find vets &{'\n'}clinics near you</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const CRIMSON = '#A03048';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F2' },

  // ── Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: H_PAD,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: CRIMSON,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },

  // ── Hero card
  heroCard: {
    marginHorizontal: H_PAD,
    borderRadius: 20,
    overflow: 'hidden',
    height: 260,
    marginBottom: GAP,
  },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: CRIMSON,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroBottom: { position: 'absolute', bottom: 20, left: 20 },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '400',
  },

  // ── Two-col row
  twoCol: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: H_PAD,
    marginBottom: GAP,
  },

  // ── Small cards (Post / Lost)
  smallCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: HALF * 0.85,
    borderWidth: 0,
    backgroundColor: '#1a1a1a',
  },
  smallImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  smallDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  amberLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#F59E0B',
  },
  smallContent: { position: 'absolute', bottom: 14, left: 14 },
  smallTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  smallSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '400',
  },

  // ── Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
  viewAll: { fontSize: 13, fontWeight: '700', color: CRIMSON },

  // ── Urgent card
  urgentCard: {
    marginHorizontal: H_PAD,
    borderRadius: 18,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: GAP,
    // shadow
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  urgentAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#EF4444',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  urgentInner: { flex: 1, padding: 16 },
  urgentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  urgentBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  urgentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.2,
  },
  urgentSub: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '400' },
  urgentImgWrap: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    position: 'relative',
  },
  urgentQuestion: {
    position: 'absolute',
    top: -4,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Service cards (Pet Care / Vet)
  serviceCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    height: HALF * 1.05,
    backgroundColor: '#1a1a1a',
  },
  serviceImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  serviceDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  serviceContent: { position: 'absolute', bottom: 14, left: 14 },
  serviceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  serviceSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '400',
    lineHeight: 15,
  },
});