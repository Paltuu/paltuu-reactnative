import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { storage } from '../utils/storage';

const client = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL}/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Single-flight refresh — rotation invalidates the old token, so concurrent 401 handlers must share one refresh. */
let refreshInFlight: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function syncTokensFromStorage(): Promise<void> {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (accessToken && refreshToken) return;

  const storedAccess = accessToken ?? (await storage.getToken());
  const storedRefresh = refreshToken ?? (await storage.getRefreshToken());

  if (storedAccess || storedRefresh) {
    useAuthStore.setState({
      ...(storedAccess ? { accessToken: storedAccess, isAuthenticated: true } : {}),
      ...(storedRefresh ? { refreshToken: storedRefresh } : {}),
    });
  }
}

async function getRefreshToken(): Promise<string | null> {
  await syncTokensFromStorage();
  return useAuthStore.getState().refreshToken ?? storage.getRefreshToken();
}

async function performTokenRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      const err = new Error('No refresh token') as Error & { isAuthError?: boolean };
      err.isAuthError = true;
      throw err;
    }

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL}/v1/auth/refresh`,
      { refreshToken },
      { timeout: 10000 }
    );

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
    await useAuthStore.getState().updateAccessToken(newAccessToken, newRefreshToken);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function isAuthFailure(error: unknown): boolean {
  if (error && typeof error === 'object' && (error as { isAuthError?: boolean }).isAuthError) {
    return true;
  }
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    return status === 400 || status === 401 || status === 403;
  }
  return false;
}

function shouldAttemptRefresh(config: { url?: string } | undefined): boolean {
  const url = config?.url ?? '';
  return !url.includes('/auth/refresh') && !url.includes('/auth/login');
}

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
    await syncTokensFromStorage();
    const { accessToken } = useAuthStore.getState();
    const token = accessToken ?? (await storage.getToken());
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    if (error.response?.status !== 401 || originalRequest._retry || !shouldAttemptRefresh(originalRequest)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { accessToken } = await performTokenRefresh();

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      // Only wipe the session when refresh genuinely failed — not on network blips.
      // (Deliberately not gated on isLoading: a token that's already expired at
      // cold-start fails refresh during hydrate()'s own fetchProfile() call, and
      // skipping logout there left isAuthenticated stuck true with a dead token.)
      if (isAuthFailure(refreshError)) {
        await useAuthStore.getState().logout();
      }
      return Promise.reject(refreshError);
    }
  }
);

export default client;
