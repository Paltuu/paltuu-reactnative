import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lostFoundApi, LostFoundDetail } from '../../../src/api/social';
import { NO_PROFILE_IMAGE } from '../../../src/constants/images';
import { FONTS } from '../../../src/constants/typography';
import { COLORS } from '../../../src/constants/colors';
import { timeAgo } from '../../../src/utils/timeAgo';

const PLACEHOLDER = require('../../../assets/dog-placeholder.webp');
const LOST_COLOR = '#C0392B';
const FOUND_COLOR = '#1E8A5F';

export default function LostFoundDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<LostFoundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    lostFoundApi.getById(id as string)
      .then((data) => { if (!cancelled) setItem(data); })
      .catch((error) => console.error('Lost & found detail fetch error:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleCall = () => {
    if (!item?.contact_info) {
      Alert.alert('No contact info', 'This report has no contact details attached.');
      return;
    }
    Linking.openURL(`tel:${item.contact_info}`);
  };

  const handleWhatsApp = () => {
    if (!item?.contact_info) {
      Alert.alert('No contact info', 'This report has no contact details attached.');
      return;
    }
    let p = String(item.contact_info).trim().replace(/[^\d+]/g, '');
    if (p.startsWith('0')) p = '92' + p.slice(1);
    Linking.openURL(`https://wa.me/${p}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Report not found</Text>
      </View>
    );
  }

  const isLost = item.post_type === 'lost';
  const accent = isLost ? LOST_COLOR : FOUND_COLOR;
  const images = item.images?.length > 0 ? item.images : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isLost ? 'Lost Pet' : 'Found Pet'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Image
          source={images[0] ? { uri: images[0] } : PLACEHOLDER}
          style={styles.image}
          contentFit="cover"
        />

        <View style={styles.content}>
          <View style={[styles.badge, { backgroundColor: accent + '14' }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.badgeText, { color: accent }]}>
              {isLost ? 'Lost' : 'Found'} · {item.category}
            </Text>
          </View>

          <Text style={styles.description}>{item.pet_description}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{[item.location, item.city].filter(Boolean).join(', ')}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{timeAgo(item.date)}</Text>
          </View>

          <View style={styles.reporterRow}>
            <Image
              source={item.user_profile_image ? { uri: item.user_profile_image } : NO_PROFILE_IMAGE}
              style={styles.reporterAvatar}
              contentFit="cover"
            />
            <Text style={styles.reporterName}>Reported by {item.user_name}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: accent }]} onPress={handleCall}>
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: '#6B7280' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backButton: { padding: 8 },
  headerTitle: { fontFamily: FONTS.headingSemi, fontSize: 17, color: '#111' },
  image: { width: '100%', aspectRatio: 1.3, backgroundColor: '#F5F5F7' },
  content: { padding: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.3 },
  description: { fontFamily: FONTS.body, fontSize: 15, color: '#1A1A2E', lineHeight: 22, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoText: { fontFamily: FONTS.bodyMedium, fontSize: 13.5, color: '#4B5563' },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 20 },
  reporterAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6' },
  reporterName: { fontFamily: FONTS.bodyMedium, fontSize: 13.5, color: '#4B5563' },
  actions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  whatsappButton: { backgroundColor: '#25D366' },
  actionButtonText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#fff' },
});
