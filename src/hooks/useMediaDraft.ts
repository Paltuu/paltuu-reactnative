// src/hooks/useMediaDraft.ts
// Single owner of composer draft media across every surface that attaches it —
// create-post, the quote composer, and all three comment composers.
//
// The rule this enforces, uniformly:
//   1. The preview tile is rendered from the local file:// URI the picker returns,
//      synchronously. Nothing ever waits on the network to show media.
//   2. The upload to the cloud starts the moment the item is picked, in the
//      background, per item. The user's composition time (writing a caption,
//      tagging pets) overlaps the transfer instead of running before it.
//   3. `settle()` is what a submit handler awaits. In the common case every item
//      already finished while the user was typing, so it resolves immediately and
//      Post feels instant.
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { socialApi } from '../api/social';
import type { GifItem } from '../api/klipy';

export type DraftMediaStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface DraftMedia {
  /** Stable local id — use this as the React key, never `uri` + index. Items can
   *  be removed from the middle of the list while their upload is still in flight. */
  id: string;
  uri: string;
  type: 'image' | 'video' | 'gif';
  /** Only set for videos (e.g. 'video/mp4', 'video/quicktime'). */
  mime?: string;
  /** Locally extracted video poster frame, filled in shortly after the tile appears. */
  thumbnailUri?: string;
  status: DraftMediaStatus;
  /** 0..1 — only meaningful while `status === 'uploading'`. */
  progress: number;
  /** Server media payload, present once `status === 'uploaded'`. */
  remote?: any;
  /** S3 key for an uploaded video, needed by `confirmVideos` after post creation. */
  videoKey?: string;
  error?: string;
}

export interface SettledMedia {
  /** Server media payloads in the order the user picked them, ready to POST. */
  media: any[];
  /** Index-aligned with `media` — the S3 key for videos, null for images. */
  videoKeys: (string | null)[];
}

let idCounter = 0;
const nextId = () => `dm-${Date.now().toString(36)}-${idCounter++}`;

/**
 * Kick off MediaConvert transcoding for each video on a freshly created post or
 * comment. The server's media rows come back in the same order they were sent, so
 * the Nth created video row pairs with the Nth video key — this must stay an
 * index match, never a `.find()`.
 */
export async function confirmVideos(createdMedia: any[], videoKeys: (string | null)[]) {
  const createdVideos = (createdMedia ?? []).filter((m: any) => m.media_type === 'video');
  const keys = videoKeys.filter((k): k is string => !!k);
  for (let i = 0; i < createdVideos.length; i++) {
    const key = keys[i];
    const mediaId = createdVideos[i]?.media_id;
    if (!key || !mediaId) continue;
    try {
      await socialApi.confirmVideoUpload(key, String(mediaId));
    } catch (err) {
      console.error(`[useMediaDraft] confirmVideoUpload failed for video ${i}:`, err);
    }
  }
}

export interface UseMediaDraftOptions {
  maxItems?: number;
  allowVideo?: boolean;
}

export function useMediaDraft({ maxItems = 10, allowVideo = true }: UseMediaDraftOptions = {}) {
  // The ref is the source of truth: upload callbacks resolve long after the
  // closure that started them, and `settle()` must read the current list rather
  // than whatever was captured at render time. State is a mirror for rendering.
  const itemsRef = useRef<DraftMedia[]>([]);
  const [items, setItemsState] = useState<DraftMedia[]>([]);

  const commit = useCallback((updater: (prev: DraftMedia[]) => DraftMedia[]) => {
    itemsRef.current = updater(itemsRef.current);
    setItemsState(itemsRef.current);
  }, []);

  // In-flight uploads, keyed by item id. An entry is deleted the moment its
  // upload finishes (success or failure), so "is anything still running?" is
  // just a size check. Removing an item deletes its entry too, which is how a
  // cancelled upload stops blocking `settle()`.
  const inFlight = useRef<Map<string, Promise<void>>>(new Map());

  // Upload outcomes, keyed by item id, kept deliberately separate from the
  // rendered `items`. A composer can hide its tiles the instant the user hits
  // Post (see `detach`) while the uploads those tiles represent are still
  // running — the results have to land somewhere that isn't the UI list.
  const results = useRef<Map<string, { remote?: any; videoKey?: string; error?: string }>>(new Map());

  // Set by `settle(onProgress)` so a background job (the upload banner in
  // MainHeader) can report aggregate progress for whatever is still in flight.
  const progressListener = useRef<((p: number) => void) | null>(null);

  /** Write a partial update to one item. A no-op if that item was removed
   *  mid-upload — which is exactly the abort behaviour we want. */
  const patch = useCallback((id: string, partial: Partial<DraftMedia>) => {
    commit((prev) => prev.map((it) => (it.id === id ? { ...it, ...partial } : it)));
    const listener = progressListener.current;
    if (listener) {
      const current = itemsRef.current;
      const total = current.reduce((sum, it) => sum + it.progress, 0);
      listener(current.length ? total / current.length : 1);
    }
  }, [commit]);

  const uploadOne = useCallback(async (item: DraftMedia) => {
    patch(item.id, { status: 'uploading', progress: 0, error: undefined });
    try {
      if (item.type === 'video') {
        // Poster frame first, before any network call — a video tile has nothing
        // to show until this lands, so every millisecond of it is visible.
        // Best-effort: a video without a poster is still perfectly postable.
        let thumbnailUri = item.thumbnailUri;
        if (!thumbnailUri) {
          try {
            const VideoThumbnails = require('expo-video-thumbnails');
            const { uri } = await VideoThumbnails.getThumbnailAsync(item.uri, { time: 1000 });
            thumbnailUri = uri;
            patch(item.id, { thumbnailUri });
          } catch (err) {
            console.warn('[useMediaDraft] Failed to generate video thumbnail:', err);
          }
        }

        const mime = item.mime || 'video/mp4';
        const ext = mime === 'video/quicktime' ? 'mov' : 'mp4';
        const { upload_url, video_key, raw_url } = await socialApi.getVideoUploadUrl(ext);

        // Uploaded so the post shows a still while MediaConvert transcodes.
        let thumbnailRemoteUrl: string | null = null;
        if (thumbnailUri) {
          try {
            const res = await socialApi.uploadMedia([thumbnailUri]);
            thumbnailRemoteUrl = res.media[0]?.url ?? null;
          } catch (err) {
            console.warn('[useMediaDraft] Failed to upload video thumbnail:', err);
          }
        }

        // Runs on a native background task (see socialApi.uploadVideoToS3), so
        // it survives the app being backgrounded mid-transfer.
        await socialApi.uploadVideoToS3(upload_url, item.uri, mime, (p) => {
          patch(item.id, { progress: p });
        });

        const remote = {
          media_type: 'video',
          url: raw_url || item.uri,
          thumbnail_url: thumbnailRemoteUrl,
          video_status: 'pending',
        };
        results.current.set(item.id, { remote, videoKey: video_key });
        patch(item.id, { status: 'uploaded', progress: 1, videoKey: video_key, remote });
      } else if (item.type === 'gif') {
        // CDN GIFs are already "uploaded" — should never reach here, but if a
        // retry somehow fires, just re-materialize the remote payload.
        const remote = item.remote ?? {
          media_type: 'gif',
          url: item.uri,
          thumbnail_url: item.thumbnailUri || item.uri,
        };
        results.current.set(item.id, { remote });
        patch(item.id, { status: 'uploaded', progress: 1, remote });
      } else {
        const processed = await manipulateAsync(item.uri, [{ resize: { width: 1200 } }], {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });
        // No byte-level progress from the multipart POST — step to a visible
        // partial so the tile doesn't sit at 0% for the whole transfer.
        patch(item.id, { progress: 0.3 });
        const res = await socialApi.uploadMedia([processed.uri]);
        results.current.set(item.id, { remote: res.media[0] });
        patch(item.id, { status: 'uploaded', progress: 1, remote: res.media[0] });
      }
    } catch (err: any) {
      console.error('[useMediaDraft] Upload failed:', err);
      const message = err?.message || 'Upload failed';
      results.current.set(item.id, { error: message });
      patch(item.id, { status: 'failed', progress: 0, error: message });
    } finally {
      inFlight.current.delete(item.id);
    }
  }, [patch]);

  const start = useCallback((item: DraftMedia) => {
    results.current.delete(item.id); // a retry supersedes the previous outcome
    inFlight.current.set(item.id, uploadOne(item));
  }, [uploadOne]);

  /** Add picker assets: tiles appear synchronously, uploads start right after. */
  const addAssets = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    const room = maxItems - itemsRef.current.length;
    if (room <= 0) return;

    const newItems: DraftMedia[] = assets.slice(0, room).map((a) => {
      const isVideo = a.type === 'video';
      const ext = (a.uri.split('.').pop() || 'mp4').toLowerCase();
      return {
        id: nextId(),
        uri: a.uri,
        type: isVideo ? ('video' as const) : ('image' as const),
        mime: isVideo ? (ext === 'mov' ? 'video/quicktime' : 'video/mp4') : undefined,
        status: 'pending' as const,
        progress: 0,
      };
    });

    commit((prev) => [...prev, ...newItems]);
    newItems.forEach(start);
  }, [maxItems, commit, start]);

  const pickFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          allowVideo
            ? 'We need access to your photos and videos to upload media.'
            : 'We need access to your photos to attach media.'
        );
        return;
      }
      if (itemsRef.current.length >= maxItems) {
        Alert.alert('Limit Reached', `You can add up to ${maxItems} media items.`);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideo ? ['images', 'videos'] : ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxItems - itemsRef.current.length,
        allowsEditing: false,
        ...(allowVideo ? { videoMaxDuration: 120 } : {}),
      });
      if (!result.canceled && result.assets) addAssets(result.assets);
    } catch (err) {
      console.error('[useMediaDraft] Pick media error:', err);
      Alert.alert('Error', 'An error occurred while picking media. Please try again.');
    }
  }, [allowVideo, maxItems, addAssets]);

  const pickFromCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your camera to take photos.');
        return;
      }
      if (itemsRef.current.length >= maxItems) {
        Alert.alert('Limit Reached', `You can add up to ${maxItems} media items.`);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.length) addAssets(result.assets);
    } catch (err: any) {
      if (err?.message?.includes('Camera not available')) {
        Alert.alert('Camera Unavailable', 'The camera is not available on this device (e.g. Simulator).');
      } else {
        Alert.alert('Error', 'An error occurred while opening the camera.');
      }
    }
  }, [maxItems, addAssets]);

  /**
   * Attach a Klipy CDN GIF — no upload. The tile renders from the CDN URL and
   * the remote payload is ready for settle() immediately.
   */
  const addGif = useCallback((gif: GifItem) => {
    if (itemsRef.current.length >= maxItems) {
      Alert.alert('Limit Reached', `You can add up to ${maxItems} media items.`);
      return;
    }
    const id = nextId();
    const remote = {
      media_type: 'gif',
      url: gif.url,
      thumbnail_url: gif.previewUrl,
      width: gif.width || undefined,
      height: gif.height || undefined,
    };
    const item: DraftMedia = {
      id,
      uri: gif.url,
      type: 'gif',
      thumbnailUri: gif.previewUrl,
      status: 'uploaded',
      progress: 1,
      remote,
    };
    results.current.set(id, { remote });
    commit((prev) => [...prev, item]);
  }, [maxItems, commit]);

  const remove = useCallback((id: string) => {
    inFlight.current.delete(id);
    results.current.delete(id);
    commit((prev) => prev.filter((it) => it.id !== id));
  }, [commit]);

  const retry = useCallback((id: string) => {
    const item = itemsRef.current.find((it) => it.id === id);
    if (!item || item.status === 'uploading' || item.status === 'uploaded') return;
    start(item);
  }, [start]);

  /** Discard the draft entirely, cancelling any in-flight uploads' results. */
  const reset = useCallback(() => {
    inFlight.current.clear();
    results.current.clear();
    commit(() => []);
  }, [commit]);

  /** Gather the outcomes for a fixed set of item ids, in order. */
  const collect = useCallback((ids: string[]): SettledMedia => {
    const failed = ids.filter((id) => !results.current.get(id)?.remote);
    if (failed.length) {
      throw new Error(
        failed.length === ids.length
          ? 'Your media failed to upload. Check your connection and try again.'
          : `${failed.length} of ${ids.length} media items failed to upload.`
      );
    }
    // Array order carries the ordering — the API assigns it server-side, so no
    // `ordering` field goes on the wire (matching what the old inline pipelines
    // did after sorting).
    return {
      media: ids.map((id) => results.current.get(id)!.remote),
      videoKeys: ids.map((id) => results.current.get(id)!.videoKey ?? null),
    };
  }, []);

  /**
   * Resolve once every attached item has finished uploading, yielding the
   * payloads to send to the API. Awaiting this is what a submit handler does
   * instead of starting uploads itself; when the user has been composing for a
   * few seconds it is already resolved. Throws if any item failed.
   */
  const settle = useCallback(async (onProgress?: (p: number) => void): Promise<SettledMedia> => {
    const ids = itemsRef.current.map((it) => it.id);
    progressListener.current = onProgress ?? null;
    try {
      // Loop rather than a single await: a retry fired while we're waiting adds a
      // new in-flight promise that wasn't in the first batch.
      while (inFlight.current.size > 0) {
        await Promise.allSettled(Array.from(inFlight.current.values()));
      }
    } finally {
      progressListener.current = null;
    }
    return collect(ids);
  }, [collect]);

  /**
   * Hand the current attachments off and clear the visible draft in one step,
   * WITHOUT cancelling the uploads still running for them. Returns a settle
   * function bound to the items as they were at this moment.
   *
   * This is what a composer that stays mounted (the comment composers) uses: the
   * tiles disappear and the input is ready for the next comment immediately,
   * while the submission that owns those tiles finishes in the background.
   */
  const detach = useCallback((): (() => Promise<SettledMedia>) => {
    const ids = itemsRef.current.map((it) => it.id);
    const pending = Array.from(inFlight.current.values());
    inFlight.current.clear();
    commit(() => []);
    return async () => {
      await Promise.allSettled(pending);
      return collect(ids);
    };
  }, [commit, collect]);

  return {
    items,
    count: items.length,
    pickFromLibrary,
    pickFromCamera,
    addGif,
    /** @deprecated Use addGif */
    addGiphy: addGif,
    addAssets,
    remove,
    retry,
    reset,
    settle,
    detach,
    /** True when nothing is uploading and nothing failed. */
    isSettled: items.every((it) => it.status === 'uploaded'),
    hasFailures: items.some((it) => it.status === 'failed'),
  };
}
