import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ImageModal from '../components/common/ImageModal';
import { SaveBottomSheet } from '../components/social/SaveBottomSheet';
import { ReportBottomSheet } from '../components/social/ReportBottomSheet';
import { RepostBottomSheet } from '../components/social/RepostBottomSheet';
import { PostOptionsBottomSheet } from '../components/social/PostOptionsBottomSheet';
import { OriginalPostPreview } from '../components/social/PostCard';
import { SocialPost } from '../api/social';
import { useAuthStore } from '../stores/authStore';

export interface OptionsConfig {
  isOwnPost: boolean;
  isFollowing: boolean;
  isSaved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  onUnfollow: () => void;
  onHide: () => void;
}

export interface RepostConfig {
  isReposted: boolean;
  onRepost: () => void;
  onQuote: () => void;
}

export interface QuoteConfig {
  post: SocialPost;
  onSubmitAsync: (content: string) => Promise<any>;
}

export interface MediaItem {
  url: string;
  type?: 'image' | 'video';
  thumbnail_url?: string;
}

interface PostCardModalsContextValue {
  showImageViewer: (mediaItems: MediaItem[], index: number) => void;
  showSaveSheet: (postId: string) => void;
  showOptionsSheet: (config: OptionsConfig) => void;
  showRepostSheet: (config: RepostConfig) => void;
  showReportSheet: (postId: string) => void;
  showQuoteSheet: (config: QuoteConfig) => void;
  closeAll: () => void;
}

const PostCardModalsContext = createContext<PostCardModalsContextValue | null>(null);

type ActiveModal = 'none' | 'image' | 'save' | 'options' | 'repost' | 'report' | 'quote';

export function PostCardModalsProvider({ children }: { children: ReactNode }) {
  const currentUserAvatar = useAuthStore(state => state.user?.profile_image_url);

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [savePostId, setSavePostId] = useState('');
  const [optionsConfig, setOptionsConfig] = useState<OptionsConfig | null>(null);
  const [repostConfig, setRepostConfig] = useState<RepostConfig | null>(null);
  const [reportPostId, setReportPostId] = useState('');
  const [quoteConfig, setQuoteConfig] = useState<QuoteConfig | null>(null);
  const [quoteContent, setQuoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quoteSheetRef = useRef<BottomSheetModal>(null);
  const quoteSnapPoints = useMemo(() => ['60%', '90%'], []);

  useEffect(() => {
    if (activeModal === 'quote') {
      const t = setTimeout(() => quoteSheetRef.current?.present(), 0);
      return () => clearTimeout(t);
    } else {
      quoteSheetRef.current?.dismiss();
    }
  }, [activeModal]);

  const closeAll = useCallback(() => {
    setActiveModal('none');
    setQuoteContent('');
    setIsSubmitting(false);
  }, []);

  const showImageViewer = useCallback((items: MediaItem[], index: number) => {
    setImageItems(items);
    setImageIndex(index);
    setActiveModal('image');
  }, []);

  const showSaveSheet = useCallback((postId: string) => {
    setSavePostId(postId);
    setActiveModal('save');
  }, []);

  const showOptionsSheet = useCallback((config: OptionsConfig) => {
    setOptionsConfig(config);
    setActiveModal('options');
  }, []);

  const showRepostSheet = useCallback((config: RepostConfig) => {
    setRepostConfig(config);
    setActiveModal('repost');
  }, []);

  const showReportSheet = useCallback((postId: string) => {
    setReportPostId(postId);
    setActiveModal('report');
  }, []);

  const showQuoteSheet = useCallback((config: QuoteConfig) => {
    setQuoteConfig(config);
    setQuoteContent('');
    setIsSubmitting(false);
    setActiveModal('quote');
  }, []);

  const handleQuoteSubmit = useCallback(async () => {
    if (!quoteConfig || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await quoteConfig.onSubmitAsync(quoteContent);
      closeAll();
    } catch {
      setIsSubmitting(false);
    }
  }, [quoteConfig, quoteContent, isSubmitting, closeAll]);

  const renderQuoteBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
    ),
    []
  );

  const value = useMemo<PostCardModalsContextValue>(() => ({
    showImageViewer,
    showSaveSheet,
    showOptionsSheet,
    showRepostSheet,
    showReportSheet,
    showQuoteSheet,
    closeAll,
  }), [showImageViewer, showSaveSheet, showOptionsSheet, showRepostSheet, showReportSheet, showQuoteSheet, closeAll]);

  return (
    <PostCardModalsContext.Provider value={value}>
      {children}

      {/* Absolutely positioned so modal elements never participate in flex layout */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <ImageModal
          mediaItems={imageItems}
          visible={activeModal === 'image'}
          index={imageIndex}
          onClose={closeAll}
        />

        <SaveBottomSheet
          visible={activeModal === 'save'}
          onClose={closeAll}
          postId={savePostId}
        />

        {repostConfig && (
          <RepostBottomSheet
            visible={activeModal === 'repost'}
            onClose={closeAll}
            isReposted={repostConfig.isReposted}
            onRepost={() => { closeAll(); repostConfig.onRepost(); }}
            onQuote={() => { closeAll(); repostConfig.onQuote(); }}
          />
        )}

        <ReportBottomSheet
          visible={activeModal === 'report'}
          onClose={closeAll}
          targetType="post"
          targetId={reportPostId}
        />

        {optionsConfig && (
          <PostOptionsBottomSheet
            visible={activeModal === 'options'}
            onClose={closeAll}
            isOwnPost={optionsConfig.isOwnPost}
            isFollowing={optionsConfig.isFollowing}
            isSaved={optionsConfig.isSaved}
            onSave={optionsConfig.onSave}
            onEdit={optionsConfig.onEdit}
            onDelete={optionsConfig.onDelete}
            onReport={optionsConfig.onReport}
            onBlock={optionsConfig.onBlock}
            onUnfollow={optionsConfig.onUnfollow}
            onHide={optionsConfig.onHide}
          />
        )}

        {/* Shared quote composer — one instance for all cards */}
        <BottomSheetModal
        ref={quoteSheetRef}
        index={0}
        snapPoints={quoteSnapPoints}
        onDismiss={closeAll}
        backdropComponent={renderQuoteBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: 'white', borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 40 }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>Quote Post</Text>
          </View>

          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <TouchableOpacity><Ionicons name="image-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="happy-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="list-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="stats-chart-outline" size={22} color="#A03048" /></TouchableOpacity>
              <TouchableOpacity><Ionicons name="location-outline" size={22} color="#A03048" /></TouchableOpacity>
            </View>
            {quoteConfig && (
              <OriginalPostPreview
                authorName={quoteConfig.post.author_name}
                authorImage={quoteConfig.post.author_image}
                content={quoteConfig.post.content}
                media={quoteConfig.post.media}
                createdAt={quoteConfig.post.created_at}
              />
            )}
          </BottomSheetScrollView>

          <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={{ uri: currentUserAvatar || undefined }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: '#f3f4f6' }}
            />
            <BottomSheetTextInput
              placeholder="Add a comment..."
              style={{ flex: 1, minHeight: 40, maxHeight: 100, fontSize: 14, color: '#111' }}
              placeholderTextColor="#9CA3AF"
              value={quoteContent}
              onChangeText={setQuoteContent}
              multiline
            />
            <TouchableOpacity style={{ marginLeft: 12 }} onPress={handleQuoteSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator size="small" color="#A03048" />
                : <Text style={{ fontSize: 14, fontWeight: '700', color: '#A03048' }}>Post</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
      </View>
    </PostCardModalsContext.Provider>
  );
}

export function usePostCardModals(): PostCardModalsContextValue | null {
  return useContext(PostCardModalsContext);
}
