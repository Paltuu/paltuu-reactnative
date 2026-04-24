import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export const useAuthActions = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutStore = useAuthStore((state) => state.logout);
  const refreshTokenInStore = useAuthStore((state) => state.refreshToken);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || "";

      if (accessToken) {
        setAuth(data.user || null, accessToken, refreshToken);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || "";

      if (accessToken) {
        setAuth(data.user || null, accessToken, refreshToken);
      }
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: authApi.googleAuth,
    onSuccess: (data) => {
      console.log('✅ Google Auth Success:', { user: data.user?.email });
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || "";

      if (accessToken) {
        setAuth(data.user || null, accessToken, refreshToken);
      }
    },
    onError: (error: any) => {
      console.error('❌ Google Auth Error:', error?.response?.data || error?.message || error);
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: authApi.sendOtp,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(refreshTokenInStore || ''),
    onSettled: () => {
      logoutStore();
    },
  });

  return {
    login: loginMutation,
    register: registerMutation,
    googleAuth: googleAuthMutation,
    sendOtp: sendOtpMutation,
    logout: logoutMutation,
  };
};
