import React from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expressVetApi, ExpressVetRequest } from '../../../../src/api/expressVet';
import { EXPRESS_VET_CATEGORY_ICONS } from '../../../../src/constants/expressVet';
import { FONTS } from '../../../../src/constants/typography';
import { COLORS } from '../../../../src/constants/colors';
import { QueryErrorState } from '../../../../src/components/ui/QueryErrorState';

const H_PAD = 20;

const STATUS_LABELS: Record<ExpressVetRequest['status'], string> = {
  pending_dispatch: 'Pending',
  claimed: 'Being Confirmed',
  assigned: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_COLORS: Record<ExpressVetRequest['status'], { bg: string; text: string }> = {
  pending_dispatch: { bg: '#FFF4E5', text: '#B26B00' },
  claimed: { bg: '#FFF4E5', text: '#B26B00' },
  assigned: { bg: '#E6F4EA', text: '#1E7A34' },
  completed: { bg: '#E6F4EA', text: '#1E7A34' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function ExpressVetRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['express-vet-my-requests'],
    queryFn: () => expressVetApi.getMyRequests(),
  });

  const requests = data?.data ?? [];

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
          <Text style={styles.title}>My Requests</Text>
          <Text style={styles.subtitle}>Vets at Home bookings</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : isError ? (
        <QueryErrorState error={error} fallbackMessage="Could not load your bookings." onRetry={refetch} />
      ) : requests.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>You haven't booked a home visit yet.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.status];
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.row}
                onPress={() =>
                  router.push({ pathname: '/(app)/express-vet/requests/[id]', params: { id: item.request_id } } as any)
                }
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={EXPRESS_VET_CATEGORY_ICONS[item.category] ?? 'paw'} size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{item.category.replace('_', ' ')}</Text>
                  <Text style={styles.rowSub}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                  <Text style={[styles.statusText, { color: statusColor.text }]}>{STATUS_LABELS[item.status]}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontFamily: FONTS.heading, fontSize: 24, color: COLORS.textDark },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  rowLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: COLORS.textDark,
    textTransform: 'capitalize',
  },
  rowSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },
});
