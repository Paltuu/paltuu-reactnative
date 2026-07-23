import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { View, StyleSheet } from 'react-native';
import ImageModal from '../components/common/ImageModal';
import { SaveBottomSheet } from '../components/social/SaveBottomSheet';
import { ReportBottomSheet } from '../components/social/ReportBottomSheet';
import { RepostBottomSheet } from '../components/social/RepostBottomSheet';
import { PostOptionsBottomSheet } from '../components/social/PostOptionsBottomSheet';

export interface OptionsConfig {
  isOwnPost: boolean;
  isSaved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
  onHide: () => void;
}

export interface RepostConfig {
  isReposted: boolean;
  onRepost: () => void;
  onQuote: () => void;
}

export interface MediaItem {
  url: string;
  type?: 'image' | 'video' | 'gif';
  thumbnail_url?: string;
}

interface PostCardModalsContextValue {
  showImageViewer: (mediaItems: MediaItem[], index: number) => void;
  showSaveSheet: (postId: string) => void;
  showOptionsSheet: (config: OptionsConfig) => void;
  showRepostSheet: (config: RepostConfig) => void;
  showReportSheet: (postId: string) => void;
  closeAll: () => void;
}

const PostCardModalsContext = createContext<PostCardModalsContextValue | null>(null);

type ActiveModal = 'none' | 'image' | 'save' | 'options' | 'repost' | 'report';

export function PostCardModalsProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [savePostId, setSavePostId] = useState('');
  const [optionsConfig, setOptionsConfig] = useState<OptionsConfig | null>(null);
  const [repostConfig, setRepostConfig] = useState<RepostConfig | null>(null);
  const [reportPostId, setReportPostId] = useState('');

  const closeAll = useCallback(() => {
    setActiveModal('none');
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

  const value = useMemo<PostCardModalsContextValue>(() => ({
    showImageViewer,
    showSaveSheet,
    showOptionsSheet,
    showRepostSheet,
    showReportSheet,
    closeAll,
  }), [showImageViewer, showSaveSheet, showOptionsSheet, showRepostSheet, showReportSheet, closeAll]);

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
            isSaved={optionsConfig.isSaved}
            onSave={optionsConfig.onSave}
            onEdit={optionsConfig.onEdit}
            onDelete={optionsConfig.onDelete}
            onReport={optionsConfig.onReport}
            onBlock={optionsConfig.onBlock}
            onHide={optionsConfig.onHide}
          />
        )}
      </View>
    </PostCardModalsContext.Provider>
  );
}

export function usePostCardModals(): PostCardModalsContextValue | null {
  return useContext(PostCardModalsContext);
}
