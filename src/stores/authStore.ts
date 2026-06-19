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
  setAuth: (user: User | null, accessToken: string, refreshToken: string) => Promise<void>;
  updateAccessToken: (accessToken: string) => Promise<void>;
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

  updateAccessToken: async (accessToken) => {
    await storage.saveToken(accessToken);
    set({ accessToken });
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

      if (accessToken && refreshToken) {
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
