import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetProvider } from '../../../../src/api/expressVetDispatch';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

export default function ExpressVetProvidersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data, isPending } = useQuery({
    queryKey: ['express-vet-providers-roster', search],
    queryFn: () => expressVetDispatchApi.searchProviders({ search }),
  });
  const providers = data?.data ?? [];

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
          <Ionicons name="add-circle" size={28} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: H_PAD, paddingTop: 12 }}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search providers…"
          placeholderTextColor="#B0B7C3"
        />
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
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
                  <Ionicons name="person" size={20} color="#B0B7C3" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
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
  emptyText: { fontFamily: FONTS.body, fontSize: 13, color: '#8A8A94', textAlign: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: DARK },

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: DARK,
    backgroundColor: '#FFFFFF',
  },

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
  name: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK },
  categories: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2, textTransform: 'capitalize' },
  rating: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK },
});
