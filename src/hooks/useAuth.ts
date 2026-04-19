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
      // Assuming backend return { user, accessToken, refreshToken }
      setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
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
