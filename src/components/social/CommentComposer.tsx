// Shared comment-composer logic used by the full-screen comment screen
// (app/comment/[id].tsx), the inline phase-2 composer on the post detail screen
// (app/post/[id].tsx) and the re-rooted thread screen (app/thread/[id].tsx).
// Keeps media, pet tagging and the submit + cache-update logic in one place so
// the three surfaces stay in sync.
//
// Media follows the same rule as every other composer: previews are local and
// instant, uploads start at pick time (useMediaDraft), and Post never blocks.
// Since these screens stay put rather than navigating to a feed with a progress
// banner, the "don't block" half is served by an optimistic comment row that
// appears in the thread immediately and solidifies when the server replies.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { socialApi } from '../../api/social';
import { petProfilesApi } from '../../api/petProfiles';
import { useAuthStore } from '../../stores/authStore';
import { useMediaDraft } from '../../hooks/useMediaDraft';
import { confirmVideos } from '../../hooks/useMediaDraft';
import {
  commentsQueryKey,
  insertCommentInPages,
  removeCommentInPages,
  updateCommentInPages,
} from '../../hooks/useComments';
import { useMentionInput, appendMention } from './MentionInput';
import { matchBadWords } from '../../utils/moderation/badWords';

export { ComposerMediaGrid, ComposerToolbar } from './ComposerMediaGrid';
export type { DraftMedia } from '../../hooks/useMediaDraft';

/**
 * Compact nudge shown while composing a post/comment.
 *
 * Belongs pinned to the composer's bottom toolbar, NOT inline under the text
 * input: the caption field reserves ~100px of empty height, so an inline
 * banner ends up floating alone in the middle of a blank screen, visually
 * attached to nothing. Anchored to the toolbar it always sits in the same
 * predictable place, keyboard up or down.
 *
 * Soft warning only — it never blocks submission. The server does the
 * authoritative check and is the only thing that can actually censor content
 * (see lib/moderation/badWords.ts in paltuu-nextjs).
 */
export const ContentWarningBanner = ({ text }: { text: string }) => {
  const { severe, mild } = useMemo(() => matchBadWords(text), [text]);
  if (severe.length === 0 && mild.length === 0) return null;
  const isSevere = severe.length > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        backgroundColor: isSevere ? '#FEF2F2' : '#FFFBEB',
      }}
    >
      <Ionicons
        name={isSevere ? 'alert-circle' : 'warning-outline'}
        size={15}
        color={isSevere ? '#DC2626' : '#B45309'}
      />
      <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, color: isSevere ? '#B91C1C' : '#92400E' }}>
        {isSevere
          ? 'Offensive language will be covered up.'
          : 'This may read as offensive to some people.'}
      </Text>
    </View>
  );
};

const MAX_COMMENT_MEDIA = 4;

let tempCounter = 0;
const nextTempId = () => `temp-${Date.now().toString(36)}-${tempCounter++}`;

/* ── Draft hook: state + media + pet tagging + optimistic submit ── */
export const useCommentDraft = ({
  postId,
  parentId,
  onPosted,
}: {
  postId: string;
  parentId?: string;
  onPosted?: () => void;
}) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [petProfiles, setPetProfiles] = useState<any[]>([]);
  const media = useMediaDraft({ maxItems: MAX_COMMENT_MEDIA, allowVideo: false });

  const { triggers: mentionTriggers, textInputProps: mentionInputProps, mentionState, mentionActive } = useMentionInput({
    value: text,
    onChange: setText,
  });

  // Programmatic insert (e.g. the "replying to @username" prefill) — splices
  // a real, encoded mention token rather than plain unlinked text.
  const insertMention = (mention: { type: 'user' | 'pet'; id: number; name: string }) =>
    setText((prev) => appendMention(prev, mention));

  useEffect(() => {
    if (user?.id) {
      petProfilesApi
        .getUserPetProfiles(user.id)
        .then((res) => setPetProfiles(res.pet_profiles ?? []))
        .catch((err) => console.error('Error fetching pet profiles:', err));
    }
  }, [user?.id]);

  const togglePet = (id: number) =>
    setSelectedPets((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const bumpCommentCount = (delta: number) => {
    queryClient.setQueryData(['post', postId], (old: any) =>
      old ? { ...old, is_commented: delta > 0 || old.is_commented, comment_count: Math.max(0, (old.comment_count || 0) + delta) } : old
    );
    queryClient.setQueriesData({ queryKey: ['social-feed'] }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: any) =>
            String(p.post_id) === String(postId)
              ? {
                  ...p,
                  is_commented: delta > 0 || p.is_commented,
                  comment_count: Math.max(0, (p.comment_count || 0) + delta),
                }
              : p
          ),
        })),
      };
    });
  };

  /** Depth of a would-be reply — one below its parent, or 0 at the root. */
  const depthForParent = (parentCommentId?: string) => {
    if (!parentCommentId) return 0;
    const cache: any = queryClient.getQueryData(commentsQueryKey(postId));
    for (const page of cache?.pages ?? []) {
      for (const c of page.comments ?? []) {
        if (String(c.comment_id) === String(parentCommentId)) return (c.depth ?? 0) + 1;
      }
    }
    return 1;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Post the draft. Returns synchronously: the thread gets a pending row and the
   * composer clears on the same tick, then the upload tail + API call finish in
   * the background. `parentIdOverride` lets post/[id] and thread/[id] reply to a
   * specific comment through this same pipeline.
   */
  const submit = (parentIdOverride?: string) => {
    const body = text.trim();
    if (!body && media.count === 0) return;

    const effectiveParentId = parentIdOverride ?? parentId;
    const tempId = nextTempId();

    // Snapshot the local previews before clearing, so the pending row shows the
    // same images the user just saw in the composer.
    const localMedia = media.items.map((item, i) => ({
      media_type: item.type,
      url: item.uri,
      thumbnail_url: item.thumbnailUri ?? null,
      ordering: i,
    }));

    // Releases the tiles for reuse but keeps their uploads running.
    const settleMedia = media.detach();

    const optimistic = {
      comment_id: tempId,
      user_id: user?.id,
      author_name: user?.name ?? 'You',
      author_image: user?.profile_image_url ?? null,
      social_username: (user as any)?.social_username ?? (user as any)?.username ?? null,
      content: body,
      created_at: new Date().toISOString(),
      like_count: 0,
      is_liked: false,
      depth: depthForParent(effectiveParentId),
      parent_comment_id: effectiveParentId ?? null,
      media: localMedia,
      _pending: true,
    };

    queryClient.setQueryData(commentsQueryKey(postId), (old: any) =>
      insertCommentInPages(old, optimistic)
    );
    bumpCommentCount(1);

    setText('');
    setSelectedPets([]);
    setIsSubmitting(true);
    onPosted?.();

    const petTags = selectedPets;
    (async () => {
      try {
        const settled = await settleMedia();
        const res = await socialApi.postComment(postId, body, effectiveParentId, {
          media: settled.media,
          petProfileTags: petTags,
        });
        const created = res?.comment ?? res;
        await confirmVideos(created?.media ?? [], settled.videoKeys);

        // Swap the pending row for the real one in place, so the comment doesn't
        // visibly jump position as it confirms.
        queryClient.setQueryData(commentsQueryKey(postId), (old: any) =>
          created?.comment_id
            ? updateCommentInPages(old, tempId, () => ({ ...optimistic, ...created, _pending: false }))
            : removeCommentInPages(old, tempId)
        );
        queryClient.invalidateQueries({ queryKey: ['comments', postId] });
        queryClient.invalidateQueries({ queryKey: ['post', postId] });

        // The server censors slurs rather than rejecting or hiding the comment
        // (see lib/moderation/badWords.ts) — the reply stays in the thread so
        // its own replies keep their parent, but the author is told plainly
        // that part of their wording was covered. The swap above has already
        // replaced their optimistic row with the censored copy.
        if (created?.moderation_state === 'redacted') {
          Alert.alert(
            'Some words were hidden',
            'Your reply was posted, but language that violates our Community Guidelines has been covered up. Repeated violations can get your account suspended.'
          );
        }
      } catch (err: any) {
        console.error('[useCommentDraft] Failed to post comment:', err);
        // Roll the optimistic row back rather than leaving a ghost in the thread.
        queryClient.setQueryData(commentsQueryKey(postId), (old: any) =>
          removeCommentInPages(old, tempId)
        );
        bumpCommentCount(-1);
        Alert.alert('Comment not posted', err?.response?.data?.error || err?.message || 'Could not post your comment.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return {
    text,
    setText,
    insertMention,
    mentionTriggers,
    mentionInputProps,
    mentionState,
    mentionActive,
    media: media.items,
    pickImage: media.pickFromLibrary,
    pickCamera: media.pickFromCamera,
    addGif: media.addGif,
    removeMedia: media.remove,
    retryMedia: media.retry,
    selectedPets,
    togglePet,
    petProfiles,
    submit,
    isSubmitting,
    // Never gated on upload state — anything still in flight is awaited by the
    // background tail after the pending row is already on screen.
    canSubmit: text.trim().length > 0 || media.count > 0,
  };
};
