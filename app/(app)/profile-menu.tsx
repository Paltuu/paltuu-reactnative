// The profile screen's hamburger menu, as a real stacked route rather than a
// <Modal> the profile screen opens/closes with local state. Pushing Settings
// (or any other item here) puts it on top of this screen instead of behind
// it, so popping back reveals this screen already mounted and already open —
// no "reopen on focus" animation needed, and no flash of the bare profile
// screen while that would've replayed. See app/(app)/(tabs)/profile/index.tsx
// for the screen this replaced.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { socialApi } from '../../src/api/social';
import { Avatar } from '../../src/components/common/Avatar';
import { COLORS } from '../../src/constants/colors';

const VerifiedIcon = require('../../assets/icons/verified-check-svgrepo-com.svg');
const DayOneIcon = require('../../assets/icons/day1-badge.svg');

const DS = {
  primary: '#A03048',
  surface: '#FFFFFF',
  dark: '#111111',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray100: '#F3F4F6',
};

const MenuItem = ({
  icon,
  label,
  onPress,
  danger = false,
  right,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) => (
  <TouchableOpacity style={s.menuItemRow} onPress={onPress} activeOpacity={0.65}>
    <View style={s.menuItemLeft}>
      <Ionicons name={icon as any} size={21} color={danger ? DS.primary : DS.dark} />
      <Text style={[s.menuItemText, danger && { color: DS.primary }]}>{label}</Text>
    </View>
    {right ?? <Ionicons name="chevron-forward" size={15} color={DS.gray400} />}
  </TouchableOpacity>
);

export default function ProfileMenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const userId = user?.id;

  // Same query key the profile screen uses — this reads straight from the
  // shared cache it already populated, so it renders instantly instead of
  // waiting on a fresh fetch.
  const { data: profileData } = useQuery({
    queryKey: ['social-profile', userId],
    queryFn: () => socialApi.getProfile(userId!),
    enabled: !!userId,
  });
  const profile = profileData?.profile || (user as any);

  const togglePrivacyMutation = useMutation({
    mutationFn: (newPrivacy: boolean) => socialApi.togglePrivacy(newPrivacy),
    onMutate: async (newPrivacy) => {
      await queryClient.cancelQueries({ queryKey: ['social-profile', userId] });
      const previousProfile = queryClient.getQueryData(['social-profile', userId]);
      queryClient.setQueryData(['social-profile', userId], (old: any) => {
        if (!old) return old;
        return { ...old, profile: { ...old.profile, is_private: newPrivacy } };
      });
      return { previousProfile };
    },
    onError: (err, newPrivacy, context: any) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['social-profile', userId], context.previousProfile);
      }
      Alert.alert('Error', 'Failed to update privacy settings.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['social-profile', userId] });
    },
  });

  const navigateFromMenu = (path: string) => router.push(path as any);
  const close = () => router.back();

  return (
    <View style={s.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Header */}
        <View style={[s.menuHeader, { paddingTop: insets.top + 20 }]}>
          <Avatar uri={profile?.profile_image_url} size={52} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.menuHeaderName} numberOfLines={1}>
              {profile?.name || 'User'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={s.menuHeaderUsername} numberOfLines={1}>
                @{profile?.social_username || profile?.username || 'user'}
              </Text>
              {!!profile?.verified && (
                <ExpoImage source={VerifiedIcon} style={{ width: 12, height: 12 }} tintColor={COLORS.primary} />
              )}
              {!!profile?.founding_club && (
                <ExpoImage source={DayOneIcon} style={{ width: 12, height: 12 }} tintColor={COLORS.primary} />
              )}
            </View>
          </View>
          <TouchableOpacity onPress={close} hitSlop={12} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={DS.dark} />
          </TouchableOpacity>
        </View>

        <View style={s.menuDivider} />

        <MenuItem icon="settings-outline" label="Settings" onPress={() => navigateFromMenu('/(app)/profile/settings')} />
        <MenuItem icon="bookmark-outline" label="Saved Posts" onPress={() => navigateFromMenu('/(app)/profile/saved')} />
        <MenuItem icon="pulse-outline" label="Activity" onPress={() => navigateFromMenu('/(app)/profile/activity')} />
        <MenuItem icon="paw-outline" label="My Adoption Listings" onPress={() => navigateFromMenu('/(app)/my-listings')} />
        <MenuItem icon="mail-outline" label="Adoption Requests" onPress={() => navigateFromMenu('/(app)/adoption-requests')} />
        <MenuItem icon="document-text-outline" label="My Applications" onPress={() => navigateFromMenu('/(app)/my-applications')} />

        {/* Account privacy toggle */}
        <View style={s.menuItemRow}>
          <View style={s.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={21} color={DS.dark} />
            <Text style={s.menuItemText}>Private Account</Text>
          </View>
          <Switch
            value={profile?.is_private ?? false}
            onValueChange={(val) => togglePrivacyMutation.mutate(val)}
            disabled={togglePrivacyMutation.isPending}
            trackColor={{ true: DS.primary, false: DS.gray100 }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={s.menuDivider} />

        <MenuItem icon="help-circle-outline" label="Help" onPress={() => navigateFromMenu('/(app)/profile/help')} />
        <MenuItem icon="information-circle-outline" label="About" onPress={() => navigateFromMenu('/(app)/profile/about')} />
        <MenuItem icon="shield-outline" label="Privacy Center" onPress={() => navigateFromMenu('/(app)/profile/privacy')} />
        <MenuItem icon="remove-circle-outline" label="Blocked Users" onPress={() => navigateFromMenu('/(app)/profile/blocked')} />

        <View style={s.menuDivider} />

        <MenuItem
          icon="log-out-outline"
          label="Log Out"
          danger
          right={<View />}
          onPress={() => { close(); logout(); }}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.surface,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuHeaderName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: DS.dark,
  },
  menuHeaderUsername: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: DS.gray500,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: DS.gray100,
    marginVertical: 6,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuItemText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: DS.dark,
  },
});
