import { useAuthStore } from '../stores/authStore';

/** True once auth hydration finished and the user has a persisted session. */
export function useAuthReady(): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  return isAuthenticated && !isLoading;
}
