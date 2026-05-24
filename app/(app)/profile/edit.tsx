import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: profileData } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });

  const profile = profileData?.profile;

  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.social_username || profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');

  // Keep state synced with loaded profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.social_username || profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => socialApi.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to update profile. Please try again.');
    }
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      social_username: username.trim().toLowerCase(),
      bio: bio.trim(),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100">
          <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="p-1">
            <Feather name="x" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="font-heading text-xl text-dark">Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={updateMutation.isPending}
            className="p-1"
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#A03048" />
            ) : (
              <Text className="font-headingSemi text-base text-primary">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {/* Helper hint for profile photo */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center border border-primary/20 mb-3">
              <Ionicons name="camera-outline" size={28} color="#A03048" />
            </View>
            <Text className="font-body text-xs text-gray-400 text-center px-4">
              Tip: You can change your profile and cover photos directly by tapping them on your profile page!
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="font-headingSemi text-sm text-gray-700 mb-2">Display Name</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
                className="flex-1 font-body text-dark text-base"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="font-headingSemi text-sm text-gray-700 mb-2">Username</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Text className="font-headingSemi text-gray-400 text-base mr-1">@</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-body text-dark text-base"
              />
            </View>
            <Text className="font-body text-xs text-gray-400 mt-1 ml-1">This is how people can find and mention you.</Text>
          </View>

          <View className="mb-8">
            <Text className="font-headingSemi text-sm text-gray-700 mb-2">Bio</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Write a little bit about yourself or your pets..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="font-body text-dark text-base min-h-[100px]"
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
