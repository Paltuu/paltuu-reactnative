import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Share
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petApi } from '../../src/api/pets';

const { width } = Dimensions.get('window');

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await petApi.getPetDetails(parseInt(id as string));
        setPet(data);
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
        message: `Check out ${pet.pet_name} on Paltuu!`,
        url: `https://paltuu.pk/browse-pets/${id}`
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
  }

  if (!pet) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-10">
        <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
        <Text className="text-xl font-black text-gray-900 mt-4 text-center">Pet Not Found</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-6 bg-primary px-8 py-4 rounded-2xl"
        >
          <Text className="text-white font-black">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = pet.images?.length > 0 
    ? pet.images.sort((a: any, b: any) => a.order - b.order).map((img: any) => img.image_url)
    : [pet.image_url || 'https://via.placeholder.com/400'];

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={{ height: width * 1.1 }}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              setCurrentImageIndex(Math.round(x / width));
            }}
            scrollEventThrottle={16}
          >
            {images.map((img: string, idx: number) => (
              <Image 
                key={idx}
                source={{ uri: img }}
                style={{ width, height: width * 1.1 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>

          {/* Header Buttons */}
          <View 
            className="absolute left-0 right-0 px-5 flex-row justify-between items-center"
            style={{ top: insets.top + 10 }}
          >
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-12 h-12 bg-white/80 rounded-2xl items-center justify-center backdrop-blur-md"
            >
              <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={onShare}
                className="w-12 h-12 bg-white/80 rounded-2xl items-center justify-center backdrop-blur-md"
              >
                <Ionicons name="share-outline" size={24} color="#1a1a1a" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="w-12 h-12 bg-white/80 rounded-2xl items-center justify-center backdrop-blur-md"
              >
                <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pagination dots */}
          {images.length > 1 && (
            <View className="absolute bottom-6 left-0 right-0 flex-row justify-center gap-2">
              {images.map((_: any, idx: number) => (
                <View 
                  key={idx}
                  className={`h-2 rounded-full ${currentImageIndex === idx ? 'w-6 bg-primary' : 'w-2 bg-white/60'}`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-6 py-8">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-3xl font-black text-gray-900">{pet.pet_name}</Text>
              <Text className="text-lg text-gray-400 font-bold">{pet.pet_breed || 'Mixed Breed'}</Text>
            </View>
            <View className="bg-primary/10 px-4 py-2 rounded-xl">
              <Text className="text-primary font-black uppercase tracking-widest text-[10px]">
                {pet.listing_type}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-4 mb-8 mt-4">
            <View className="flex-1 bg-gray-50 p-4 rounded-3xl border border-gray-100 items-center">
              <Text className="text-[10px] uppercase font-black text-gray-400 mb-1">Age</Text>
              <Text className="text-sm font-black text-gray-900">{pet.age_months} Months</Text>
            </View>
            <View className="flex-1 bg-gray-50 p-4 rounded-3xl border border-gray-100 items-center">
              <Text className="text-[10px] uppercase font-black text-gray-400 mb-1">Sex</Text>
              <Text className="text-sm font-black text-gray-900 capitalize">{pet.sex}</Text>
            </View>
            <View className="flex-1 bg-gray-50 p-4 rounded-3xl border border-gray-100 items-center">
              <Text className="text-[10px] uppercase font-black text-gray-400 mb-1">City</Text>
              <Text className="text-sm font-black text-gray-900">{pet.city}</Text>
            </View>
          </View>

          <View className="mb-8">
            <Text className="text-xl font-black text-gray-900 mb-4">The Story</Text>
            <Text className="text-base text-gray-500 leading-6 font-medium italic">
              "{pet.description}"
            </Text>
          </View>

          {pet.tags && pet.tags.length > 0 && (
            <View className="mb-8">
              <Text className="text-xl font-black text-gray-900 mb-4">Personality & Health</Text>
              <View className="flex-row flex-wrap gap-2">
                {pet.tags.map((tag: any) => (
                  <View key={tag.tag_id} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl">
                    <Text className="text-xs font-bold text-gray-500">{tag.tag_name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Owner info */}
          <View className="bg-gray-50 p-6 rounded-[2.5rem] flex-row items-center mb-10">
            <View className="w-14 h-14 bg-white rounded-2xl items-center justify-center mr-4 border border-gray-100 shadow-sm">
              <Ionicons name="person" size={28} color="#a03048" />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] uppercase font-black text-gray-400 mb-0.5">Listed By</Text>
              <Text className="text-lg font-black text-gray-900">{pet.owner_name || 'Member User'}</Text>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-gray-100 shadow-sm">
              <Ionicons name="chatbubble-ellipses" size={24} color="#a03048" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="h-32" />
      </ScrollView>

      {/* Floating Bottom Button */}
      <View 
        className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-lg border-t border-gray-50"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity 
          onPress={() => router.push({ 
            pathname: '/(app)/apply-adopt', 
            params: { pet_id: pet.pet_id, pet_name: pet.pet_name } 
          })}
          className="bg-primary h-[72px] rounded-[2rem] flex-row items-center justify-center shadow-2xl shadow-primary/40"
        >
          <Ionicons name="heart" size={24} color="white" className="mr-3" />
          <Text className="text-white text-lg font-black uppercase tracking-widest ml-3">Apply to Adopt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
