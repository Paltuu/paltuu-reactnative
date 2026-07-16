import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  StyleSheet,
  FlatList,
  Modal,
  Linking,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petApi } from '../../src/api/pets';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import PaltuuButton from '../../src/components/ui/PaltuuButton';
import { PetDetailsScreenSkeleton } from '../../src/components/common/PetDetailsScreenSkeleton';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';
import { getShareUrl } from '../../src/utils/share';

const { width } = Dimensions.get('window');
// Wider and less tall layout (5:4 aspect ratio)
const CARD_WIDTH = width * 0.86;
const CARD_HEIGHT = CARD_WIDTH * 0.8;

// Local helper to format age
const formatAge = (ageMonths: number | null | undefined): string => {
  if (ageMonths === null || ageMonths === undefined || ageMonths < 0) {
    return "Unknown age";
  }
  if (ageMonths === 0) return "Newborn";
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const yearStr = years > 0 ? `${years} ${years === 1 ? "yr" : "yrs"}` : "";
  const monthStr = months > 0 ? `${months} ${months === 1 ? "mo" : "mos"}` : "";
  if (yearStr && monthStr) return `${yearStr} ${monthStr}`;
  return yearStr || monthStr;
};

function PetDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  const { toggleSave } = useSocialActions();

  useEffect(() => {
    setLoading(true);
    setPet(null);
    setActiveImageIndex(0);
    const fetchDetails = async () => {
      try {
        const data = await petApi.getPetDetails(parseInt(id as string));
        setPet(data);
        setIsSaved(!!data.is_saved);
      } catch (error) {
        console.error('Pet details fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const onShare = async () => {
    try {
      await Share.share({
        message: getShareUrl(`pet-details?petId=${id}`),
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCallGuardian = () => {
    if (!pet?.owner_phone) {
      Alert.alert('No phone number', "This guardian hasn't added a phone number yet.");
      return;
    }
    Linking.openURL(`tel:${pet.owner_phone}`);
  };

  const handleMessageGuardian = () => {
    if (!pet?.owner_phone) {
      Alert.alert('No phone number', "This guardian hasn't added a phone number yet.");
      return;
    }
    let p = String(pet.owner_phone).trim().replace(/[^\d+]/g, '');
    if (p.startsWith('0')) p = '92' + p.slice(1);
    Linking.openURL(`whatsapp://send?phone=${p}`);
  };

  const handleToggleSave = async () => {
    try {
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);
      await toggleSave(pet.pet_id, !newSavedState);
    } catch (error) {
      console.error('Toggle save error:', error);
    }
  };

  if (loading) return <PetDetailsScreenSkeleton insetsTop={insets.top} />;
  if (!pet) return <View style={s.errorContainer}><Text style={s.errorText}>Pet Not Found</Text></View>;

  const images = pet.images?.length > 0
    ? pet.images.sort((a: any, b: any) => a.order - b.order).map((img: any) => img.image_url)
    : [pet.image_url || 'https://via.placeholder.com/400'];

  const traits = [
    { label: pet.sex === 'male' ? 'Male' : 'Female', highlighted: true },
    { label: formatAge(pet.age_months), highlighted: false },
    { label: pet.city || 'Karachi', highlighted: false },
    ...(pet.tags?.slice(0, 2).map((t: any) => ({ label: t.tag_name, highlighted: false })) || [])
  ];

  return (
    <View style={s.container}>
      {/* --- SOLID IN-FLOW NAVIGATION ROW --- */}
      <View style={[s.fixedNavRow, { paddingTop: insets.top }]}>
        <View style={s.fixedNavContent}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/adopt'))} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >

        {/* --- CLEAN IMAGE GALLERY SECTION --- */}
        <View style={s.galleryContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
              setActiveImageIndex(newIndex);
            }}
            snapToInterval={CARD_WIDTH + 16}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={s.flatListContent}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPreviewImageIndex(index)}
                style={s.imageCardFrame}
              >
                <Image source={{ uri: item }} style={s.cardImage} contentFit="cover" />
              </TouchableOpacity>
            )}
          />

          {/* Elegant Horizontal Pagination Lines */}
          {images.length > 1 && (
            <View style={s.lineIndicatorWrapper}>
              {images.map((_: string, idx: number) => (
                <View
                  key={idx}
                  style={[
                    s.lineIndicator,
                    activeImageIndex === idx ? s.lineIndicatorActive : s.lineIndicatorInactive
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* --- EDITORIAL CONTENT BLOCK --- */}
        <View style={s.contentCard}>
          <View style={s.titleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.petName}>{pet.pet_name || "Cute vocalist cat"}</Text>
              <View style={s.priceSubRow}>
                <Text style={s.priceText}>Free Adoption</Text>
                <Text style={s.priceInfo}> · Paltuu Verified</Text>
              </View>
            </View>
          </View>

          {/* Guardian Profile Block */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>Guardian</Text>
            <View style={s.sellerRow}>
              <Image
                source={pet.owner_image ? { uri: pet.owner_image } : require('../../assets/no-profile/no-profile.jpg')}
                style={s.sellerAvatarBox}
                contentFit="cover"
              />
              <View style={s.sellerInfo}>
                <Text style={s.sellerName}>{pet.owner_name || 'Legendary Kiwi'}</Text>
              </View>
              <View style={s.sellerActions}>
                <TouchableOpacity style={s.sellerActionCircle} activeOpacity={0.7} onPress={handleMessageGuardian}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity style={s.sellerActionCircle} activeOpacity={0.7} onPress={handleCallGuardian}>
                  <Ionicons name="call-outline" size={18} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Details Block */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>About Me</Text>
            <Text style={s.storyText}>
              {pet.description || "Her name is Meicky. She likes noodle and cooked chicken. She likes sleeping and eating ^^.\n\nNote: phone number only have WhatsApp"}
            </Text>
          </View>

          {/* Characteristics Custom Badges */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>Characteristics</Text>
            <View style={s.tagCloud}>
              {traits.map((trait, idx: number) => (
                <View key={idx} style={[s.sizePill, trait.highlighted ? s.sizePillSelected : s.sizePillDefault]}>
                  <Text style={[s.sizePillText, trait.highlighted ? s.sizePillTextSelected : s.sizePillTextDefault]}>
                    {trait.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 140 }} />
        </View>
      </ScrollView>

      {/* --- STICKY FOOTER ACTION BAR --- */}
      <View style={[s.footerBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#FFFFFF']}
          locations={[0, 0.4, 1]}
          style={s.footerGradient}
          pointerEvents="none"
        />
        <PaltuuButton
          label="Adopt Now"
          onPress={() => router.push({
            pathname: '/(app)/apply-adopt',
            params: { pet_id: pet.pet_id, pet_name: pet.pet_name }
          })}
          radius={26}
        />
      </View>

      {/* --- FULL-SCREEN IMAGE PREVIEW MODAL --- */}
      <Modal
        visible={previewImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageIndex(null)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={s.modalBackground}>
          {/* Top Close Button using Safe Area insets */}
          <View style={[s.modalHeader, { top: Math.max(insets.top, 20) }]}>
            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => setPreviewImageIndex(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {previewImageIndex !== null && (
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={previewImageIndex}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              keyExtractor={(_, idx: number) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ width, height: '100%', justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={1}
                  onPress={() => setPreviewImageIndex(null)}
                >
                  <Image
                    source={{ uri: item }}
                    style={s.modalImage}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: {},
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 40 },
  errorText: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#111827', marginTop: 16, textAlign: 'center' },

  // Minimal Top Navigation Bar Setup
  fixedNavRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  fixedNavContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 44,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Clean Workspace Gallery Structure
  galleryContainer: {
    alignItems: 'center',
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  flatListContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    gap: 16,
  },
  imageCardFrame: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    // Ultra-soft industrial luxury shadow instead of strong dark drop-shadows
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cardImage: { width: '100%', height: '100%' },

  // Clean Grey Minimal Pagination Dots
  lineIndicatorWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  lineIndicator: {
    height: 3,
    borderRadius: 2,
  },
  lineIndicatorActive: {
    width: 16,
    backgroundColor: '#a03048', // Primary focus tone
  },
  lineIndicatorInactive: {
    width: 6,
    backgroundColor: 'rgba(160, 48, 72, 0.24)', // Soft primary accent
  },

  // Content Block Styling
  contentCard: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  petName: { fontSize: 26, fontFamily: 'DMSans_700Bold', color: '#111827', letterSpacing: -0.5 },
  priceSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  priceText: { fontSize: 14, fontFamily: 'Montserrat_700Bold', color: '#a03048' },
  priceInfo: { fontSize: 13, fontFamily: 'Montserrat_500Medium', color: '#9CA3AF' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF0F2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ratingText: { fontSize: 11, fontFamily: 'DMSans_700Bold', color: '#a03048' },

  sectionBlock: { marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#111827', marginBottom: 12 },
  storyText: { fontSize: 14, fontFamily: 'Montserrat_400Regular', color: '#4B5563', lineHeight: 22 },

  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatarBox: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: 'rgba(160, 48, 72, 0.08)', backgroundColor: '#F5F5F7' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#111827' },
  sellerActions: { flexDirection: 'row', gap: 10 },
  sellerActionCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

  tagCloud: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sizePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sizePillDefault: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  sizePillSelected: { backgroundColor: '#FAF0F2', borderWidth: 1, borderColor: '#a03048' },
  sizePillText: { fontSize: 13 },
  sizePillTextDefault: { fontFamily: 'Montserrat_600SemiBold', color: '#4B5563' },
  sizePillTextSelected: { fontFamily: 'Montserrat_700Bold', color: '#a03048' },

  // Sticky Bottom Action Bar Configuration
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
  footerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default withFocusUnmount(PetDetailsScreen);
