export const getShareUrl = (path: string) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://paltuu.pk/api';
  // Strip trailing '/api' or '/v1' or '/api/v1' to get base domain
  const baseUrl = apiUrl.replace(/\/v1$/, '').replace(/\/api$/, '');
  return `${baseUrl}/open?path=${encodeURIComponent(path)}`;
};
