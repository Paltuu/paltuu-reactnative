import { create } from 'zustand';
import { storage } from '../utils/storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profile_image_url?: string;
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

// Simple base64 decoder to parse JWT without external libs
const decodeJWT = (token: string) => {
  try {
    const base64Payload = token.split('.')[1];
    // Polyfill for atob in React Native
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

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
      // Dynamic import to avoid circular dependency
      const { authApi } = require('../api/auth');
      const userData = await authApi.getProfile();
      
      const mappedUser: User = {
        id: String(userData.id || userData.user_id),
        email: userData.email,
        name: userData.name || userData.email,
        role: userData.role || "regular user",
        profile_image_url: userData.profile_image_url || null,
      };
      
      await storage.saveUser(mappedUser);
      set({ user: mappedUser });
    } catch (e) {
      console.error('Failed to fetch user profile', e);
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
