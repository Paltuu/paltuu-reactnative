import * as FileSystem from 'expo-file-system/legacy';

// Simple hash helper to generate a safe filename from a URL
function getFilename(url: string): string {
  const extension = url.split('.').pop()?.split('?')[0] || 'mp4';
  // Simple hash code generator
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `video_cache_${Math.abs(hash)}.${extension}`;
}

// Map to keep track of downloads currently in progress to avoid duplicate parallel streams
const activeDownloads = new Map<string, Promise<string>>();

/**
 * Resolves a remote video URL to a local cached file if available.
 * If not cached, returns the remote URL and starts caching in the background.
 */
export async function getCachedVideoUri(remoteUri: string): Promise<string> {
  // HLS playlists (.m3u8) contain multiple segments and cannot be cached as a single file.
  // Native players already optimize HLS buffering, so we serve them remotely.
  if (remoteUri.includes('.m3u8') || !remoteUri.startsWith('http')) {
    return remoteUri;
  }

  const filename = getFilename(remoteUri);
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    
    if (fileInfo.exists) {
      console.log(`[VideoCache] Cache hit: serving local file for ${remoteUri} -> ${localUri}`);
      return localUri;
    }

    // If a download for this exact file is already running, do not start another one
    if (activeDownloads.has(localUri)) {
      console.log(`[VideoCache] Download already in progress for: ${remoteUri}`);
      return remoteUri;
    }

    console.log(`[VideoCache] Cache miss: playing remote & starting download in background: ${remoteUri}`);
    
    // Start download and track the promise
    const downloadPromise = FileSystem.downloadAsync(remoteUri, localUri)
      .then((result) => {
        console.log(`[VideoCache] Successfully cached video to disk: ${result.uri}`);
        activeDownloads.delete(localUri); // Remove tracker on success
        return result.uri;
      })
      .catch((err) => {
        console.warn('[VideoCache] Background download failed:', err);
        activeDownloads.delete(localUri); // Remove tracker on error so it can retry later
        throw err;
      });

    activeDownloads.set(localUri, downloadPromise);

    return remoteUri;
  } catch (error) {
    console.warn('[VideoCache] Error checking cache, falling back to remote:', error);
    return remoteUri;
  }
}



