import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  FEED_BANNER_DISMISSED: 'feed_banner_dismissed',
  ONBOARDING_SEEN: 'onboarding_seen',
  WELCOME_MASCOT_SEEN: 'welcome_mascot_seen',
  PET_HUB_MASCOT_SEEN: 'pet_hub_mascot_seen',
  PROFILE_INTRO_MASCOT_SEEN: 'profile_intro_mascot_seen',
  LAST_SEEN_OTA_UPDATE_ID: 'last_seen_ota_update_id',
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
  async dismissFeedBanner() {
    await store.setItem(STORAGE_KEYS.FEED_BANNER_DISMISSED, '1');
  },
  async isFeedBannerDismissed(): Promise<boolean> {
    const val = await store.getItem(STORAGE_KEYS.FEED_BANNER_DISMISSED);
    return val === '1';
  },
  async markOnboardingSeen() {
    await store.setItem(STORAGE_KEYS.ONBOARDING_SEEN, '1');
  },
  async isOnboardingSeen(): Promise<boolean> {
    const val = await store.getItem(STORAGE_KEYS.ONBOARDING_SEEN);
    return val === '1';
  },
  async markWelcomeMascotSeen() {
    await store.setItem(STORAGE_KEYS.WELCOME_MASCOT_SEEN, '1');
  },
  async isWelcomeMascotSeen(): Promise<boolean> {
    const val = await store.getItem(STORAGE_KEYS.WELCOME_MASCOT_SEEN);
    return val === '1';
  },
  async markPetHubMascotSeen() {
    await store.setItem(STORAGE_KEYS.PET_HUB_MASCOT_SEEN, '1');
  },
  async isPetHubMascotSeen(): Promise<boolean> {
    const val = await store.getItem(STORAGE_KEYS.PET_HUB_MASCOT_SEEN);
    return val === '1';
  },
  async markProfileIntroMascotSeen() {
    await store.setItem(STORAGE_KEYS.PROFILE_INTRO_MASCOT_SEEN, '1');
  },
  async isProfileIntroMascotSeen(): Promise<boolean> {
    const val = await store.getItem(STORAGE_KEYS.PROFILE_INTRO_MASCOT_SEEN);
    return val === '1';
  },
  async getLastSeenOtaUpdateId(): Promise<string | null> {
    return store.getItem(STORAGE_KEYS.LAST_SEEN_OTA_UPDATE_ID);
  },
  async setLastSeenOtaUpdateId(id: string) {
    await store.setItem(STORAGE_KEYS.LAST_SEEN_OTA_UPDATE_ID, id);
  },
};

