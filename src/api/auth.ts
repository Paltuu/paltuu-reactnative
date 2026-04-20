import client from './client';

export const authApi = {
  async login(credentials: any) {
    const { data } = await client.post('/v1/auth/login', credentials);
    return data;
  },
  
  async register(userData: any) {
    const { data } = await client.post('/v1/auth/register', userData);
    return data;
  },
  
  async sendOtp(email: string) {
    const { data } = await client.post('/v1/auth/otp/send', { email });
    return data;
  },
  
  async logout(refreshToken: string) {
    const { data } = await client.post('/v1/auth/logout', { refreshToken });
    return data;
  },
  
  async googleAuth(idToken: string) {
    const { data } = await client.post('/v1/auth/google', { idToken });
    return data;
  },

  async getProfile() {
    const { data } = await client.get('/v1/profile');
    return data;
  }
};
