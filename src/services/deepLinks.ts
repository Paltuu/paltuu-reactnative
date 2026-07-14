import { router } from 'expo-router';

/**
 * Maps a deep link string (e.g. "paltuu://social/post/123") to an expo-router path
 * and performs the navigation, with safety fallbacks to prevent crashes.
 */
export const handleDeepLink = (deepLink: string | null | undefined) => {
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

    const routes: Record<string, (parts: string[], url?: URL) => string> = {
      '/social/post': (p) => `/post/${p[2]}`,
      '/post':        (p) => `/post/${p[1]}`,
      '/profile':     (p) => `/(app)/profile/${p[1]}`,
      '/pet-details': (p, u) => `/pet-details?id=${u?.searchParams.get('petId') || u?.searchParams.get('id') || p[1] || ''}`,
      '/bazaar/orders': (p) => `/(app)/orders/${p[2]}`,
      '/adoptions/applications': (p) => `/(app)/adoption-requests/${p[2]}`,
      '/adoptions':   (p) => `/(app)/adopt/${p[1]}`,
      '/lost-found':  (p) => `/(app)/lost-found/${p[1]}`,
      '/bazaar/cart': ()  => `/(app)/cart`,
      '/bazaar':      ()  => `/(app)/marketplace`,
      '/vet-panel':   ()  => `/(app)/vet-panel`,
    };

    const parts = combinedPath.split('/').filter(Boolean);
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
