import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

export const storage = {
  async saveToken(token: string) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
  },
  async getToken() {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  },
  async saveRefreshToken(token: string) {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
  },
  async getRefreshToken() {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },
  async saveUser(user: any) {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },
  async getUser() {
    const user = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    return user ? JSON.parse(user) : null;
  },
  async clearAll() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
  },
};
