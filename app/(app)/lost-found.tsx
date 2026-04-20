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
    <SafeAreaView className="flex-1 bg-bg px-5 pt-10">
      <Text className="font-heading text-xl text-dark">Lost & Found</Text>
      <Text className="font-body text-gray-500 mt-2">Coming Soon</Text>
    </SafeAreaView>
  );
}
