import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OnboardingHeader } from '../src/components/auth/OnboardingHeader';
import { PawrvezTooltip } from '../src/components/common/mascot';
import client from '../src/api/client';
import { useAuthStore } from '../src/stores/authStore';

interface Tag {
  tag_id: number;
  slug: string;
  label: string;
  category: string;
}

interface TagCategories {
  species: Tag[];
  topic: Tag[];
  content_type: Tag[];
  mood: Tag[];
}

const CATEGORY_LABELS: Record<string, string> = {
  species: 'Animals I love',
  topic: 'Topics I follow',
  content_type: 'Content I enjoy',
  mood: 'Vibes I like',
};

export default function InterestsScreen() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const isOauthFlow = flow === 'oauth';
  const clearNewUser = useAuthStore((state) => state.clearNewUser);
  const [categories, setCategories] = useState<TagCategories>({ species: [], topic: [], content_type: [], mood: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showMascotTooltip, setShowMascotTooltip] = useState(false);

  // Auto-surface the mascot tip shortly after arriving on this screen.
  useEffect(() => {
    const timer = setTimeout(() => setShowMascotTooltip(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get('/social/content-tags');
        setCategories(res.data.categories ?? { species: [], topic: [], content_type: [], mood: [] });
      } catch {
        Alert.alert('Error', 'Could not load interests. Try again later.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleTag(tagId: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  async function handleContinue() {
    if (selected.size === 0) {
      clearNewUser();
      router.replace('/(app)');
      return;
    }
    setSaving(true);
    try {
      await client.post('/social/interests', { tagIds: Array.from(selected) });
    } catch {
      // Non-fatal — interests can be set later; proceed anyway
    } finally {
      setSaving(false);
      clearNewUser();
      router.replace('/(app)');
    }
  }

  const allTags: Tag[] = [
    ...categories.species,
    ...categories.topic,
    ...categories.content_type,
    ...categories.mood,
  ];

  const sections = (Object.keys(categories) as (keyof TagCategories)[])
    .filter(k => categories[k].length > 0)
    .map(k => ({ category: k, tags: categories[k] }));

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <OnboardingHeader progress={isOauthFlow ? undefined : 1} />
      <FlatList
        ListHeaderComponent={
          <View className="px-6 pt-8 pb-4">
            {isOauthFlow && (
              <Text className="font-headingSemi text-xs text-primary mb-1 uppercase tracking-wider">
                Step 2 of 2
              </Text>
            )}
            <PawrvezTooltip
              visible={showMascotTooltip}
              text="Help us find the right pets and posts for you"
              onDismiss={() => setShowMascotTooltip(false)}
              placement="top"
            >
              <Text className="font-heading text-3xl text-dark mb-2 mt-[10px]">
                Let's set up your feed
              </Text>
            </PawrvezTooltip>
            <Text className="font-body text-gray-500 leading-6">
              Choose what matters to you — you can change this anytime.
            </Text>
          </View>
        }
        data={sections}
        keyExtractor={item => item.category}
        renderItem={({ item }) => (
          <View className="px-6 mb-6">
            <Text className="font-headingSemi text-sm text-gray-500 mb-3 uppercase tracking-wider">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {item.tags.map(tag => {
                const isSelected = selected.has(tag.tag_id);
                return (
                  <TouchableOpacity
                    key={tag.tag_id}
                    onPress={() => toggleTag(tag.tag_id)}
                    activeOpacity={0.75}
                    className={`px-4 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-body text-sm ${
                        isSelected ? 'text-white' : 'text-dark'
                      }`}
                    >
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        ListFooterComponent={
          <View className="px-6 pt-2 pb-8">
            {selected.size > 0 && (
              <Text className="text-center font-body text-sm text-primary mb-4">
                {selected.size} interest{selected.size !== 1 ? 's' : ''} selected
              </Text>
            )}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={saving}
              activeOpacity={0.85}
              className={`rounded-2xl py-4 items-center ${saving ? 'bg-gray-300' : 'bg-primary'}`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-headingSemi text-white text-base">Finish Setup</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { clearNewUser(); router.replace('/(app)'); }}
              className="mt-4 items-center"
              disabled={saving}
            >
              <Text className="font-body text-sm text-gray-400">Skip for now</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
