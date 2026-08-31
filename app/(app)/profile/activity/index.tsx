import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={s.sectionHeader}>{title}</Text>
  );
}

function ActivityRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.65}>
      <View style={s.rowLeft}>
        <Feather name={icon} size={22} color="#111" />
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function ActivityHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/profile'))} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text className="font-heading text-xl text-dark">Your activity</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={s.hero}>
          <Text style={s.heroTitle}>One place to manage your activity</Text>
          <Text style={s.heroSubtitle}>
            View your likes, comments, tags, and recently deleted content.
          </Text>
        </View>

        <SectionHeader title="Interactions" />
        <ActivityRow
          icon="heart"
          label="Likes"
          onPress={() => router.push('/(app)/profile/activity/likes' as any)}
        />
        <ActivityRow
          icon="message-circle"
          label="Comments"
          onPress={() => router.push('/(app)/profile/activity/comments' as any)}
        />
        <ActivityRow
          icon="user"
          label="Tags"
          onPress={() => router.push('/(app)/profile/activity/tags' as any)}
        />

        <View style={s.divider} />

        <SectionHeader title="Removed and archived content" />
        <ActivityRow
          icon="trash-2"
          label="Recently deleted"
          onPress={() => router.push('/(app)/profile/activity/recently-deleted' as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  heroTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#9CA3AF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#111',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    marginHorizontal: 20,
  },
});

export default withFocusUnmount(ActivityHubScreen);
