import { create } from 'zustand';
import { storage } from '../utils/storage';
import { getCurrentPushToken } from '../services/pushTokenHolder';

// Guards logout() against re-entrancy: it now makes a network call (unregister-device)
// before clearing credentials, and client.ts's 401 interceptor calls logout() on a genuine
// refresh failure — if the access token is already dead when logout() runs (that auto-logout
// path), the unregister call itself 401s, which would otherwise re-trigger the same
// interceptor and call logout() again. Without this flag that's unbounded recursion, not just
// one extra call, since each nested attempt makes its own doomed network request in turn.
let isLoggingOut = false;

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_image_url?: string;
  phone_number?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  /** True when a new OAuth (Google/Apple) account still needs to pick a username before personalization. */
  needsUsername: boolean;
  hasSeenOnboarding: boolean;
  setAuth: (user: User | null, accessToken: string, refreshToken: string) => Promise<void>;
  setAuthAsNewUser: (user: User | null, accessToken: string, refreshToken: string, needsUsername?: boolean) => Promise<void>;
  clearNewUser: () => void;
  markOnboardingSeen: () => Promise<void>;
  updateAccessToken: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}


export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  isNewUser: false,
  needsUsername: false,
  hasSeenOnboarding: false,

  markOnboardingSeen: async () => {
    await storage.markOnboardingSeen();
    set({ hasSeenOnboarding: true });
  },

  setAuthAsNewUser: async (user, accessToken, refreshToken, needsUsername = false) => {
    await storage.saveToken(accessToken);
    await storage.saveRefreshToken(refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true, isNewUser: true, needsUsername });
    if (user) {
      await storage.saveUser(user);
      set({ user });
    } else {
      await get().fetchProfile();
    }
  },

  clearNewUser: () => set({ isNewUser: false, needsUsername: false }),

  setAuth: async (user, accessToken, refreshToken) => {
    await storage.saveToken(accessToken);
    await storage.saveRefreshToken(refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
    
    if (user) {
      await storage.saveUser(user);
      set({ user });
    } else {
      // If user is null (common in production login), fetch it immediately
      await get().fetchProfile();
    }
  },

  updateAccessToken: async (accessToken, refreshToken) => {
    await storage.saveToken(accessToken);
    set({ accessToken });
    if (refreshToken) {
      await storage.saveRefreshToken(refreshToken);
      set({ refreshToken });
    }
  },

  logout: async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    try {
      // Unregister this device's push token BEFORE clearing credentials — the request needs
      // the still-valid access token to authenticate, and without this the device would keep
      // receiving this account's push notifications (and, if it was a dispatcher, VoIP
      // ringing calls) indefinitely after logout. Every logout path funnels through this one
      // function (both the profile-menu logout mutation and the dispatcher console's direct
      // call), so fixing it here covers all of them. Best-effort: a failed/offline unregister
      // call must never block the user from actually logging out — if the access token is
      // already dead (the client.ts 401-interceptor's auto-logout path), this call 401s too,
      // which is exactly what `isLoggingOut` above stops from recursing.
      try {
        const token = getCurrentPushToken();
        if (token) {
          // Inline require, matching fetchProfile() below — avoids a circular import between
          // this store and the api client (which reads the store for auth headers).
          const { notificationsApi } = require('../api/notifications');
          await notificationsApi.unregisterDevice(token);
        }
      } catch (e) {
        console.log('[Paltuu] Push token unregister on logout skipped:', e);
      }

      await storage.clearAll();
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    } finally {
      isLoggingOut = false;
    }
  },

  fetchProfile: async () => {
    let { accessToken } = get();
    if (!accessToken) {
      accessToken = await storage.getToken();
      if (accessToken) set({ accessToken, isAuthenticated: true });
    }
    if (!accessToken) return;

    try {
      const client = require('../api/client').default;
      const { data } = await client.get('/profile');

      if (data) {
        const mappedUser: User = {
          id: String(data.user_id),
          email: data.email,
          name: data.name || data.email,
          role: data.role || 'regular user',
          profile_image_url: data.profile_image_url || null,
          phone_number: data.phone_number || null,
        };
        await storage.saveUser(mappedUser);
        set({ user: mappedUser });
      }
    } catch (e) {
      console.log('Profile fetch skipped or unavailable');
    }
  },

  hydrate: async () => {
    try {
      const user = await storage.getUser();
      const accessToken = await storage.getToken();
      const refreshToken = await storage.getRefreshToken();
      const hasSeenOnboarding = await storage.isOnboardingSeen();

      set({ hasSeenOnboarding });

      if (accessToken) {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
        await get().fetchProfile();
      }
    } catch (e) {
      console.error('Failed to hydrate auth store', e);
    } finally {
      set({ isLoading: false });
    }
  },
}));
