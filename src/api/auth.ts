import client from './client';

export const authApi = {
  async login(credentials: any) {
    const { data } = await client.post('/auth/mobile/login', credentials);
    return data;
  },
  
  async register(userData: any) {
    const { data } = await client.post('/auth/mobile/register', userData);
    return data;
  },
  
  async sendOtp(email: string) {
    const { data } = await client.post('/send-otp', { email });
    return data;
  },
  
  async logout(refreshToken: string) {
    const { data } = await client.post('/auth/mobile/logout', { refreshToken });
    return data;
  },
  
  async googleAuth(idToken: string) {
    const { data } = await client.post('/auth/mobile/google', { idToken });
    return data;
  }
};
