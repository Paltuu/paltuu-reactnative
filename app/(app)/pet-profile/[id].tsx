import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petProfilesApi, PetProfile, PetProfilePhoto } from '../../../src/api/petProfiles';
import { useAuthStore } from '../../../src/stores/authStore';
import PostCard from '../../../src/components/social/PostCard';
import { SocialPost } from '../../../src/api/social';

const { width } = Dimensions.get('window');
const GALLERY_IMAGE_WIDTH = (width - 48) / 3;

export default function PetProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const petId = params.id as string;

  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [photos, setPhotos] = useState<PetProfilePhoto[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'gallery' | 'about'>('posts');

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOwner = user?.id && profile?.owner_id && Number(user.id) === Number(profile.owner_id);

  useEffect(() => {
    fetchProfile();
  }, [petId]);

  useEffect(() => {
    if (activeTab === 'gallery') {
      fetchPhotos();
    } else if (activeTab === 'posts') {
      fetchPosts(true);
    }
  }, [activeTab, petId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchProfile();
      if (activeTab === 'gallery') {
        await fetchPhotos();
      } else if (activeTab === 'posts') {
        await fetchPosts(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const data = await petProfilesApi.getPetProfile(petId);
      setProfile(data);
    } catch (error: any) {
      console.error('Fetch Profile Error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load pet profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      setIsLoadingPhotos(true);
      const res = await petProfilesApi.getPetPhotos(petId);
      setPhotos(res.photos);
    } catch (error) {
      console.error('Fetch Photos Error:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const fetchPosts = async (reset = false) => {
    if (isLoadingPosts) return;
    try {
      setIsLoadingPosts(true);
      const cursor = reset ? null : nextCursor;
      const res = await petProfilesApi.getTaggedPosts(petId, cursor);
      if (reset) {
        setPosts(res.posts);
      } else {
        setPosts((prev) => [...prev, ...res.posts]);
      }
      setNextCursor(res.next_cursor);
      setHasMorePosts(res.has_more);
    } catch (error) {
      console.error('Fetch Tagged Posts Error:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleListForAdoption = () => {
    Alert.alert(
      'List for Adoption',
      'Would you like to list this pet for adoption? This will automatically create an adoption listing pre-filled with this pet profile\'s details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'List Pet',
          onPress: async () => {
            try {
              setIsConverting(true);
              const res = await petProfilesApi.convertPetToAdoption(petId);
              if (res.success) {
                Alert.alert('Success', 'Adoption listing created successfully!', [
                  {
                    text: 'View Listing',
                    onPress: () => router.push({ pathname: `/(app)/pet-details`, params: { id: res.pet_id } }),
                  },
                  {
                    text: 'OK',
                    onPress: () => fetchProfile(),
                  },
                ]);
              }
            } catch (error: any) {
              console.error('Convert Adoption Error:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to list pet for adoption.');
            } finally {
              setIsConverting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingProfile) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#a03048" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-bg px-5" style={{ paddingTop: insets.top }}>
        <Text className="text-gray-500 font-body mb-4">Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-xl">
          <Text className="text-white font-headingSemi">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text className="text-xl font-heading text-dark">{profile.name}</Text>
        <View className="flex-row gap-3">
          {isOwner && (
            <>
              <TouchableOpacity
                onPress={() => router.push({ pathname: `/(app)/pet-profile/create`, params: { editId: profile.pet_profile_id } })}
                className="p-1"
              >
                <Ionicons name="create-outline" size={24} color="#111111" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: `/(app)/pet-profile/gallery-manager`, params: { petId: profile.pet_profile_id } })}
                className="p-1"
              >
                <Ionicons name="images-outline" size={24} color="#111111" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#a03048']}
            tintColor="#a03048"
          />
        }
      >
        {/* Hero Banner Section */}
        <View className="items-center py-6 bg-gray-50/50 border-b border-gray-100">
          <View className="w-24 h-24 rounded-full border border-gray-200 overflow-hidden bg-primary/10 mb-3">
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                onError={(e) => console.log('[PetProfile] Avatar load error:', e.error)}
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="paw" size={48} color="#a03048" />
              </View>
            )}
          </View>
          <Text className="text-2xl font-heading text-dark">{profile.name}</Text>
          <Text className="text-sm font-body text-gray-500 mt-1">
            {profile.breed ? `${profile.breed} • ` : ''}
            {profile.species}
          </Text>
          {profile.age && (
            <View className="bg-primary/10 rounded-full px-3 py-1 mt-2.5">
              <Text className="text-xs text-primary font-headingSemi">{profile.age}</Text>
            </View>
          )}
        </View>

        {/* Adoption Conversion Banner */}
        {isOwner && !profile.is_listed_for_adoption && (
          <View className="mx-5 my-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-headingSemi text-dark">Looking to rehome?</Text>
              <Text className="text-xs font-body text-gray-500 mt-1">
                Convert this profile into a structured adoption listing.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleListForAdoption}
              disabled={isConverting}
              className="bg-primary px-4 py-2.5 rounded-xl"
            >
              {isConverting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-headingSemi text-xs">List Pet</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {profile.is_listed_for_adoption && profile.adoption_listing_id && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: `/(app)/pet-details`, params: { id: profile.adoption_listing_id } })}
            className="mx-5 my-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row justify-between items-center"
          >
            <View className="flex-1 mr-3">
              <Text className="text-sm font-headingSemi text-amber-800">Listed for Adoption</Text>
              <Text className="text-xs font-body text-amber-700/80 mt-1">
                This pet is currently listed for adoption. Tap here to view the listing.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* Custom Tabs Navigation */}
        <View className="flex-row border-b border-gray-100 bg-surface">
          {(['posts', 'gallery', 'about'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-4 items-center"
              style={{ borderBottomWidth: activeTab === tab ? 2 : 0, borderBottomColor: '#a03048' }}
            >
              <Text
                className={`text-sm capitalize ${
                  activeTab === tab ? 'text-primary font-headingSemi' : 'text-gray-500 font-body'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Contents */}
        {activeTab === 'posts' && (
          <View className="mt-4">
            {posts.length > 0 ? (
              <FlatList
                data={posts}
                scrollEnabled={false}
                keyExtractor={(item) => item.post_id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPress={() => router.push({ pathname: '/(app)/post/[id]', params: { id: item.post_id } })}
                  />
                )}
                onEndReached={() => {
                  if (hasMorePosts) fetchPosts();
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isLoadingPosts ? (
                    <View className="py-4">
                      <ActivityIndicator size="small" color="#a03048" />
                    </View>
                  ) : null
                }
              />
            ) : isLoadingPosts ? (
              <View className="py-20 justify-center items-center">
                <ActivityIndicator size="small" color="#a03048" />
              </View>
            ) : (
              <View className="py-20 items-center justify-center">
                <Ionicons name="chatbubble-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 font-body mt-4 text-center px-5">
                  No posts tag this pet yet.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'gallery' && (
          <View className="mt-4 px-5">
            {isLoadingPhotos && photos.length === 0 ? (
              <View className="py-20 justify-center items-center">
                <ActivityIndicator size="small" color="#a03048" />
              </View>
            ) : photos.length > 0 ? (
              <>
                {isLoadingPhotos && (
                  <View className="py-2 items-center">
                    <ActivityIndicator size="small" color="#a03048" />
                  </View>
                )}
                <FlatList
                  data={photos}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.photo_id.toString()}
                  numColumns={3}
                  columnWrapperStyle={{ gap: 8 }}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        width: GALLERY_IMAGE_WIDTH,
                        height: GALLERY_IMAGE_WIDTH,
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        backgroundColor: '#FFFFFF',
                        marginBottom: 8,
                      }}
                    >
                      <Image
                        source={{ uri: item.photo_url }}
                        style={{ width: GALLERY_IMAGE_WIDTH, height: GALLERY_IMAGE_WIDTH }}
                        contentFit="cover"
                        onError={(e) => console.log('[PetProfile] Gallery image error:', item.photo_url, e.error)}
                        onLoad={() => console.log('[PetProfile] Gallery image loaded:', item.photo_url)}
                      />
                    </View>
                  )}
                />
              </>
            ) : (
              <View className="py-20 items-center justify-center">
                <Ionicons name="images-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 font-body mt-4 text-center">
                  No gallery photos available.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View className="mt-4 px-5 gap-4">
            {profile.bio && (
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <Text className="text-xs font-headingSemi text-gray-500 uppercase tracking-wider mb-2">Bio</Text>
                <Text className="text-sm font-body text-dark leading-5">{profile.bio}</Text>
              </View>
            )}

            <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 gap-3">
              <View className="flex-row justify-between border-b border-gray-100/50 pb-2">
                <Text className="text-sm font-body text-gray-500">Gender</Text>
                <Text className="text-sm font-headingSemi text-dark capitalize">{profile.gender}</Text>
              </View>
              {profile.date_of_birth && (
                <View className="flex-row justify-between border-b border-gray-100/50 pb-2">
                  <Text className="text-sm font-body text-gray-500">Date of Birth</Text>
                  <Text className="text-sm font-headingSemi text-dark">
                    {profile.date_of_birth.split('T')[0]}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between pb-1">
                <Text className="text-sm font-body text-gray-500">Species</Text>
                <Text className="text-sm font-headingSemi text-dark">{profile.species}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
