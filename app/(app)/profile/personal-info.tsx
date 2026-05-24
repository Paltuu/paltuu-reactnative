import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone_number || '');

  const updateMutation = useMutation({
    mutationFn: (payload: any) => socialApi.updateProfile(payload),
    onSuccess: async () => {
      // Re-fetch the auth user profile to keep authStore in sync
      await fetchProfile();
      Alert.alert('Success', 'Personal information updated successfully.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to update information. Please try again.');
    }
  });

  const handleSave = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email cannot be empty.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    updateMutation.mutate({
      email: email.trim().toLowerCase(),
      phone_number: phone.trim(),
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
          <TouchableOpacity onPress={() => router.navigate('/(app)/profile/settings')} className="mr-4 p-1">
            <Feather name="arrow-left" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="font-heading text-xl text-dark">Personal Info</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex-row mb-8 items-center">
            <Ionicons name="lock-closed" size={20} color="#A03048" />
            <Text className="font-body text-xs text-gray-600 leading-relaxed ml-3 flex-1">
              This information is private and will not be displayed on your public profile.
            </Text>
          </View>

          {/* Form */}
          <View className="mb-6">
            <Text className="font-headingSemi text-sm text-gray-700 mb-2">Email Address</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 font-body text-dark text-base ml-3"
              />
            </View>
          </View>

          <View className="mb-10">
            <Text className="font-headingSemi text-sm text-gray-700 mb-2">Phone Number</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center">
              <Ionicons name="call-outline" size={20} color="#9CA3AF" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+92 300 1234567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                className="flex-1 font-body text-dark text-base ml-3"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            onPress={handleSave}
            disabled={updateMutation.isPending}
            className={`w-full py-4 rounded-2xl items-center justify-center flex-row ${updateMutation.isPending ? 'bg-primary/70' : 'bg-primary'}`}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-headingSemi text-base">Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
