import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Share,
  StyleSheet,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petApi } from '../../src/api/pets';
import { useSocialActions } from '../../src/hooks/useSocialActions';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const { toggleSave } = useSocialActions();

  useEffect(() => {
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
        message: `Check out ${pet.pet_name} on Paltuu!\n\npaltuu://pet-details?petId=${id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
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

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={s.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
        <Text style={s.errorText}>Pet Not Found</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={s.errorBtn}
        >
          <Text style={s.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = pet.images?.length > 0 
    ? pet.images.sort((a: any, b: any) => a.order - b.order).map((img: any) => img.image_url)
    : [pet.image_url || 'https://via.placeholder.com/400'];

  const cycleImage = () => {
    if (images.length > 1) {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  // Scattered DM Images Deck with refined micro-rotations
  const getDeckImages = () => {
    if (images.length === 1) {
      return [{ url: images[0], rotation: '0deg', zIndex: 3, offsetX: 0, offsetY: 0 }];
    }
    if (images.length === 2) {
      return [
        { url: images[(activeImageIndex + 1) % 2], rotation: '-4deg', zIndex: 1, offsetX: -10, offsetY: 2 },
        { url: images[activeImageIndex], rotation: '0deg', zIndex: 3, offsetX: 0, offsetY: 0 }
      ];
    }
    return [
      { url: images[(activeImageIndex + 2) % images.length], rotation: '4deg', zIndex: 1, offsetX: 12, offsetY: -2 },
      { url: images[(activeImageIndex + 1) % images.length], rotation: '-4deg', zIndex: 2, offsetX: -12, offsetY: 2 },
      { url: images[activeImageIndex], rotation: '0deg', zIndex: 3, offsetX: 0, offsetY: 0 }
    ];
  };

  const deck = getDeckImages();

  const traits = [
    { label: pet.sex === 'male' ? 'Male' : 'Female', highlighted: true },
    { label: formatAge(pet.age_months), highlighted: false },
    { label: pet.city || 'Pakistan', highlighted: false },
    ...(pet.tags?.slice(0, 2).map((t: any) => ({ label: t.tag_name, highlighted: false })) || [])
  ];

  return (
    <View className="flex-1 bg-white" style={s.container}>
      <ScrollView 
        className="flex-1 bg-white"
        style={s.scrollView} 
        contentContainerStyle={{ backgroundColor: '#FFFFFF' }}
        showsVerticalScrollIndicator={false} 
        bounces={false}
      >
        
        {/* --- ULTRA-REFINED BURGUNDY HEADER CONTAINER (U-shaped Bottom Curve & Smooth Shadows) --- */}
        <View style={[s.headerCard, { paddingTop: insets.top }]}>
          
          {/* Transparent Glassmorphic Action Row */}
          <View style={s.actionRow}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={s.glassBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onShare}
              style={s.glassBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="share-social" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Instagram DM Scattered Images Stack */}
          <View style={s.dmStackWrapper}>
            <TouchableOpacity activeOpacity={0.95} onPress={cycleImage} style={s.dmStackContainer}>
              {deck.map((card, index) => (
                <View
                  key={`${card.url}-${index}`}
                  style={[
                    s.imageCard,
                    {
                      zIndex: card.zIndex,
                      transform: [
                        { rotate: card.rotation },
                        { translateX: card.offsetX },
                        { translateY: card.offsetY }
                      ]
                    }
                  ]}
                >
                  <Image
                    source={{ uri: card.url }}
                    style={s.cardImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </TouchableOpacity>

            {/* Premium Instruction Badge */}
            {images.length > 1 && (
              <View style={s.tapIndicator}>
                <Ionicons name="swap-horizontal" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={s.tapIndicatorText}>Tap to flip ({activeImageIndex + 1}/{images.length})</Text>
              </View>
            )}
          </View>
        </View>

        {/* --- ULTRA-REFINED CONTENT LAYOUT --- */}
        <View style={s.contentCard}>
          
          {/* 1. Header Title & Rating Badge Row */}
          <View style={s.titleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.petName}>{pet.pet_name}</Text>
              <View style={s.priceSubRow}>
                <Text style={s.priceText}>Free Adoption</Text>
                <Text style={s.priceInfo}> · Paltuu Verified</Text>
              </View>
            </View>
            
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={13} color="#a03048" style={{ marginRight: 4 }} />
              <Text style={s.ratingText}>5.0 (Super Pet)</Text>
            </View>
          </View>

          {/* 2. Seller Section */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>Seller</Text>
            <View style={s.sellerRow}>
              <View style={s.sellerAvatarBox}>
                <Text style={s.sellerInitials}>
                  {(pet.owner_name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={s.sellerInfo}>
                <Text style={s.sellerName}>{pet.owner_name || 'Paltuu Member'}</Text>
                <Text style={s.sellerSubtitle}>Response rate: Fast · active today</Text>
              </View>
              <View style={s.sellerActions}>
                <TouchableOpacity style={s.sellerActionBtn} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity style={s.sellerActionBtn} activeOpacity={0.7}>
                  <Ionicons name="call-outline" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. Product Details Section */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>Product Details</Text>
            <Text style={s.storyText}>
              {pet.description || "No description provided. This lovely pet is looking for a caring, warm, and happy family to join. Adoption changes lives!"}
            </Text>
          </View>

          {/* 4. Characteristics (Pills matching "Select Size") */}
          <View style={s.sectionBlock}>
            <Text style={s.sectionHeader}>Characteristics</Text>
            <View style={s.tagCloud}>
              {traits.map((trait, idx) => (
                <View 
                  key={`${trait.label}-${idx}`} 
                  style={[
                    s.sizePill, 
                    trait.highlighted ? s.sizePillSelected : s.sizePillDefault
                  ]}
                >
                  <Text style={[
                    s.sizePillText, 
                    trait.highlighted ? s.sizePillTextSelected : s.sizePillTextDefault
                  ]}>
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
        
        <TouchableOpacity 
          onPress={handleToggleSave}
          style={s.saveBtn}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isSaved ? "heart" : "heart-outline"} 
            size={24} 
            color="#a03048" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push({ 
            pathname: '/(app)/apply-adopt', 
            params: { pet_id: pet.pet_id, pet_name: pet.pet_name } 
          })}
          style={{ flex: 1 }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#a03048', '#bf3f5b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.applyBtn}
          >
            <Ionicons name="paw" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={s.applyBtnText}>Apply to Adopt</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  errorBtn: {
    marginTop: 24,
    backgroundColor: '#a03048',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Breathtaking U-Shaped Burgundy Header with Smooth Shadow
  headerCard: {
    backgroundColor: '#a03048',
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    paddingBottom: 28,
    shadowColor: '#30050d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
    height: 48,
  },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scattered DM Images Deck
  dmStackWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    height: 250,
  },
  dmStackContainer: {
    width: 210,
    height: 210,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    position: 'absolute',
    width: 195,
    height: 195,
    borderRadius: 28,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#30050d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 16,
  },
  tapIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Montserrat_600SemiBold',
  },
  // Content Card
  contentCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  petName: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  priceSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
  },
  priceInfo: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF0F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: '#a03048',
  },
  // Section layout
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    marginBottom: 10,
  },
  storyText: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  // Seller Row
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sellerAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(160, 48, 72, 0.08)',
  },
  sellerInitials: {
    color: '#a03048',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
    marginBottom: 2,
  },
  sellerSubtitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    color: '#9CA3AF',
  },
  sellerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sellerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Size Pills
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizePillDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sizePillSelected: {
    backgroundColor: '#FAF0F2',
    borderWidth: 1,
    borderColor: '#a03048',
  },
  sizePillText: {
    fontSize: 12,
  },
  sizePillTextDefault: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#4B5563',
  },
  sizePillTextSelected: {
    fontFamily: 'Montserrat_700Bold',
    color: '#a03048',
  },
  // Floating bottom footer bar
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  saveBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FAF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a03048',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.2,
  },
});
