import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetProvider } from '../../../../src/api/expressVetDispatch';
import { useAuthStore } from '../../../../src/stores/authStore';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';
import { COLORS } from '../../../../src/constants/colors';
import { FONTS } from '../../../../src/constants/typography';

const H_PAD = 20;

export default function ExpressVetProvidersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-providers-roster', search],
    queryFn: () => expressVetDispatchApi.searchProviders({ search }),
  });
  const providers = data?.data ?? [];

  // The dispatcher's own vet profile — the row auto-created on their first self-assign.
  // Edited through the same screen as any other provider; this is just a shortcut to it.
  const { data: myProfileData } = useQuery({
    queryKey: ['express-vet-my-provider-profile'],
    queryFn: expressVetDispatchApi.getMyProviderProfile,
  });
  const myProfile = myProfileData?.provider ?? null;

  const openMyProfile = () => {
    if (myProfile) {
      router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: myProfile.provider_id } } as any);
    } else {
      Alert.alert(
        'No vet profile yet',
        'You get your own editable vet profile here the first time you assign a job to yourself.',
      );
    }
  };

  const isMe = (item: ExpressVetProvider) =>
    currentUserId != null && item.linked_user_id != null && String(item.linked_user_id) === currentUserId;

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/express-vet-dispatch'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Providers</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/express-vet-dispatch/providers/new' as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: H_PAD, paddingTop: 12, gap: 12 }}>
        <TouchableOpacity style={styles.myProfileRow} activeOpacity={0.9} onPress={openMyProfile}>
          {myProfile?.photo_url ? (
            <Image source={{ uri: myProfile.photo_url }} style={styles.myProfileAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.myProfileAvatar, styles.photoFallback]}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.myProfileTitle}>My vet profile</Text>
            <Text style={styles.myProfileSubtitle} numberOfLines={1}>
              {myProfile
                ? 'Tap to edit your photo, categories, experience and more'
                : 'Added automatically the first time you assign a job to yourself'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textPlaceholder} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search providers…"
          placeholderTextColor={COLORS.textPlaceholder}
        />
      </View>

      {isError ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load providers. Please try again."
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.provider_id}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 40, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Text style={styles.emptyText}>No providers yet — tap + above to add one, or assign a job to add one on the fly.</Text>
            </View>
          }
          renderItem={({ item }: { item: ExpressVetProvider }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/(app)/express-vet-dispatch/providers/[id]', params: { id: item.provider_id } } as any)
              }
            >
              {item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoFallback]}>
                  <Ionicons name="person" size={20} color={COLORS.textPlaceholder} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {isMe(item) && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categories} numberOfLines={1}>
                  {item.categories.map((c) => c.replace('_', ' ')).join(', ')}
                </Text>
              </View>
              {item.rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={13} color="#F5A623" />
                  <Text style={styles.rating}>{item.rating}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

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

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textDark,
    backgroundColor: '#FFFFFF',
  },

  myProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTint,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 14,
  },
  myProfileAvatar: { width: 40, height: 40, borderRadius: 20 },
  myProfileTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.primary },
  myProfileSubtitle: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.primaryTint,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  youBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.primary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 14,
  },
  photo: { width: 44, height: 44, borderRadius: 22 },
  photoFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textDark },
  categories: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2, textTransform: 'capitalize' },
  rating: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.textDark },
});
