import client from './client';

export const authApi = {
  async login(credentials: any) {
    const { data } = await client.post('/auth/login', credentials);
    return data;
  },
  
  async register(userData: any) {
    const { data } = await client.post('/auth/register', userData);
    return data;
  },
  
  async sendOtp(email: string) {
    const { data } = await client.post('../auth/mobile/otp/send', { email });
    return data;
  },
  
  async logout(refreshToken: string) {
    const { data } = await client.post('/auth/logout', { refreshToken });
    return data;
  },

  async getProfile() {
    // This is not in v1 yet, using relative path
    const { data } = await client.get('../my-profile');
    return data;
  }
};
