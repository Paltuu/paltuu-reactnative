import { socialApi } from '../api/social';

type StatusCallback = (data: {
  video_status: 'pending' | 'processing' | 'ready' | 'failed';
  hls_url: string | null;
  thumbnail_url: string | null;
}) => void;

interface PollState {
  listeners: Set<StatusCallback>;
  intervalId: NodeJS.Timeout;
}

// Global registry of active video status pollers
const activePolls = new Map<string, PollState>();

/**
 * Subscribes to status updates for a video transcoding job.
 * Deduplicates multiple polling requests for the same media ID into a single timer and request.
 * 
 * @param mediaId The media database ID to poll
 * @param callback Callback triggered when status is updated
 * @returns Unsubscribe function
 */
export function subscribeToVideoStatus(mediaId: string, callback: StatusCallback): () => void {
  let state = activePolls.get(mediaId);

  if (!state) {
    const listeners = new Set<StatusCallback>([callback]);
    
    const checkStatus = async () => {
      try {
        const data = await socialApi.getVideoStatus(mediaId);
        
        // Retrieve latest state inside async callback to check if still active
        const currentState = activePolls.get(mediaId);
        if (!currentState) return;

        // If transcoding is done, notify listeners and clean up the poller
        if (data.video_status === 'ready' || data.video_status === 'failed') {
          currentState.listeners.forEach((listener) => listener(data));
          clearInterval(currentState.intervalId);
          activePolls.delete(mediaId);
          console.log(`[VideoStatusPoller] Transcoding finished for ${mediaId}. Cleaned up global poller.`);
        }
      } catch (err) {
        console.warn(`[VideoStatusPoller] Error polling status for ${mediaId}:`, err);
      }
    };

    // Start a single timer for this media ID (poll every 15 seconds)
    const intervalId = setInterval(checkStatus, 15000);
    
    state = { listeners, intervalId };
    activePolls.set(mediaId, state);
    
    // Check once immediately
    checkStatus();
  } else {
    // Media ID is already being polled; just add this callback to the listeners group
    state.listeners.add(callback);
    console.log(`[VideoStatusPoller] Reuse active poller for ${mediaId}. Total listeners: ${state.listeners.size}`);
  }

  // Return unsubscribe cleanup function
  return () => {
    const currentState = activePolls.get(mediaId);
    if (currentState) {
      currentState.listeners.delete(callback);
      
      // If there are no more components listening to this media, stop the timer entirely
      if (currentState.listeners.size === 0) {
        clearInterval(currentState.intervalId);
        activePolls.delete(mediaId);
        console.log(`[VideoStatusPoller] No more listeners for ${mediaId}. Stopped timer.`);
      }
    }
  };
}
