import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { withFocusUnmount } from '../../../src/components/common/withFocusUnmount';

const WORDMARK = require('../../../assets/paltuu_bilkul_tight.svg');

const SOCIALS = [
  { icon: 'logo-instagram' as const, url: 'https://instagram.com/paltuupk' },
  { icon: 'logo-twitter' as const, url: 'https://twitter.com/paltuupk' },
  { icon: 'logo-facebook' as const, url: 'https://facebook.com/paltuu.pk' },
];

function Row({
  label,
  onPress,
  trailing = 'chevron-right',
  last = false,
}: {
  label: string;
  onPress: () => void;
  trailing?: 'chevron-right' | 'external-link';
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className={`flex-row items-center justify-between px-4 py-4 ${last ? '' : 'border-b border-gray-100'}`}
    >
      <Text className="font-bodyMedium text-[15px] text-dark">{label}</Text>
      <Feather name={trailing} size={18} color="#999999" />
    </TouchableOpacity>
  );
}

function AboutScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const year = new Date().getFullYear();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'))}
          className="mr-4 p-1"
        >
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">About</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand hero */}
        <View className="items-center pt-12 pb-10">
          <Image
            source={WORDMARK}
            style={{ width: 168, height: 90 }}
            contentFit="contain"
            tintColor="#a03048"
          />
          <Text className="font-body text-gray-400 text-[13px] text-center mt-3 leading-5 max-w-[280px]">
            Pet adoption, care, and community — built for Pakistan&apos;s pets and the people who love them.
          </Text>
          <View className="mt-5 bg-primarySoft rounded-full px-3.5 py-1.5">
            <Text className="font-headingSemi text-primary text-xs tracking-wide">Version {appVersion}</Text>
          </View>
        </View>

        {/* Legal & info */}
        <Text className="font-headingSemi text-[11px] text-gray-400 mb-2 ml-1 uppercase tracking-widest">
          Legal &amp; Info
        </Text>
        <View className="bg-surfaceElevated rounded-2xl mb-8 border border-gray-100 overflow-hidden">
          <Row
            label="Terms of Service"
            trailing="external-link"
            onPress={() => WebBrowser.openBrowserAsync('https://paltuu.pk/terms-and-conditions')}
          />
          <Row
            label="Data Policy"
            trailing="external-link"
            onPress={() => WebBrowser.openBrowserAsync('https://paltuu.pk/app-privacy-policy')}
          />
          <Row
            label="Open Source Libraries"
            last
            onPress={() => router.navigate('/(app)/profile/licenses')}
          />
        </View>

        {/* Follow us */}
        <Text className="font-headingSemi text-[11px] text-gray-400 mb-3 ml-1 uppercase tracking-widest">
          Follow Us
        </Text>
        <View className="flex-row justify-center gap-4 mb-10">
          {SOCIALS.map((s) => (
            <TouchableOpacity
              key={s.icon}
              onPress={() => Linking.openURL(s.url)}
              activeOpacity={0.7}
              className="bg-primarySoft w-12 h-12 rounded-full items-center justify-center"
            >
              <Ionicons name={s.icon} size={22} color="#a03048" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Temporary OTA delivery diagnostic */}
        <View className="bg-gray-50 rounded-2xl mb-8 border border-gray-100 p-4">
          <Text className="font-body text-gray-400 text-xs">Diagnostic build: 2</Text>
          <Text className="font-body text-gray-400 text-xs">Native build version: {Constants.nativeBuildVersion || 'n/a'}</Text>
          <Text className="font-body text-gray-400 text-xs">Runtime version: {Updates.runtimeVersion || 'n/a'}</Text>
          <Text className="font-body text-gray-400 text-xs">Channel: {Updates.channel || 'n/a'}</Text>
          <Text className="font-body text-gray-400 text-xs">Update ID: {Updates.updateId || 'embedded (no OTA applied)'}</Text>
          <Text className="font-body text-gray-400 text-xs">Update created: {Updates.createdAt ? Updates.createdAt.toISOString() : 'n/a'}</Text>
          <Text className="font-body text-gray-400 text-xs">Is embedded launch: {String(Updates.isEmbeddedLaunch)}</Text>
        </View>

        <Text className="font-body text-gray-400 text-xs text-center">
          © {year} Paltuu Inc. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withFocusUnmount(AboutScreen);
