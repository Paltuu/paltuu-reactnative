import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

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

// Request interceptor: Attach access token
client.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
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
        const { refreshToken, updateAccessToken, logout } = useAuthStore.getState();
        
        if (!refreshToken) {
          logout();
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
        // Refresh failed (e.g. refresh token expired)
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
