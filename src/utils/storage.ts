import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

// expo-secure-store is not supported on web; fall back to localStorage
const store = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const storage = {
  async saveToken(token: string) {
    if (token) await store.setItem(STORAGE_KEYS.ACCESS_TOKEN, String(token));
  },
  async getToken() {
    return store.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  async saveRefreshToken(token: string) {
    if (token) await store.setItem(STORAGE_KEYS.REFRESH_TOKEN, String(token));
  },
  async getRefreshToken() {
    return store.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  async saveUser(user: any) {
    if (!user) return;
    await store.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },
  async getUser() {
    const user = await store.getItem(STORAGE_KEYS.USER_DATA);
    return user ? JSON.parse(user) : null;
  },
  async clearAll() {
    await store.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await store.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await store.removeItem(STORAGE_KEYS.USER_DATA);
  },
};

