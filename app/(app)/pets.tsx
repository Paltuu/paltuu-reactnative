import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderContext } from '../../src/context/HeaderContext';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const GAP = 12;

// ── Unsplash photo URLs (no signup needed, direct-serve) ─────────────────────
const ADOPT_IMG =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80'; // golden retriever
const POST_IMG =
  'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80'; // kitten
const LOST_IMG =
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&q=80'; // dog sniffing ground
const VET_IMG =
  'https://images.unsplash.com/photo-1559190394-df5a28aab5c5?w=600&q=80'; // vet clinic

export default function PetsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onScroll } = useHeaderContext();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
      {/* ── Page header ─────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>FOR YOUR PET</Text>
          <Text style={styles.pageTitle}>Pets Hub</Text>
        </View>
      </View>

      {/* ── 2x2 Grid of Options ─────────────────────────────── */}
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {/* Adopt a Pet */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(app)/adopt' as any)}
            style={styles.gridCard}
          >
            <Image source={{ uri: ADOPT_IMG }} style={styles.cardImg} />
            <View style={styles.cardDark} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Adopt a Pet</Text>
              <Text style={styles.cardSub}>Find a companion</Text>
            </View>
          </TouchableOpacity>

          {/* List a Pet */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(app)/create-pet' as any)}
            style={styles.gridCard}
          >
            <Image source={{ uri: POST_IMG }} style={styles.cardImg} />
            <View style={styles.cardDark} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>List a Pet</Text>
              <Text style={styles.cardSub}>Find a home</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.gridRow}>
          {/* Lost & Found */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(app)/lost-found' as any)}
            style={styles.gridCard}
          >
            <Image source={{ uri: LOST_IMG }} style={styles.cardImg} />
            <View style={styles.cardDark} />
            <View style={styles.amberLine} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: '#FCD34D' }]}>
                Lost & Found
              </Text>
              <Text style={styles.cardSub}>Search missing pets</Text>
            </View>
          </TouchableOpacity>

          {/* Vets / Clinics */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(app)/vet-nearby' as any)}
            style={styles.gridCard}
          >
            <Image source={{ uri: VET_IMG }} style={styles.cardImg} />
            <View style={styles.cardDark} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Find Vets</Text>
              <Text style={styles.cardSub}>Clinics in your area</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const CRIMSON = '#A03048';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  // ── Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: H_PAD,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: CRIMSON,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },

  // ── Grid Container
  gridContainer: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingBottom: 110,
    gap: GAP,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  gridCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  cardImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  amberLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F59E0B',
  },
  cardContent: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  cardTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },
});