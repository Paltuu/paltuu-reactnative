import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetProvider } from '../../../src/api/expressVetDispatch';
import { useAuthStore } from '../../../src/stores/authStore';
import { useDispatcherScopeStore } from '../../../src/stores/dispatcherScopeStore';
import { COLORS } from '../../../src/constants/colors';
import { FONTS } from '../../../src/constants/typography';

const H_PAD = 20;

function formatCountdown(until: Date): string {
  const secs = Math.max(0, Math.round((until.getTime() - Date.now()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ExpressVetDispatchIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const scope = useDispatcherScopeStore((s) => s.scope);
  const setScope = useDispatcherScopeStore((s) => s.setScope);

  // No on/off duty toggle — dispatchers are always alertable. The only control is muting
  // for 30 minutes.
  const { data: muteData, refetch: refetchMute } = useQuery({
    queryKey: ['express-vet-dispatch-mute'],
    queryFn: expressVetDispatchApi.getMuteStatus,
    refetchInterval: 15000,
  });
  const mutedUntil = muteData?.muted_until ? new Date(muteData.muted_until) : null;
  const isMuted = !!mutedUntil && mutedUntil.getTime() > Date.now();

  // Ticks once a second purely to re-render the "Muted for Xm Ys" countdown text off the
  // same `mutedUntil` value above — the 15s query refetch is the source of truth for whether
  // muting is still active at all, this just keeps the displayed number moving in between.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isMuted) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [isMuted]);

  const muteMutation = useMutation({
    mutationFn: expressVetDispatchApi.muteFor30Min,
    onSuccess: () => refetchMute(),
    onError: () => Alert.alert('Something went wrong', 'Could not mute alerts. Please try again.'),
  });

  const { data: stats } = useQuery({
    queryKey: ['express-vet-dispatch-stats'],
    queryFn: expressVetDispatchApi.getStats,
  });

  const { data: providersData } = useQuery({
    queryKey: ['express-vet-providers-preview'],
    queryFn: () => expressVetDispatchApi.searchProviders({}),
  });
  const providersPreview = (providersData?.data ?? []).slice(0, 3);

  // A dispatcher is also a vet — this is their own editable vet profile (same edit screen
  // as any other provider). The row is created on demand the first time they open it.
  const { data: myProfileData } = useQuery({
    queryKey: ['express-vet-my-provider-profile'],
    queryFn: expressVetDispatchApi.getMyProviderProfile,
  });
  const myProfile = myProfileData?.provider ?? null;

  const ensureProfileMutation = useMutation({
    mutationFn: expressVetDispatchApi.ensureMyProviderProfile,
    onSuccess: ({ provider }) => {
      queryClient.setQueryData(['express-vet-my-provider-profile'], { provider });
      queryClient.invalidateQueries({ queryKey: ['express-vet-providers-preview'] });
      router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: provider.provider_id } } as any);
    },
    onError: () => Alert.alert('Something went wrong', 'Could not open your vet profile. Please try again.'),
  });

  const openMyProfile = () => {
    if (myProfile) {
      router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: myProfile.provider_id } } as any);
    } else if (!ensureProfileMutation.isPending) {
      ensureProfileMutation.mutate();
    }
  };

  // `team` is only present in the stats response for admins, and only meaningful for the
  // in-progress/completed-today/total-completed/total-earned tiles — `unconfirmed_count`
  // itself is already pool-wide regardless of scope (no `team.unconfirmed_count` exists).
  const useTeamScope = isAdmin && scope === 'team';
  const statSource = useTeamScope && stats?.team ? stats.team : stats;

  // Android 14+ doesn't auto-grant full-screen job alerts for non-calling apps — the
  // dispatcher may need a one-time manual toggle (see src/services/androidDispatchAlert.ts).
  // notifee has no API to check that specific grant, so this is a standing reminder rather
  // than a conditional prompt: cheap to show, and harmless once already enabled.
  const openAlertSettings = () => {
    const notifee = require('@notifee/react-native').default;
    notifee.openNotificationSettings().catch(() => {});
  };

  // Samsung (and other OEMs' custom battery managers) silently downgrade a background
  // full-screen alert to a plain notification instead of blocking it outright when the app
  // is battery-restricted or "put to sleep" — this is what a Samsung dispatcher hit live:
  // notification settings alone were fine, the alert just never went full-screen. notifee
  // detects the manufacturer and opens the right OEM screen (Samsung's "Unmonitored apps" /
  // battery settings here); on OEMs with no special screen this is a harmless no-op.
  const openBatterySettings = () => {
    const notifee = require('@notifee/react-native').default;
    notifee.openPowerManagerSettings().catch(() => {});
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        {router.canGoBack() && (
          // A dispatcher-role account lands here directly on login (see app/_layout.tsx) with
          // no back history — this is their app root, so there's nothing to fall back to.
          // Admins reach this screen from the profile menu and do have a real back stack.
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dispatcher Console</Text>
          <Text style={styles.subtitle}>
            {isMuted ? `Muted — ${formatCountdown(mutedUntil!)} left` : 'Alerts on'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.muteButton, isMuted && styles.muteButtonActive]}
          onPress={() => muteMutation.mutate()}
          disabled={isMuted || muteMutation.isPending}
        >
          <Ionicons name={isMuted ? 'notifications-off' : 'notifications-off-outline'} size={16} color={isMuted ? '#FFFFFF' : COLORS.primary} />
          <Text style={[styles.muteButtonText, isMuted && styles.muteButtonTextActive]}>
            {isMuted ? formatCountdown(mutedUntil!) : 'Mute 30m'}
          </Text>
        </TouchableOpacity>
        {/* Dispatcher-role accounts can't reach the normal profile menu (where logout
            normally lives) — this is the only way out for them, so it has to live here. */}
        <TouchableOpacity
          onPress={() => Alert.alert('Log out?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => logout() },
          ])}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 14 }}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* One-time system-setup reminders, unrelated to any list content — kept here rather
            than following the inbox down into jobs/index.tsx. */}
        {Platform.OS === 'android' && (
          <TouchableOpacity style={styles.alertSettingsHint} onPress={openAlertSettings} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
            <Text style={styles.alertSettingsHintText}>
              Make sure job alerts are allowed to show over your lock screen — tap to check
            </Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'android' && (
          <TouchableOpacity style={[styles.alertSettingsHint, { marginTop: 8 }]} onPress={openBatterySettings} activeOpacity={0.85}>
            <Ionicons name="battery-charging-outline" size={16} color={COLORS.primary} />
            <Text style={styles.alertSettingsHintText}>
              Some phones (Samsung, Xiaomi, etc.) silently mute alerts under battery-saving —
              tap to allow Paltuu to run unrestricted
            </Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <View style={styles.scopeRow}>
            <TouchableOpacity
              style={[styles.scopeChip, scope === 'mine' && styles.scopeChipActive]}
              onPress={() => setScope('mine')}
            >
              <Text style={[styles.scopeChipText, scope === 'mine' && styles.scopeChipTextActive]}>Mine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeChip, scope === 'team' && styles.scopeChipActive]}
              onPress={() => setScope('team')}
            >
              <Text style={[styles.scopeChipText, scope === 'team' && styles.scopeChipTextActive]}>Team</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statTile}
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/express-vet-dispatch/jobs?tab=ongoing' as any)}
            >
              <Text style={styles.statValue}>{statSource?.in_progress ?? '—'}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statTile}
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/express-vet-dispatch/jobs?tab=unconfirmed' as any)}
            >
              <Text style={styles.statValue}>{stats?.unconfirmed_count ?? '—'}</Text>
              <Text style={styles.statLabel}>Unconfirmed</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statTile}
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/express-vet-dispatch/jobs?tab=completed' as any)}
            >
              <Text style={styles.statValue}>{statSource?.completed_today ?? '—'}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statTile}
              activeOpacity={0.9}
              onPress={() => router.push('/(app)/express-vet-dispatch/jobs?tab=completed' as any)}
            >
              <Text style={styles.statValue}>{statSource?.total_completed ?? '—'}</Text>
              <Text style={styles.statLabel}>Total Completed</Text>
            </TouchableOpacity>
          </View>
          {/* Not a TouchableOpacity — a running total, nothing to drill into. */}
          <View style={styles.totalEarnedTile}>
            <Text style={styles.totalEarnedValue}>
              {statSource?.total_earned_pkr != null ? `PKR ${statSource.total_earned_pkr.toLocaleString()}` : '—'}
            </Text>
            <Text style={styles.totalEarnedLabel}>Total Earned</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.myProfileCard} activeOpacity={0.9} onPress={openMyProfile}>
          {myProfile?.photo_url ? (
            <Image source={{ uri: myProfile.photo_url }} style={styles.myProfileAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.myProfileAvatar, styles.myProfileAvatarFallback]}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.myProfileTitle}>My vet profile</Text>
            <Text style={styles.myProfileSubtitle} numberOfLines={2}>
              {myProfile
                ? 'Edit your photo, categories, experience and qualifications'
                : 'Set up your own vet profile so you can take jobs yourself'}
            </Text>
          </View>
          {ensureProfileMutation.isPending ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={COLORS.textPlaceholder} />
          )}
        </TouchableOpacity>

        <View style={{ paddingTop: 8, paddingBottom: 16 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Providers</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/express-vet-dispatch/providers' as any)}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          {providersPreview.length === 0 ? (
            <Text style={styles.sectionEmptyText}>No providers yet — one gets added automatically the first time you assign a job.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {providersPreview.map((provider: ExpressVetProvider) => (
                <TouchableOpacity
                  key={provider.provider_id}
                  style={styles.previewRow}
                  onPress={() =>
                    router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: provider.provider_id } } as any)
                  }
                >
                  {provider.photo_url ? (
                    <Image source={{ uri: provider.photo_url }} style={styles.previewAvatar} contentFit="cover" />
                  ) : (
                    <Ionicons name="person-circle-outline" size={30} color="#C4C4CC" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewRowText} numberOfLines={1}>
                      {provider.name}
                    </Text>
                    <Text style={styles.previewRowSubtext} numberOfLines={1}>
                      {provider.categories.map((c) => c.replace('_', ' ')).join(', ')}
                      {provider.years_experience != null ? ` · ${provider.years_experience}y exp` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={styles.previewRowMeta}>
                      {provider.rating != null ? `${provider.rating} ★` : 'No ratings'}
                    </Text>
                    <Text style={styles.previewRowSubtext}>{provider.total_reviews} review{provider.total_reviews === 1 ? '' : 's'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  muteButtonActive: { backgroundColor: COLORS.primary },
  muteButtonText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.primary },
  muteButtonTextActive: { color: '#FFFFFF' },

  alertSettingsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FCEFF1',
  },
  alertSettingsHintText: { flex: 1, fontFamily: FONTS.body, fontSize: 12, color: COLORS.textDark },

  scopeRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  scopeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryTint },
  scopeChipText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.textMuted },
  scopeChipTextActive: { color: COLORS.primary },

  statsGrid: { gap: 12, paddingTop: 16, paddingBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statValue: { fontFamily: FONTS.heading, fontSize: 36, color: COLORS.textDark },
  statLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  totalEarnedTile: {
    borderRadius: 20,
    backgroundColor: COLORS.primaryTint,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  totalEarnedValue: { fontFamily: FONTS.heading, fontSize: 30, color: COLORS.primary },
  totalEarnedLabel: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary, marginTop: 4 },

  myProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTint,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  myProfileAvatar: { width: 44, height: 44, borderRadius: 22 },
  myProfileAvatarFallback: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  myProfileTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.primary },
  myProfileSubtitle: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textDark },
  seeAllText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.primary },
  sectionEmptyText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewRowText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark, textTransform: 'capitalize' },
  previewRowSubtext: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  previewRowMeta: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  previewAvatar: { width: 30, height: 30, borderRadius: 15 },
});
