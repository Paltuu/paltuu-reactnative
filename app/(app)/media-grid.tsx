import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../src/api/social';
import { MediaGrid } from '../../src/components/explore/MediaGrid';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

function MediaGridScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Same key as the explore page — renders straight from cache when opened via See All
  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'discovery'],
    queryFn: () => socialApi.getExploreDiscovery(),
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.media_posts ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View
        style={{
          backgroundColor: '#FFF',
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111' }}>Media</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#A03048" />
        </View>
      ) : posts.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="images-outline" size={48} color="#E0E0E0" />
          <Text style={{ color: '#999', marginTop: 12 }}>No media posts yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}>
          <MediaGrid posts={posts} onPostPress={(p) => router.push(`/post/${p.post_id}`)} />
        </ScrollView>
      )}
    </View>
  );
}

export default withFocusUnmount(MediaGridScreen);
