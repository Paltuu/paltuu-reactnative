import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetDispatchApi, ExpressVetDispatchRequest } from '../../../../src/api/expressVetDispatch';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import { FONTS } from '../../../../src/constants/typography';

const DARK = '#1A1A2E';
const PRIMARY = '#A03048';
const H_PAD = 20;

type Tab = 'assigned' | 'completed';

export default function ExpressVetJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('assigned');

  const { data, isPending } = useQuery({
    queryKey: ['express-vet-dispatch-jobs', tab],
    queryFn: () => expressVetDispatchApi.getJobs(tab),
  });
  const jobs = data?.data ?? [];

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
          <Text style={styles.title}>My Jobs</Text>
        </View>
      </View>

      <View style={[styles.tabRow, { paddingHorizontal: H_PAD }]}>
        {(['assigned', 'completed'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'assigned' ? 'Pending' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>Nothing here yet.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => <JobRow item={item} onPress={() => router.push({
            pathname: '/(app)/express-vet-dispatch/requests/[id]',
            params: { id: item.request_id },
          } as any)} />}
        />
      )}
    </View>
  );
}

function JobRow({ item, onPress }: { item: ExpressVetDispatchRequest; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[item.category] ?? 'paw'} size={20} color={PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowCategory}>{item.category.replace('_', ' ')}</Text>
        <Text style={styles.rowClient}>{item.client_name}</Text>
        {!!item.provider_name && <Text style={styles.rowProvider}>Provider: {item.provider_name}</Text>}
      </View>
      <Text style={styles.rowPrice}>PKR {(item.final_price_pkr ?? item.starting_price_pkr).toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: '#8A8A94' },

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

  tabRow: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tabActive: { borderColor: PRIMARY, backgroundColor: '#FAF0F2' },
  tabText: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK },
  tabTextActive: { color: PRIMARY },

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
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8E9EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCategory: { fontFamily: FONTS.bodyBold, fontSize: 14, color: DARK, textTransform: 'capitalize' },
  rowClient: { fontFamily: FONTS.body, fontSize: 12, color: '#8A8A94', marginTop: 2 },
  rowProvider: { fontFamily: FONTS.body, fontSize: 11, color: '#B0B7C3', marginTop: 2 },
  rowPrice: { fontFamily: FONTS.bodyBold, fontSize: 13, color: DARK },
});
