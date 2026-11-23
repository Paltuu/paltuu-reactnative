import { router } from 'expo-router';
import { LOST_AND_FOUND_ENABLED } from '../constants/features';

// Adoption application notifications that go to the applicant. All three
// application types share one deep link (paltuu://adoptions/applications/{id}),
// so the notification type is what says whose screen it opens.
const APPLICANT_APPLICATION_TYPES = new Set(['adoption_application_approved', 'adoption_application_rejected']);

/**
 * Maps a deep link string (e.g. "paltuu://social/post/123") to an expo-router path
 * and performs the navigation, with safety fallbacks to prevent crashes.
 *
 * `type` is the notification type, when the link came from a notification. Only
 * adoption application links need it today.
 */
export const handleDeepLink = (deepLink: string | null | undefined, type?: string | null) => {
  if (!deepLink) return;

  if (__DEV__) {
    console.log('[Deep Link Router] Handling deep link:', deepLink);
  }

  try {
    let cleanLink = deepLink;
    if (!cleanLink.includes('://')) {
      cleanLink = `paltuu://${cleanLink}`;
    }

    const url = new URL(cleanLink);
    const host = url.host || '';
    const path = url.pathname || '';
    
    // Combine host and path. E.g. host: 'social', path: '/post/123' -> '/social/post/123'
    const combinedPath = `/${host}${path}`.replace(/\/+/g, '/');

    if (__DEV__) {
      console.log(`[Deep Link Router] Parsed path: ${combinedPath}`);
    }

    const parts = combinedPath.split('/').filter(Boolean);

    // Comment/reply notifications: push the post first so the thread screen's
    // back button lands the user back on the post, then push the focused
    // thread on top of it — mirrors the in-app "Continue this thread" flow.
    if (parts[0] === 'social' && parts[1] === 'post' && parts[3] === 'comment' && parts[4]) {
      const postId = parts[2];
      const commentId = parts[4];
      if (__DEV__) {
        console.log(`[Deep Link Router] Navigating to thread ${commentId} on post ${postId}`);
      }
      router.push(`/post/${postId}` as any);
      router.push({ pathname: '/thread/[id]', params: { id: commentId, postId } } as any);
      return;
    }

    // Rating-prompt notification: paltuu://express-vet/requests/{id}/rate — checked before the
    // generic table below since that one's prefix match would otherwise swallow this and drop /rate.
    if (parts[0] === 'express-vet' && parts[1] === 'requests' && parts[2] && parts[3] === 'rate') {
      router.push({ pathname: '/(app)/express-vet/requests/[id]/rate', params: { id: parts[2] } } as any);
      return;
    }

    // Adoption application: paltuu://adoptions/applications/{id}. The pet owner
    // (new application) goes to Adoption requests, the applicant (approved /
    // not approved) to My applications, and either screen opens that application.
    // Both screens are flat routes, so the id goes in a param: the old
    // `/adoption-requests/{id}` path matched no route at all.
    if (parts[0] === 'adoptions' && parts[1] === 'applications') {
      const pathname = type && APPLICANT_APPLICATION_TYPES.has(type) ? '/(app)/my-applications' : '/(app)/adoption-requests';
      router.push({ pathname, params: parts[2] ? { applicationId: parts[2] } : {} } as any);
      return;
    }

    const routes: Record<string, (parts: string[], url?: URL) => string> = {
      '/social/post': (p) => `/post/${p[2]}`,
      '/post':        (p) => `/post/${p[1]}`,
      // Older follow-request notifications (created before that template
      // switched to linking straight to the requester's profile) still carry
      // this deep link — kept so those already-delivered notifications still
      // go somewhere instead of falling through to the catch-all below.
      '/notifications/follow-requests': () => `/follow-requests`,
      '/profile':     (p) => `/(app)/profile/${p[1]}`,
      '/pet-details': (p, u) => `/pet-details?id=${u?.searchParams.get('petId') || u?.searchParams.get('id') || p[1] || ''}`,
      '/pet-profile': (p) => `/(app)/pet-profile/${p[1]}`,
      '/bazaar/orders': (p) => `/(app)/orders/${p[2]}`,
      // paltuu://adoptions/{petId} (listing approved, new listing match). The
      // adopt screen is a flat route too, so `/adopt/{id}` matched nothing; the
      // pet's own page is where these belong.
      '/adoptions':   (p) => (p[1] ? `/pet-details?id=${p[1]}` : `/(app)/adopt`),
      '/lost-found':  ()  => (LOST_AND_FOUND_ENABLED ? `/(app)/create-lost-found` : `/(app)/(tabs)/pets`),
      '/bazaar/cart': ()  => `/(app)/cart`,
      '/bazaar':      ()  => `/(app)/marketplace`,
      '/vet-panel':   ()  => `/(app)/vet-panel`,
      '/express-vet-dispatch/requests': (p) => `/(app)/express-vet-dispatch/requests/${p[2]}`,
      '/express-vet/requests': (p) => `/(app)/express-vet/requests/${p[2]}`,
    };

    const matchedKey = Object.keys(routes).find(key => combinedPath.startsWith(key));

    if (matchedKey) {
      const destination = routes[matchedKey](parts, url);
      if (__DEV__) {
        console.log(`[Deep Link Router] Navigating to target route: ${destination}`);
      }
      router.push(destination as any);
    } else {
      if (__DEV__) {
        console.warn(`[Deep Link Router] No matching route found for: ${combinedPath}. Navigating to notifications screen.`);
      }
      router.push('/notifications');
    }
  } catch (error) {
    console.error('[Deep Link Router] Error processing deep link URL:', error);
    // Always fallback gracefully to avoid app crashing
    router.push('/notifications');
  }
};
