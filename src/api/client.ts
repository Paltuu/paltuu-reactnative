import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { storage } from '../utils/storage';

const client = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Logger
client.interceptors.request.use((config) => {
  if (__DEV__) {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} (auth: ${!!config.headers.Authorization})`);
  }
  return config;
});

// Request interceptor: Attach access token (fall back to SecureStore while hydrating)
client.interceptors.request.use(
  async (config) => {
    let { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      accessToken = await storage.getToken();
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Logger
client.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.log(`[API Error] ${error.response?.status || 'Network'} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.data?.error || error.message);
    }
    return Promise.reject(error);
  }
);


// Response interceptor: Handle token refresh on 401
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { isLoading, updateAccessToken, logout } = useAuthStore.getState();
        let { refreshToken } = useAuthStore.getState();

        // Recover refresh token from SecureStore if the in-memory store isn't ready yet
        if (!refreshToken) {
          refreshToken = await storage.getRefreshToken();
          if (refreshToken) {
            useAuthStore.setState({ refreshToken });
          }
        }

        if (!refreshToken) {
          // During startup hydration a missing in-memory token doesn't mean the
          // session is invalid — don't wipe SecureStore before hydrate() runs.
          if (!isLoading) {
            await logout();
          }
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        
        // Update store and storage with new access and rotated refresh tokens
        await updateAccessToken(newAccessToken, newRefreshToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        const { isLoading, logout } = useAuthStore.getState();
        // Only clear persisted session after hydration confirms tokens are unusable
        if (!isLoading) {
          await logout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
