import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { socialApi, Collection } from '../../api/social';
import { LoadingDots } from '../ui/LoadingDots';

interface SaveBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string | number | null;
}

export const SaveBottomSheet = ({ visible, onClose, postId }: SaveBottomSheetProps) => {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // 1. Fetch user's collections
  const { data: collectionsData, isLoading: loadingCollections } = useQuery({
    queryKey: ['social-collections'],
    queryFn: () => socialApi.getCollections(),
    enabled: visible,
  });

  // 2. Fetch the save status of this specific post
  const { data: saveStatusData, isLoading: loadingSaveStatus } = useQuery({
    queryKey: ['save-status', postId],
    queryFn: () => socialApi.getSaveStatus(postId!),
    enabled: !!postId && visible,
  });

  // "All Posts" is the implicit default every saved post lands in already —
  // not something to file into, so it's excluded from the picker.
  //
  // collection_id is coerced to a Number here because the two endpoints that
  // feed this sheet disagree on its JSON type: GET /collections returns it as
  // a string (node-postgres serializes `bigint` columns as strings) while
  // GET /posts/:id/save-status returns it as a number (it's built SQL-side via
  // json_build_object). isPostInCollection compares the two with `===`, so
  // without this the checkbox for a just-saved post reads as unchecked the
  // moment the real save-status refetch replaces the optimistic update —
  // exactly the "checkmark disappears after a couple seconds" symptom.
  const collections = (collectionsData?.collections || [])
    .filter((c) => !c.is_default)
    .map((c) => ({ ...c, collection_id: Number(c.collection_id) }));
  const isSavedGlobally = saveStatusData?.is_saved || false;
  const postCollections = (saveStatusData?.collections || [])
    .map((c) => ({ ...c, collection_id: Number(c.collection_id) }));
  const isLoading = loadingCollections || loadingSaveStatus;

  // Instagram-style: the sheet is only as tall as it needs to be to show the
  // collections, and grows as more are added — instead of a fixed percentage
  // that leaves a couple of collections stranded below the fold.
  //
  // We drive this with an explicit computed snap point rather than the
  // library's `enableDynamicSizing` (which is on by default in v5): dynamic
  // sizing measures the content view, but our content nests a `flex: 1`
  // ScrollView whose height collapses to ~0 during that measurement, so the
  // sheet was opening at just the header + create-row height. A concrete snap
  // point keeps `flex: 1` working normally inside a known sheet height.
  //
  // Heights below are the fixed row heights of this sheet's own rows (py-4 +
  // a 40px avatar + hairline border ≈ 73). Overshooting slightly is harmless —
  // the list just scrolls a little; the cap keeps a long list on-screen.
  const sheetHeight = useMemo(() => {
    const HANDLE = 24;      // grabber + its padding
    const HEADER = 57;      // title row: py-4 + text + border
    const CREATE_ROW = 73;  // "Create New Collection" row (or the create input)
    const ROW = 73;         // each collection row
    const listContentHeight = collections.length > 0
      ? collections.length * ROW + Math.max(insets.bottom, 20)
      : 260; // empty-state illustration + copy
    const raw = HANDLE + HEADER + CREATE_ROW + listContentHeight;
    // Never shorter than a comfortable minimum (so the loading spinner and a
    // single collection both look intentional), never taller than 90%.
    return Math.min(Math.max(raw, screenHeight * 0.4), screenHeight * 0.9);
  }, [collections.length, insets.bottom, screenHeight]);

  const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);

  // Present immediately on tap; the sheet then animates to `snapPoints` as the
  // collections load and the computed height settles.
  useEffect(() => {
    if (visible && postId) {
      bottomSheetModalRef.current?.present();
    } else if (!visible) {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, postId]);

  const isPostInCollection = (collectionId: number) => {
    return postCollections.some((c) => c.collection_id === collectionId);
  };

  // 3. Mutation to create a new collection
  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => socialApi.createCollection(name),
    onSuccess: (newCollection) => {
      setNewCollectionName('');
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
      
      // If we have a saved post, auto add to this new collection.
      // Number() for the same string/number collection_id reason as above.
      if (postId && isSavedGlobally) {
        toggleCollectionMutation.mutate({
          collectionId: Number(newCollection.collection_id),
          added: false // It's a new collection, so it hasn't been added yet
        });
      }
    },
  });

  // 4. Mutation to toggle post in a collection
  const toggleCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, added }: { collectionId: number; added: boolean }) => {
      if (!postId) return;

      // Ensure post is saved globally first
      if (!isSavedGlobally) {
        await socialApi.savePost(postId, [collectionId]);
        return { isGlobalSave: true };
      }

      if (added) {
        await socialApi.removePostFromCollection(collectionId, postId);
        return { collectionId, removed: true };
      } else {
        await socialApi.addPostToCollection(collectionId, postId);
        return { collectionId, added: true };
      }
    },
    onMutate: async ({ collectionId, added }) => {
      await queryClient.cancelQueries({ queryKey: ['save-status', postId] });
      const previousStatus = queryClient.getQueryData(['save-status', postId]);

      // Optimistic update
      queryClient.setQueryData(['save-status', postId], (old: any) => {
        if (!old) return { is_saved: true, collections: [{ collection_id: collectionId, name: '' }] };
        
        const currentCollections = old.collections || [];
        const exists = currentCollections.some((c: any) => c.collection_id === collectionId);
        
        let newCollections = [...currentCollections];
        if (exists && added) {
          newCollections = newCollections.filter((c: any) => c.collection_id !== collectionId);
        } else if (!exists && !added) {
          // Find collection name from local cache
          const colInfo = collections.find((c) => c.collection_id === collectionId);
          newCollections.push({
            collection_id: collectionId,
            name: colInfo?.name || 'Collection'
          });
        }

        return {
          ...old,
          is_saved: true,
          collections: newCollections
        };
      });

      return { previousStatus };
    },
    onError: (err, variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['save-status', postId], context.previousStatus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['save-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
    }
  });

  // 5. Global toggle: Save/Unsave from post entirely
  const toggleGlobalSaveMutation = useMutation({
    mutationFn: async (): Promise<any> => {
      if (isSavedGlobally) {
        return socialApi.unsavePost(postId!);
      } else {
        return socialApi.savePost(postId!, []);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['save-status', postId] });
      const previousStatus = queryClient.getQueryData(['save-status', postId]);

      queryClient.setQueryData(['save-status', postId], (old: any) => ({
        ...old,
        is_saved: !isSavedGlobally,
        collections: !isSavedGlobally ? old?.collections || [] : []
      }));

      return { previousStatus };
    },
    onError: (err, variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(['save-status', postId], context.previousStatus);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['save-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['social-collections'] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      queryClient.invalidateQueries({ queryKey: ['social-profile'] });
    }
  });

  const handleCreateCollection = () => {
    if (!newCollectionName.trim() || createCollectionMutation.isPending) return;
    createCollectionMutation.mutate(newCollectionName.trim());
  };

  const handleCollectionPress = (collection: Collection) => {
    const isAdded = isPostInCollection(collection.collection_id);
    toggleCollectionMutation.mutate({
      collectionId: collection.collection_id,
      added: isAdded
    });
  };

  const renderCollectionItem = ({ item }: { item: Collection }) => {
    const isAdded = isPostInCollection(item.collection_id);
    
    return (
      <TouchableOpacity 
        onPress={() => handleCollectionPress(item)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between py-4 border-b border-gray-100 px-5"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center">
            <Ionicons name="folder-outline" size={20} color="#6B7280" />
          </View>
          <View>
            <Text className="text-base font-headingSemi text-dark">{item.name}</Text>
            <Text className="text-xs font-body text-gray-500">{item.post_count} posts</Text>
          </View>
        </View>
        
        <Ionicons 
          name={isAdded ? "checkbox" : "square-outline"} 
          size={22} 
          color={isAdded ? "#A03048" : "#9CA3AF"} 
        />
      </TouchableOpacity>
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: 'white',
        borderRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#E5E7EB',
        width: 40,
      }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100 px-5">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-sm font-headingSemi text-gray-500">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-base font-heading text-dark">Save to Collection</Text>
          <TouchableOpacity onPress={() => toggleGlobalSaveMutation.mutate()}>
            <Text className="text-sm font-headingSemi text-primary">
              {isSavedGlobally ? 'Unsave' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {isLoading ? (
          <View style={{ flex: 1 }} className="items-center justify-center">
            <ActivityIndicator color="#A03048" />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Create New Collection Inline Button */}
            {!isCreating ? (
              <TouchableOpacity
                onPress={() => setIsCreating(true)}
                activeOpacity={0.7}
                className="flex-row items-center gap-3 py-4 px-5 border-b border-gray-100"
              >
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                  <Ionicons name="add" size={22} color="#A03048" />
                </View>
                <Text className="text-base font-headingSemi text-primary">Create New Collection</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center gap-3 py-3 px-5 border-b border-gray-100 bg-gray-50">
                <BottomSheetTextInput
                  autoFocus
                  placeholder="Collection name"
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 h-11 text-sm font-body text-dark"
                  placeholderTextColor="#9CA3AF"
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  maxLength={50}
                />
                <TouchableOpacity
                  onPress={handleCreateCollection}
                  disabled={!newCollectionName.trim() || createCollectionMutation.isPending}
                  className="bg-primary px-4 h-11 rounded-xl items-center justify-center"
                  style={{ minWidth: 80 }}
                >
                  {createCollectionMutation.isPending ? (
                    <LoadingDots size={4} gap={4} color="#fff" />
                  ) : (
                    <Text className="text-sm font-headingSemi text-white">Create</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsCreating(false)} className="p-2">
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}

            {/* Collections List — `flex: 1` fills the space the computed snap
                point reserves for it, so a long list scrolls within the sheet
                while a short one leaves the sheet compact. */}
            <BottomSheetScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
              showsVerticalScrollIndicator={false}
            >
              {collections.length === 0 ? (
                <View className="py-20 items-center px-10">
                  <Ionicons name="bookmark-outline" size={48} color="#9CA3AF" className="mb-3" />
                  <Text className="font-headingSemi text-gray-500 text-base mb-1 text-center">No collections yet</Text>
                  <Text className="font-body text-gray-400 text-xs text-center leading-5">
                    Create collections to organize your saved posts by topic, pet, or categories!
                  </Text>
                </View>
              ) : (
                collections.map((item) => (
                  <View key={item.collection_id}>
                    {renderCollectionItem({ item })}
                  </View>
                ))
              )}
            </BottomSheetScrollView>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};
