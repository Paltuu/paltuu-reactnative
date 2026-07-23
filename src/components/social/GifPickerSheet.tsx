// GIF picker bottom sheet (Klipy) shared by create-post, quote, and comment
// composers. Empty query → trending; typing → debounced search. Selecting a GIF
// calls onSelect with CDN URLs and closes the sheet.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, Dimensions, Keyboard,
} from 'react-native';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../ui/bottom-sheet';
import type { BottomSheetMethods } from '../ui/bottom-sheet/types';
import { klipyApi, type GifItem } from '../../api/klipy';
import { Skeleton } from '../common/Skeleton';

const PRIMARY = '#a03048';
const PAGE_SIZE = 24;
const COLS = 2;
const GAP = 8;
const H_PAD = 16;
const { width: SCREEN_W } = Dimensions.get('window');
const TILE_W = (SCREEN_W - H_PAD * 2 - GAP) / COLS;
const TILE_H = TILE_W * 0.75;

export const GifPickerSheet = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (gif: GifItem) => void;
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<BottomSheetMethods>(null);
  const requestId = useRef(0);
  const snapPoints = useMemo(() => ['70%', '92%'] as const, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => sheetRef.current?.expand(), 0);
      return () => clearTimeout(timer);
    }
    setQuery('');
    setDebouncedQuery('');
    setGifs([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [visible]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (q: string, nextPage: number, append: boolean) => {
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = q
        ? await klipyApi.search(q, { page: nextPage, limit: PAGE_SIZE })
        : await klipyApi.trending({ page: nextPage, limit: PAGE_SIZE });
      if (id !== requestId.current) return;
      setGifs((prev) => (append ? [...prev, ...res.gifs] : res.gifs));
      setPage(res.page);
      setHasMore(res.hasMore);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err?.message || 'Could not load GIFs');
      if (!append) setGifs([]);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setPage(1);
    setHasMore(true);
    load(debouncedQuery, 1, false);
  }, [visible, debouncedQuery, load]);

  if (!visible) return null;

  const handleClose = () => {
    Keyboard.dismiss();
    sheetRef.current?.close();
  };

  const handleSelect = (gif: GifItem) => {
    onSelect(gif);
    handleClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet ref={sheetRef} snapPoints={snapPoints} onClose={onClose}>
          {/* Header stays outside the FlatList so BottomSheet does not wrap
              the grid in a ScrollView (VirtualizedList nesting warning). */}
          <View style={{ backgroundColor: '#fff' }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingBottom: 10,
            }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111' }}>Add a GIF</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12,
              backgroundColor: '#F3F4F6', borderRadius: 12, height: 40,
            }}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search KLIPY"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                autoCapitalize="none"
                style={{ flex: 1, fontSize: 14, color: '#111' }}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ alignItems: 'center', paddingBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.3 }}>
                Powered by KLIPY
              </Text>
            </View>
          </View>

          <FlatList
            style={{ flex: 1 }}
            data={loading && gifs.length === 0 ? [] : gifs}
            keyExtractor={(item) => item.id}
            numColumns={COLS}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PAD }}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 40, gap: GAP, flexGrow: 1 }}
            onEndReached={() => {
              if (!loading && !loadingMore && hasMore) {
                load(debouncedQuery, page + 1, true);
              }
            }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              loading ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: H_PAD }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} width={TILE_W} height={TILE_H} borderRadius={12} />
                  ))}
                </View>
              ) : error ? (
                <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8, paddingHorizontal: 24 }}>
                  <Ionicons name="cloud-offline-outline" size={32} color="#D1D5DB" />
                  <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>{error}</Text>
                  <TouchableOpacity onPress={() => load(debouncedQuery, 1, false)} style={{ marginTop: 4 }}>
                    <Text style={{ color: PRIMARY, fontWeight: '700', fontSize: 14 }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
                  <Ionicons name="images-outline" size={32} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No GIFs found</Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={PRIMARY} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                activeOpacity={0.85}
                style={{
                  width: TILE_W,
                  height: TILE_H,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#F3F4F6',
                }}
              >
                <Image
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            )}
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
};

/** @deprecated Use GifPickerSheet */
export const GiphyPickerSheet = GifPickerSheet;
export default GifPickerSheet;
