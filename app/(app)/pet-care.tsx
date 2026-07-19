import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getClinics } from '../../src/api/clinics';
import { ClinicCard } from '../../src/components/pet-care/ClinicCard';
import { useLocationStore } from '../../src/stores/locationStore';
import { haversineDistanceKm } from '../../src/utils/geo';
import { FONTS } from '../../src/constants/typography';
import { withFocusUnmount } from '../../src/components/common/withFocusUnmount';

const PRIMARY = '#A03048';
const DARK = '#1A1A2E';
const H_PAD = 20;
const PAGE_SIZE = 20;

type SortMode = 'default' | 'nearby';

function PetCareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const listRef = useRef<any>(null);

  const {
    latitude,
    longitude,
    status: locStatus,
    resolveCity,
  } = useLocationStore();
  const hasLocation = latitude != null && longitude != null;
  const nearby = sortMode === 'nearby' && hasLocation;

  // Debounce free-text search so we don't hit the API on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  const queryParams = {
    search: debouncedSearch || undefined,
    city: selectedCity || undefined,
    verified: verifiedOnly || undefined,
    sort: nearby ? ('distance' as const) : undefined,
    lat: nearby ? latitude! : undefined,
    lng: nearby ? longitude! : undefined,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['clinics', queryParams],
    queryFn: ({ pageParam }) => getClinics({ ...queryParams, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.pagination.hasMore ? allPages.length + 1 : undefined,
  });

  const clinics = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;

  // City list comes from the backend (unaffected by the current page/filters).
  const cities = data?.pages[0]?.cities ?? [];

  const isFiltering =
    !!search || !!selectedCity || verifiedOnly || sortMode === 'nearby';

  const resetFilters = () => {
    setSearch('');
    setSelectedCity(null);
    setVerifiedOnly(false);
    setSortMode('default');
  };

  const handleNearMe = async () => {
    if (sortMode === 'nearby') {
      setSortMode('default');
      return;
    }
    if (!hasLocation) await resolveCity();
    setSortMode('nearby');
  };

  const distanceOf = (c: any): number | null => {
    if (!hasLocation || c.latitude == null || c.longitude == null) return null;
    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return haversineDistanceKm(latitude!, longitude!, lat, lng);
  };

  // Filtering, sorting, and pagination are now all done server-side — the
  // backend returns clinics already matching search/city/verified/distance.
  // Any filter change (including clearing one) re-derives an entirely
  // different result set, so a scroll position from before no longer means
  // anything for it — snap back to the top instead of leaving the list
  // sitting at whatever offset it was at for the previous results.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [debouncedSearch, selectedCity, verifiedOnly, sortMode]);

  const resolvingLoc = locStatus === 'resolving';

  const renderHeader = () => (
    <View style={{ paddingHorizontal: H_PAD }}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9AA0A6" />
        <TextInput
          placeholder="Search clinics or locations…"
          placeholderTextColor="#9AA0A6"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#C4C4CC" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action row: Near me + Verified only */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleNearMe}
          activeOpacity={0.85}
          style={[styles.toggle, sortMode === 'nearby' && styles.toggleActive]}
        >
          {resolvingLoc ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <Ionicons
              name="navigate"
              size={14}
              color={sortMode === 'nearby' ? '#FFF' : PRIMARY}
            />
          )}
          <Text
            style={[
              styles.toggleText,
              sortMode === 'nearby' && styles.toggleTextActive,
            ]}
          >
            Near me
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setVerifiedOnly((v) => !v)}
          activeOpacity={0.85}
          style={[styles.toggle, verifiedOnly && styles.toggleActive]}
        >
          <MaterialIcons
            name="verified"
            size={14}
            color={verifiedOnly ? '#FFF' : PRIMARY}
          />
          <Text
            style={[styles.toggleText, verifiedOnly && styles.toggleTextActive]}
          >
            Verified only
          </Text>
        </TouchableOpacity>

        {isFiltering && (
          <TouchableOpacity
            onPress={resetFilters}
            activeOpacity={0.85}
            style={styles.resetBtn}
          >
            <Ionicons name="refresh" size={13} color="#9AA0A6" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* City selector */}
      {cities.length > 0 && (
        <FlatList
          horizontal
          data={['All', ...cities]}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          style={{ marginTop: 12, marginHorizontal: -H_PAD, paddingHorizontal: H_PAD }}
          renderItem={({ item }) => {
            const active =
              item === 'All' ? selectedCity === null : selectedCity === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCity(item === 'All' ? null : item)}
                activeOpacity={0.85}
                style={[styles.cityChip, active && styles.cityChipActive]}
              >
                <Text
                  style={[styles.cityChipText, active && styles.cityChipTextActive]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.resultRow}>
        <Text style={styles.resultCount}>
          {total} {total === 1 ? 'clinic' : 'clinics'}
        </Text>
        {sortMode === 'nearby' && hasLocation && (
          <Text style={styles.sortedBy}>Sorted by distance</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: H_PAD, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/pets'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pet Care</Text>
          <Text style={styles.subtitle}>Find trusted clinics & vets near you</Text>
        </View>
      </View>

      <FlashList
        ref={listRef}
        data={clinics}
        keyExtractor={(item) => String(item.clinic_id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: H_PAD }}>
            <ClinicCard
              clinic={item}
              distanceKm={sortMode === 'nearby' ? distanceOf(item) : null}
              onPress={() =>
                router.push({
                  pathname: '/(app)/clinic/[id]',
                  params: { id: item.clinic_id },
                })
              }
            />
          </View>
        )}
        ListHeaderComponent={renderHeader()}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator size="small" color={PRIMARY} />
          </View>
        ) : null}
        onRefresh={refetch}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        // `contentContainerStyle`'s paddingBottom only clears the nav bar once
        // scrolled all the way to the end — the list's own frame still extends
        // the full screen height, so mid-scroll rows rest right behind the
        // (edge-to-edge, translucent) system nav bar. Shrinking the list's own
        // style by insets.bottom keeps every row above it at any scroll position.
        style={{ marginBottom: insets.bottom }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search" size={40} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No clinics found</Text>
              <Text style={styles.emptySub}>
                Try a different keyword, city, or reset your filters.
              </Text>
            </View>
          )
        }
      />
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
  title: { fontFamily: FONTS.heading, fontSize: 26, color: DARK },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#EFEFF1',
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14, color: DARK, padding: 0 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0DCE1',
  },
  toggleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: PRIMARY },
  toggleTextActive: { color: '#FFF' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    marginLeft: 'auto',
  },
  resetText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#9AA0A6' },

  cityChip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  cityChipText: { fontFamily: FONTS.bodyMedium, fontSize: 12.5, color: '#555' },
  cityChipTextActive: { color: '#FFF' },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 12,
  },
  resultCount: { fontFamily: FONTS.headingSemi, fontSize: 14, color: DARK },
  sortedBy: { fontFamily: FONTS.body, fontSize: 11.5, color: PRIMARY },

  empty: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 16, color: '#9AA0A6', marginTop: 12 },
  emptySub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#B0B0B8',
    textAlign: 'center',
    marginTop: 6,
  },
});

export default withFocusUnmount(PetCareScreen);
