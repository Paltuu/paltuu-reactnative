export const COLORS = {
  primary: '#A03048',
  primaryDark: '#70223f',
  primaryLight: '#ffd2e3',
  background: '#FFFFFF', 
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    100: '#F7FAFC',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E0',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
  error: '#E53E3E',
  success: '#38A169',
  // Darker variants for white text sitting directly on a solid fill (e.g. banners) —
  // `error`/`success` above are tuned as accent color on a light tint background
  // (see toastConfig.tsx) and don't have enough contrast against white on their own.
  errorStrong: '#B91C1C',
  successStrong: '#15803D',
};
