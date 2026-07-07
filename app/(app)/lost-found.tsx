import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePetStore } from '../../src/stores/petStore';
import { useShallow } from 'zustand/react/shallow';
import { LFPCard } from '../../src/components/lost-found/LFPCard';
import { useHeaderContext } from '../../src/context/HeaderContext';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

function LostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollHandler } = useHeaderContext();

  const { lostFoundPosts, isLoading, fetchLostFoundPosts } = usePetStore(
    useShallow((state) => ({
      lostFoundPosts: state.lostFoundPosts,
      isLoading: state.isLoading,
      fetchLostFoundPosts: state.fetchLostFoundPosts,
    }))
  );
  const [filter, setFilter] = useState<'lost' | 'found'>('lost');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLostFoundPosts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLostFoundPosts();
    setRefreshing(false);
  };

  const handleContact = (contactInfo: string) => {
    if (!contactInfo) {
      Alert.alert('Unavailable', 'No contact info provided.');
      return;
    }
    Alert.alert(
      'Contact Owner',
      `Would you like to call the owner at: ${contactInfo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${contactInfo}`).catch(() => {
              Alert.alert('Error', 'Unable to open dialer.');
            });
          },
        },
      ]
    );
  };

  const renderCard = ({ item }: { item: any }) => {
    const mappedPost = {
      post_id: item.post_id,
      post_type: item.post_type as 'lost' | 'found',
      pet_description: item.pet_description,
      city: item.city,
      location: item.location,
      contact_info: item.contact_info,
      main_image: item.image,
      post_date: item.date || item.post_date || new Date().toISOString(),
    };
    return (
      <LFPCard
        post={mappedPost}
        onPress={() => handleContact(mappedPost.contact_info)}
      />
    );
  };

  return (
    <View style={{ flex: 1 }} className="bg-white">
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#A03048" />
          <Text className="font-body text-gray-500 mt-3">Fetching reports...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={lostFoundPosts.filter((p: any) => p.post_type === filter)}
          renderItem={renderCard}
          keyExtractor={(item) => item.post_id?.toString()}
          numColumns={2}
          onScroll={scrollHandler}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 100,
            paddingTop: insets.top + 8,
          }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            <View>
              {/* Page heading */}
              <View style={{ paddingHorizontal: 6, paddingTop: 8, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => router.replace('/(app)/pets')}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#FFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <Ionicons name="arrow-back" size={22} color="#111" />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 }}>
                      Lost & Found
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      Help reunite pets with their families
                    </Text>
                  </View>
                </View>
              </View>

              {/* Filter tabs */}
              <View className="flex-row bg-white rounded-2xl mx-1.5 mb-3 p-1 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {(['lost', 'found'] as const).map((tab) => {
                  const isActive = filter === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setFilter(tab)}
                      className={`flex-1 py-2.5 rounded-xl items-center ${isActive ? 'bg-primary' : ''}`}
                    >
                      <Text
                        className={`font-headingSemi text-xs ${isActive ? 'text-white' : 'text-gray-500'}`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Ionicons name="search-outline" size={48} color="#9CA3AF" />
              <Text className="font-heading text-lg text-dark mt-4">No Reports Found</Text>
              <Text className="font-body text-gray-500 text-sm text-center mt-2 px-10">
                No {filter} pet reports have been filed recently.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Button */}
      <View
        className="absolute bottom-6 left-5 right-5 flex-row justify-end items-center"
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => router.push('/(app)/create-lost-found')}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#a03048',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default withFocusUnmount(LostFoundScreen);
