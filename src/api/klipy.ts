// Thin client for Klipy's GIF REST API (search + trending).
// Keys are public at build time (EXPO_PUBLIC_*); rate limits apply per key.
export interface GifItem {
  id: string;
  title: string;
  /** Animated CDN URL to attach on the post/comment. */
  url: string;
  /** Still/preview URL for grid tiles and thumbnail_url. */
  previewUrl: string;
  width: number;
  height: number;
}

/** @deprecated Use GifItem — kept so older imports keep compiling during rename. */
export type GiphyGif = GifItem;

const API_BASE = 'https://api.klipy.com/api/v1';
const RATING = 'pg-13';
const DEFAULT_LIMIT = 24;

function apiKey(): string {
  const key = process.env.EXPO_PUBLIC_KLIPY_API_KEY;
  if (!key) {
    throw new Error('Klipy is not configured. Set EXPO_PUBLIC_KLIPY_API_KEY.');
  }
  return key;
}

function pickFileUrl(files: any, format: 'gif' | 'jpg' | 'png' | 'webp', sizes = ['md', 'sm', 'hd', 'xs']): string | undefined {
  if (!files || typeof files !== 'object') return undefined;
  // Shape A: files.md.gif.url
  for (const size of sizes) {
    const url = files?.[size]?.[format]?.url;
    if (typeof url === 'string' && url) return url;
  }
  // Shape B: files.gif.url (PHP client style)
  const flat = files?.[format]?.url;
  if (typeof flat === 'string' && flat) return flat;
  return undefined;
}

function mapGif(raw: any): GifItem | null {
  if (!raw || raw.type === 'ad') return null;
  const files = raw.file || raw.files;
  const url = pickFileUrl(files, 'gif') || (typeof raw.url === 'string' ? raw.url : undefined);
  if (!url) return null;
  const previewUrl =
    pickFileUrl(files, 'jpg') ||
    pickFileUrl(files, 'png') ||
    pickFileUrl(files, 'webp') ||
    pickFileUrl(files, 'gif', ['sm', 'xs', 'md']) ||
    url;
  const sizeMeta = files?.md?.gif || files?.sm?.gif || files?.hd?.gif || files?.gif || {};
  return {
    id: String(raw.slug || raw.id || url),
    title: String(raw.title || ''),
    url,
    previewUrl,
    width: Number(sizeMeta.width) || Number(raw.width) || 0,
    height: Number(sizeMeta.height) || Number(raw.height) || 0,
  };
}

async function fetchGifs(
  path: 'trending' | 'search',
  params: Record<string, string | number>
): Promise<{ gifs: GifItem[]; page: number; hasMore: boolean }> {
  const qs = new URLSearchParams({
    rating: RATING,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${API_BASE}/${apiKey()}/gifs/${path}?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Klipy request failed (${res.status})`);
  }
  const json = await res.json();
  // Response shapes seen in the wild:
  //   { result: true, data: { data: [...], current_page, has_next, per_page } }
  //   { data: [...], current_page, has_next }
  const pageBlock = Array.isArray(json?.data?.data)
    ? json.data
    : Array.isArray(json?.data)
    ? json
    : Array.isArray(json?.result?.data)
    ? json.result
    : null;
  const list: any[] = pageBlock?.data ?? (Array.isArray(json?.data) ? json.data : []) ?? [];
  const gifs = list.map(mapGif).filter((g: GifItem | null): g is GifItem => !!g);
  const page = Number(pageBlock?.current_page ?? params.page ?? 1);
  const hasMore = Boolean(pageBlock?.has_next ?? gifs.length >= Number(params.per_page ?? DEFAULT_LIMIT));
  return { gifs, page, hasMore };
}

export const klipyApi = {
  trending(opts: { page?: number; limit?: number } = {}) {
    return fetchGifs('trending', {
      page: opts.page ?? 1,
      per_page: opts.limit ?? DEFAULT_LIMIT,
    });
  },

  search(q: string, opts: { page?: number; limit?: number } = {}) {
    return fetchGifs('search', {
      q: q.trim(),
      page: opts.page ?? 1,
      per_page: opts.limit ?? DEFAULT_LIMIT,
    });
  },
};

/** @deprecated Use klipyApi */
export const giphyApi = klipyApi;
