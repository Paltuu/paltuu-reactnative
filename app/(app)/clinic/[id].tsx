import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getClinicDetails } from '../../../src/api/clinics';
import { VetCard } from '../../../src/components/pet-care/VetCard';
import { ClinicResources } from '../../../src/components/pet-care/ClinicResources';
import { FONTS } from '../../../src/constants/typography';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#6B7280';

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name =
          rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={i} name={name as any} size={size} color="#F5A623" />;
      })}
    </View>
  );
}

async function copyText(value: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(value);
    return true;
  } catch {
    try {
      await Share.share({ message: value });
      return true;
    } catch {
      return false;
    }
  }
}

function ClinicDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => getClinicDetails(id as string),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (error || !clinic) {
    return (
      <View style={[styles.center, { padding: 40 }]}>
        <Text style={styles.errorText}>
          Failed to load clinic details. Please try again.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rating = clinic.rating != null ? Number(clinic.rating) : null;
  const reviews = clinic.total_reviews ?? 0;
  const phone = clinic.contact_number;
  const vets = clinic.vets ?? [];

  const handleCall = () => phone && Linking.openURL(`tel:${phone}`);
  const handleWhatsApp = () => {
    const raw = clinic.whatsapp_number || phone;
    if (!raw) return;
    let p = raw.trim().replace(/[^\d+]/g, '');
    if (p.startsWith('0')) p = '92' + p.slice(1);
    Linking.openURL(`whatsapp://send?phone=${p}`);
  };
  const handleMap = () => {
    if (clinic.google_maps_link) {
      Linking.openURL(clinic.google_maps_link);
    } else if (clinic.latitude && clinic.longitude) {
      const ll = `${clinic.latitude},${clinic.longitude}`;
      const url = Platform.select({
        ios: `http://maps.apple.com/?q=${encodeURIComponent(clinic.name)}&ll=${ll}`,
        default: `https://www.google.com/maps/search/?api=1&query=${ll}`,
      });
      Linking.openURL(url!);
    }
  };
  const handleCopy = async () => {
    if (!phone) return;
    const ok = await copyText(phone);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const canMap = !!clinic.google_maps_link || (!!clinic.latitude && !!clinic.longitude);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {clinic.name}
          </Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ marginBottom: insets.bottom }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        <View style={styles.body}>
          {/* Logo + name card */}
          <View style={styles.card}>
            <View style={styles.logoWrap}>
              {clinic.logo_url ? (
                <Image
                  source={{ uri: clinic.logo_url }}
                  style={styles.logo}
                  contentFit="cover"
                  transition={250}
                />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Ionicons name="medkit" size={40} color={PRIMARY} />
                </View>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              {clinic.is_paltuu_partner && (
                <MaterialIcons name="verified" size={18} color={PRIMARY} />
              )}
            </View>

            {rating != null && (
              <View style={styles.ratingBlock}>
                <Image
                  source={require('../../../assets/google-reviews.webp')}
                  style={styles.googleLogo}
                  contentFit="contain"
                />
                <View style={styles.ratingRow}>
                  <StarRow rating={rating} />
                  <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                  {reviews > 0 && (
                    <Text style={styles.ratingCount}>({reviews})</Text>
                  )}
                </View>
                <Text style={styles.disclaimer}>
                  Rating sourced from Google. Paltuu is not responsible for Google
                  review content.
                </Text>
              </View>
            )}
          </View>

          {/* Primary actions */}
          <View style={styles.actionsRow}>
            {!!phone && (
              <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
                <Ionicons name="call" size={16} color="#FFF" />
                <Text style={styles.callBtnText}>Call Now</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleWhatsApp} style={styles.iconBtnGreen}>
              <FontAwesome5 name="whatsapp" size={20} color="#FFF" />
            </TouchableOpacity>
            {canMap && (
              <TouchableOpacity onPress={handleMap} style={styles.iconBtnOutline}>
                <Image
                  source={require('../../../assets/icons/location-pin-alt-1-svgrepo-com.svg')}
                  style={{ width: 20, height: 20 }}
                  contentFit="contain"
                  tintColor={PRIMARY}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Discount */}
          {!!clinic.discount_details &&
            !clinic.discount_details.toLowerCase().includes('no discount') &&
            !clinic.discount_details.toLowerCase().includes('pending') && (
              <View style={styles.discountCard}>
                <MaterialIcons name="local-offer" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.discountLabel}>Special Offer</Text>
                  <Text style={styles.discountValue}>{clinic.discount_details}</Text>
                </View>
              </View>
            )}

          {/* Location */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.locationName}>{clinic.name}</Text>
            <Text style={styles.address}>{clinic.address}</Text>

            {canMap && (
              <TouchableOpacity onPress={handleMap} style={styles.mapPreview} activeOpacity={0.9}>
                <View style={styles.mapPin}>
                  <Image
                    source={require('../../../assets/icons/location-pin-alt-1-svgrepo-com.svg')}
                    style={{ width: 22, height: 22 }}
                    contentFit="contain"
                    tintColor="#FFF"
                  />
                </View>
                <View style={styles.mapPreviewOverlay}>
                  <Text style={styles.mapPreviewText}>View on Map</Text>
                  <Ionicons name="arrow-forward" size={14} color={PRIMARY} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Contact</Text>
            {!!phone && (
              <>
                <View style={styles.contactRow}>
                  <View style={styles.contactIcon}>
                    <Ionicons name="call" size={16} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactLabel}>Phone Number</Text>
                    <Text style={styles.contactValue}>{phone}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={15}
                    color={copied ? PRIMARY : MUTED}
                  />
                  <Text style={[styles.copyText, copied && { color: PRIMARY }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {!!clinic.operating_hours && (
              <View style={[styles.contactRow, { marginTop: 16 }]}>
                <View style={styles.contactIcon}>
                  <Ionicons name="time-outline" size={16} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>Operating Hours</Text>
                  <Text style={styles.contactValue}>{clinic.operating_hours}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Veterinarians */}
          <View style={styles.vetHeaderRow}>
            <Text style={styles.vetHeader}>Our Veterinarians</Text>
            {vets.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countText}>{vets.length}</Text>
              </View>
            )}
          </View>

          {vets.length > 0 ? (
            vets.map((vet) => (
              <VetCard
                key={vet.vet_id}
                vet={vet}
                onPress={() =>
                  router.push({ pathname: '/(app)/vet/[id]', params: { id: vet.vet_id } })
                }
              />
            ))
          ) : (
            <>
              <View style={styles.updatingCard}>
                <View style={styles.updatingIcon}>
                  <Ionicons name="medkit-outline" size={20} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.updatingTitle}>Veterinarian Directory Updating</Text>
                  <Text style={styles.updatingBody}>
                    We are currently refreshing the registered veterinarians directory
                    for {clinic.name}. In the meantime, you can reach out directly via
                    phone or WhatsApp to book appointments, verify doctor availability,
                    or inquire about emergency walk-ins.
                  </Text>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <ClinicResources />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  center: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: FONTS.headingSemi, fontSize: 15, color: MUTED, textAlign: 'center' },
  errorBtn: { marginTop: 16, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  errorBtnText: { color: '#FFF', fontFamily: FONTS.headingSemi },

  headerSafeArea: {
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FONTS.heading, fontSize: 16, color: DARK, marginHorizontal: 8 },

  body: { paddingHorizontal: 20, gap: 14, paddingTop: 6 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  logoWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  logo: { width: '100%', height: '100%' },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3F0' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  clinicName: { fontFamily: FONTS.heading, fontSize: 20, color: DARK, textAlign: 'center' },

  ratingBlock: { alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F2' },
  googleLogo: { width: 120, height: 32, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontFamily: FONTS.heading, fontSize: 15, color: DARK },
  ratingCount: { fontFamily: FONTS.body, fontSize: 13, color: MUTED },
  disclaimer: { fontFamily: FONTS.body, fontSize: 10.5, color: '#B0B0B8', textAlign: 'center', marginTop: 8, lineHeight: 15, paddingHorizontal: 10 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 16,
  },
  callBtnText: { color: '#FFF', fontFamily: FONTS.heading, fontSize: 14 },
  iconBtnGreen: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOutline: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  discountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5E4E8',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBC9D1',
  },
  discountLabel: { fontFamily: FONTS.bodyBold, fontSize: 10, color: PRIMARY, letterSpacing: 0.5 },
  discountValue: { fontFamily: FONTS.headingSemi, fontSize: 14, color: DARK, marginTop: 2 },

  sectionLabel: { fontFamily: FONTS.heading, fontSize: 16, color: DARK, marginBottom: 10 },
  locationName: { fontFamily: FONTS.headingSemi, fontSize: 14, color: DARK, marginBottom: 4 },
  address: { fontFamily: FONTS.body, fontSize: 13, color: MUTED, lineHeight: 20 },

  mapPreview: {
    height: 120,
    borderRadius: 16,
    backgroundColor: '#F5E4E8',
    marginTop: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBC9D1',
  },
  mapPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreviewOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapPreviewText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: PRIMARY },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5E4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: { fontFamily: FONTS.body, fontSize: 11, color: '#9AA0A6' },
  contactValue: { fontFamily: FONTS.headingSemi, fontSize: 15, color: DARK, marginTop: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  copyText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: MUTED },

  vetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 4 },
  vetHeader: { fontFamily: FONTS.heading, fontSize: 18, color: DARK },
  countPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F5E4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: PRIMARY },

  updatingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0F2',
  },
  updatingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5E4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatingTitle: { fontFamily: FONTS.headingSemi, fontSize: 14, color: DARK, marginBottom: 6 },
  updatingBody: { fontFamily: FONTS.body, fontSize: 12.5, color: MUTED, lineHeight: 19 },
});

export default withFocusUnmount(ClinicDetailsScreen);
