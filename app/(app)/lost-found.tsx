import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { lostFoundApi } from '../../src/api/lost-found';
import { LFPCard } from '../../src/components/lost-found/LFPCard';

export default function LostFoundScreen() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, lost, found
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await lostFoundApi.getPosts({ 
        type: filter === 'all' ? null : filter 
      });
      setPosts(data);
    } catch (error) {
      console.error('Lost & Found fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-5">
      {/* Header */}
      <View className="mt-4 mb-6 flex-row items-center justify-between">
        <View>
          <Text className="font-heading text-2xl text-dark">Lost & Found</Text>
          <Text className="font-body text-gray-500">Helping pets find their way home</Text>
        </View>
        <TouchableOpacity className="bg-primary w-12 h-12 rounded-full items-center justify-center shadow-md">
          <Feather name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-surface p-1 rounded-2xl mb-6 shadow-sm">
        {['all', 'lost', 'found'].map((t) => (
          <TouchableOpacity 
            key={t}
            onPress={() => setFilter(t)}
            className={`flex-1 py-3 rounded-xl items-center ${filter === t ? 'bg-primary' : 'bg-transparent'}`}
          >
            <Text className={`font-heading text-xs uppercase ${filter === t ? 'text-white' : 'text-gray-400'}`}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A03048" />
        </View>
      ) : (
        <FlatList 
          data={posts}
          keyExtractor={(item) => item.post_id.toString()}
          renderItem={({ item }) => (
            <LFPCard 
              post={item} 
              onPress={() => console.log('LFP selected', item.post_id)} 
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-10">
              <Feather name="search" size={40} color="#E5E7EB" />
              <Text className="font-body text-gray-400 mt-4 text-center">
                No reports found in your area
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
