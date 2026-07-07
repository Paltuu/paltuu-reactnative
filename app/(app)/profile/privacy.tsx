import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

function PrivacyScreen() {
  const router = useRouter();

  const [shareData, setShareData] = React.useState(true);
  const [allowSearch, setAllowSearch] = React.useState(true);
  const [showLocation, setShowLocation] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Privacy Center</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex-row mb-8">
          <Ionicons name="shield-checkmark" size={24} color="#A03048" />
          <View className="ml-3 flex-1">
            <Text className="font-headingSemi text-sm text-dark mb-1">Your privacy matters</Text>
            <Text className="font-body text-xs text-gray-600 leading-relaxed">
              Control how your information is shared and who can see your profile and activity on Paltuu.
            </Text>
          </View>
        </View>

        {/* Discovery & Visibility */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Discovery</Text>
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-1 pr-4">
              <Text className="font-body text-gray-700">Allow users to find me by email</Text>
            </View>
            <Switch
              value={allowSearch}
              onValueChange={setAllowSearch}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-1 pr-4">
              <Text className="font-body text-gray-700">Show my location on profile</Text>
            </View>
            <Switch
              value={showLocation}
              onValueChange={setShowLocation}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data & Analytics */}
        <Text className="font-headingSemi text-sm text-primary mb-4 uppercase tracking-wider">Data & Analytics</Text>
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-1 pr-4">
              <Text className="font-body text-gray-700">Share usage data with Paltuu</Text>
              <Text className="font-body text-xs text-gray-400 mt-1">Help us improve the app by sharing anonymous usage data.</Text>
            </View>
            <Switch
              value={shareData}
              onValueChange={setShareData}
              trackColor={{ true: '#A03048', false: '#E5E7EB' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="font-body text-gray-700">Download my data</Text>
            <Feather name="download" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://paltuu.pk/privacy-policy')}
            className="flex-row items-center justify-between p-4"
          >
            <Text className="font-body text-gray-700">View Privacy Policy</Text>
            <Feather name="external-link" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default withFocusUnmount(PrivacyScreen);
