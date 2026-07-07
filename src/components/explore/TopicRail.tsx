import React from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { Rail } from './Rail';
import { RailPostCard } from './RailPostCard';

export interface TopicRailConfig {
  slug: string;
  title: string;
}

export const TopicRail = ({ slug, title }: TopicRailConfig) => {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'topic', slug],
    queryFn: () => socialApi.getTopicFeed(slug, null, 10),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const posts = data?.posts ?? [];

  return (
    <Rail
      title={title}
      isLoading={isLoading}
      isEmpty={posts.length === 0}
      onSeeAll={() => router.push(`/(app)/topic/${slug}`)}
    >
      {posts.map((p) => (
        <RailPostCard key={p.post_id} post={p} onPress={() => router.push(`/post/${p.post_id}`)} />
      ))}
    </Rail>
  );
};
