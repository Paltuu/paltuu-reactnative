import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export const useAuthActions = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setAuthAsNewUser = useAuthStore((state) => state.setAuthAsNewUser);
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
        setAuthAsNewUser(data.user || null, accessToken, refreshToken);
      }
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
    sendOtp: sendOtpMutation,
    logout: logoutMutation,
  };
};
