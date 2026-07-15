import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaltuuButton from '../../../../src/components/ui/PaltuuButton';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialApi, Collection } from '../../../../src/api/social';
import { withFocusUnmount } from '../../../../src/components/common/withFocusUnmount';

const PRIMARY = '#A03048';

const PALETTE = [
  { bg: '#FDF0F2', icon: '#A03048' },
  { bg: '#EFF6FF', icon: '#3B82F6' },
  { bg: '#F0FDF4', icon: '#16A34A' },
  { bg: '#FFF7ED', icon: '#EA580C' },
  { bg: '#F5F3FF', icon: '#7C3AED' },
  { bg: '#ECFDF5', icon: '#059669' },
];

function SavedCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['social-collections'],
    queryFn: () => socialApi.getCollections(),
  });

  const collections = data?.collections || [];

  const createMutation = useMutation({
    mutationFn: (name: string) => socialApi.createCollection(name),
    onSuccess: () => {
      setNewCollectionName('');
      setCreateModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create collection');
    },
  });

  const handleCreate = () => {
    if (!newCollectionName.trim() || createMutation.isPending) return;
    createMutation.mutate(newCollectionName.trim());
  };

  const renderCard = ({ item, index }: { item: Collection; index: number }) => {
    const palette = PALETTE[index % PALETTE.length];
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(app)/profile/saved/${item.collection_id}`)}
        activeOpacity={0.75}
        style={styles.card}
      >
        {/* Thumbnail block */}
        <View style={[styles.cardThumb, { backgroundColor: palette.bg }]}>
          <Ionicons
            name={item.is_default ? 'bookmarks' : 'folder-open'}
            size={36}
            color={palette.icon}
          />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardSub}>{item.post_count} {item.post_count === 1 ? 'post' : 'posts'}</Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginRight: 16 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(app)/profile')} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.addBtn}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item.collection_id.toString()}
          renderItem={renderCard}
          style={{ marginBottom: insets.bottom }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="bookmark-outline" size={40} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyBody}>
                Bookmark posts from your feed to find them here whenever you want.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={styles.emptyAction}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyActionText}>New Collection</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Create modal ── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="folder-open" size={22} color={PRIMARY} />
              </View>
              <Text style={styles.modalTitle}>New Collection</Text>
            </View>
            <Text style={styles.modalSub}>Give your collection a name to get started.</Text>

            <TextInput
              autoFocus
              placeholder="e.g. Pet Care Tips, Cute Dogs..."
              style={styles.modalInput}
              placeholderTextColor="#9CA3AF"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              maxLength={50}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />

            <View style={{ marginTop: 8 }}>
              <PaltuuButton
                label="Create Collection"
                successLabel="Created!"
                onPress={handleCreate}
                loading={createMutation.isPending}
                disabled={!newCollectionName.trim()}
              />
              <TouchableOpacity
                onPress={() => { setCreateModalVisible(false); setNewCollectionName(''); }}
                style={{ alignItems: 'center', paddingVertical: 12 }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#111', fontFamily: 'Montserrat_700Bold' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#111', fontFamily: 'Montserrat_700Bold' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontFamily: 'DMSans_400Regular' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 6 },

  listContent: { padding: 16, paddingBottom: 120 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardThumb: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardInfo: { flex: 1, paddingHorizontal: 14 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111', fontFamily: 'Montserrat_600SemiBold' },
  cardSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2, fontFamily: 'DMSans_400Regular' },
  separator: { height: 10 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyState: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8, fontFamily: 'Montserrat_700Bold' },
  emptyBody: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_400Regular', marginBottom: 28 },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'Montserrat_600SemiBold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, width: '100%', padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  modalIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FDF0F2', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111', fontFamily: 'Montserrat_700Bold' },
  modalSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 20, fontFamily: 'DMSans_400Regular' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#111',
    fontFamily: 'DMSans_400Regular',
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600', fontFamily: 'Montserrat_600SemiBold' },
  modalCreate: { backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  modalCreateText: { fontSize: 14, color: '#fff', fontWeight: '600', fontFamily: 'Montserrat_600SemiBold' },
});

export default withFocusUnmount(SavedCollectionsScreen);
