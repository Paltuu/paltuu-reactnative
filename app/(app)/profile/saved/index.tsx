import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { socialApi, Collection } from '../../../../src/api/social';

export default function SavedCollectionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // 1. Fetch Collections
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['social-collections'],
    queryFn: () => socialApi.getCollections(),
  });

  const collections = data?.collections || [];

  // 2. Create Collection Mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => socialApi.createCollection(name),
    onSuccess: () => {
      setNewCollectionName('');
      setCreateModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.error?.message || 'Failed to create collection';
      Alert.alert('Error', errMsg);
    }
  });

  const handleCreate = () => {
    if (!newCollectionName.trim() || createMutation.isPending) return;
    createMutation.mutate(newCollectionName.trim());
  };

  const renderCollectionCard = ({ item }: { item: Collection }) => {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/profile/saved/${item.collection_id}`)}
        activeOpacity={0.8}
        className="flex-row items-center justify-between p-4 bg-surface rounded-2xl border border-gray-100 mb-4"
      >
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
            <Ionicons 
              name={item.is_default ? "bookmarks" : "folder"} 
              size={24} 
              color="#A03048" 
            />
          </View>
          <View>
            <Text className="text-base font-headingSemi text-dark">{item.name}</Text>
            <Text className="text-xs font-body text-gray-500">{item.post_count} posts</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-bg">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 h-[56px] bg-surface border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="font-heading text-xl text-dark">Saved Posts</Text>
        </View>

        <TouchableOpacity 
          onPress={() => setCreateModalVisible(true)}
          className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center"
        >
          <Ionicons name="add" size={20} color="#A03048" />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#A03048" />
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.collection_id.toString()}
          renderItem={renderCollectionCard}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="py-24 items-center px-10">
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="bookmark-outline" size={32} color="#A03048" />
              </View>
              <Text className="font-heading text-base text-dark mb-1 text-center">Save items for later</Text>
              <Text className="font-body text-gray-500 text-xs text-center leading-5 mb-6">
                Bookmark posts and organize them into neat folders for easy access anytime.
              </Text>
              
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                className="bg-primary px-6 h-12 rounded-xl items-center justify-center"
              >
                <Text className="text-sm font-headingSemi text-white">Create Collection</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Collection Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-surface rounded-2xl w-full p-5 shadow-lg">
            <Text className="font-heading text-lg text-dark mb-2">New Collection</Text>
            <Text className="font-body text-gray-500 text-xs mb-4">
              Enter a name to group your saved social posts.
            </Text>

            <TextInput
              autoFocus
              placeholder="e.g. Health Tips, Cute Dogs, Recipes"
              className="bg-bg border border-gray-100 rounded-xl px-4 h-12 text-sm font-body text-dark mb-6"
              placeholderTextColor="#9CA3AF"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              maxLength={50}
            />

            <View className="flex-row items-center justify-end gap-3">
              <TouchableOpacity 
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewCollectionName('');
                }}
                className="px-4 py-2"
              >
                <Text className="text-sm font-headingSemi text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!newCollectionName.trim() || createMutation.isPending}
                className="bg-primary px-5 py-2.5 rounded-xl"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-sm font-headingSemi text-white">Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
