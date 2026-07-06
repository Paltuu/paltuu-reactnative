import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { useSocialActions } from '../../hooks/useSocialActions';
import { NO_PROFILE_IMAGE } from '../../constants/images';
import { Rail } from './Rail';

type SuggestedAccount = Awaited<ReturnType<typeof socialApi.getSuggestedAccounts>>['accounts'][number];

const AccountCard = ({
  account,
  onPress,
  onFollow,
}: {
  account: SuggestedAccount;
  onPress: () => void;
  onFollow: () => void;
}) => {
  const subtitle =
    account.mutual_follows > 0
      ? `${account.mutual_follows} mutual follow${account.mutual_follows === 1 ? '' : 's'}`
      : `${account.follower_count > 1000 ? `${(account.follower_count / 1000).toFixed(1)}K` : account.follower_count} followers`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: 150,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        alignItems: 'center',
      }}
    >
      <Image
        source={account.profile_image_url ? { uri: account.profile_image_url } : NO_PROFILE_IMAGE}
        style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6' }}
        contentFit="cover"
      />
      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: '#111', marginTop: 8 }}>
        {account.name}
      </Text>
      {!!account.social_username && (
        <Text numberOfLines={1} style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
          @{account.social_username}
        </Text>
      )}
      <Text numberOfLines={1} style={{ fontSize: 11, color: '#AAA', marginTop: 3 }}>
        {subtitle}
      </Text>
      <TouchableOpacity
        onPress={onFollow}
        style={{
          marginTop: 10,
          paddingHorizontal: 20,
          paddingVertical: 7,
          borderRadius: 20,
          backgroundColor: account.is_following ? '#F3F4F6' : '#A03048',
        }}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: account.is_following ? '#333' : '#FFF' }}>
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
      icon="person-add"
      isLoading={isLoading}
      isEmpty={accounts.length === 0}
      skeletonWidth={150}
      skeletonHeight={170}
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
