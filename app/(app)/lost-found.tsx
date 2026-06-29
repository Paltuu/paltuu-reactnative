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
import { LFPCard } from '../../src/components/lost-found/LFPCard';
import { useHeaderContext } from '../../src/context/HeaderContext';

export default function LostFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollHandler } = useHeaderContext();

  const { lostFoundPosts, isLoading, fetchLostFoundPosts } = usePetStore();
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
    <View style={{ flex: 1 }} className="bg-gray-50">
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
            /* Filter tabs */
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

      {/* Floating Buttons */}
      <View
        className="absolute bottom-6 left-5 right-5 flex-row justify-between items-center"
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => router.push('/(app)/create-lost-found')}
          className="bg-white px-4 py-3 rounded-2xl flex-row items-center border-2 border-primary shadow-lg"
          style={{ elevation: 5 }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#a03048" />
          <Text className="ml-2 font-headingSemi text-xs text-primary">Report Pet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
