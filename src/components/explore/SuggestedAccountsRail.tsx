import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { useSocialActions } from '../../hooks/useSocialActions';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { FONTS } from '../../constants/typography';
import { Rail } from './Rail';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const MUTED = '#9AA0A6';

type SuggestedAccount = Awaited<ReturnType<typeof socialApi.getSuggestedAccounts>>['accounts'][number];

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

// Prefer the strongest relationship signal: someone who engages with the
// viewer > mutual follows > how much the account itself gets engaged with.
const getAccountSubtitle = (account: SuggestedAccount): { text: string; highlight: boolean } => {
  if (account.interactions_with_me > 0) {
    return { text: 'Interacts with you', highlight: true };
  }
  if (account.mutual_follows > 0) {
    return {
      text: `${account.mutual_follows} mutual follow${account.mutual_follows === 1 ? '' : 's'}`,
      highlight: false,
    };
  }
  if (account.recent_engagement > 0) {
    return { text: `${formatCount(account.recent_engagement)} interactions`, highlight: false };
  }
  return { text: `${formatCount(account.follower_count)} followers`, highlight: false };
};

const AccountCard = ({
  account,
  onPress,
  onFollow,
}: {
  account: SuggestedAccount;
  onPress: () => void;
  onFollow: () => void;
}) => {
  const subtitle = getAccountSubtitle(account);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: 150,
        padding: 16,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F2',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Image
        source={account.profile_image_url ? { uri: account.profile_image_url } : NO_PROFILE_IMAGE}
        style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F7' }}
        contentFit="cover"
      />
      <Text numberOfLines={1} style={{ fontFamily: FONTS.headingSemi, fontSize: 14, color: DARK, marginTop: 10 }}>
        {account.name}
      </Text>
      {!!account.social_username && (
        <Text numberOfLines={1} style={{ fontFamily: FONTS.body, fontSize: 12, color: MUTED, marginTop: 1 }}>
          @{account.social_username}
        </Text>
      )}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: subtitle.highlight ? FONTS.bodyBold : FONTS.body,
          fontSize: 11,
          color: subtitle.highlight ? PRIMARY : MUTED,
          marginTop: 3,
        }}
      >
        {subtitle.text}
      </Text>
      <TouchableOpacity
        onPress={onFollow}
        style={{
          marginTop: 12,
          alignSelf: 'stretch',
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: account.is_following ? '#F5F5F7' : PRIMARY,
        }}
      >
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: account.is_following ? DARK : '#FFF' }}>
          {account.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const SuggestedAccountsRail = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleFollow } = useSocialActions();

  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'suggested-accounts'],
    queryFn: () => socialApi.getSuggestedAccounts(10),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const accounts = data?.accounts ?? [];

  const handleFollow = (userId: number) => {
    // Optimistically flip this rail's own cache; useSocialActions handles
    // the request plus every other cache (feed, profile, search)
    queryClient.setQueryData(['explore', 'suggested-accounts'], (old: any) => {
      if (!old?.accounts) return old;
      return {
        ...old,
        accounts: old.accounts.map((a: SuggestedAccount) =>
          a.user_id === userId ? { ...a, is_following: !a.is_following } : a
        ),
      };
    });
    toggleFollow(userId);
  };

  return (
    <Rail
      title="Who to Follow"
      isLoading={isLoading}
      isEmpty={accounts.length === 0}
      skeletonWidth={150}
      skeletonHeight={176}
    >
      {accounts.map((a) => (
        <AccountCard
          key={a.user_id}
          account={a}
          onPress={() => router.push(`/(app)/profile/${a.user_id}`)}
          onFollow={() => handleFollow(a.user_id)}
        />
      ))}
    </Rail>
  );
};
