import { create } from 'zustand';
import { storage } from '../utils/storage';

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
    await storage.clearAll();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const { accessToken } = get();
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
        // If we have token but no user (or to refresh), fetch profile
        get().fetchProfile();
      }
    } catch (e) {
      console.error('Failed to hydrate auth store', e);
    } finally {
      set({ isLoading: false });
    }
  },
}));
