import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import { socialApi } from '../../../src/api/social';
import CustomInput from '../../../src/components/common/CustomInput';
import PrimaryButton from '../../../src/components/common/PrimaryButton';

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
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.navigate('/(app)/profile/settings')} style={s.headerBtn}>
            <Feather name="arrow-left" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Personal Info</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={s.infoBanner}>
            <Ionicons name="lock-closed" size={20} color="#a03048" />
            <Text style={s.infoBannerText}>
              This information is private and will not be displayed on your public profile.
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 20, marginBottom: 32 }}>
            <CustomInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />

            <CustomInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+92 300 1234567"
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />
          </View>

          {/* Save Button */}
          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            loading={updateMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    color: '#111827',
  },
  scrollContent: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF0F2',
    borderWidth: 1,
    borderColor: '#f3e0e4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    color: '#4B5563',
    lineHeight: 18,
  },
});
