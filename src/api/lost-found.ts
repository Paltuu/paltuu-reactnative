import client from './client';

export const lostFoundApi = {
  async getPosts(params?: { city?: number; type?: string }) {
    const { data } = await client.get('/v1/lost-and-found', { params });
    return data;
  },

  async createPost(postData: any) {
    const { data } = await client.post('/v1/lost-and-found', postData);
    return data;
  },

  async resolvePost(id: number) {
    const { data } = await client.patch(`/v1/lost-and-found/${id}`, { status: 'resolved' });
    return data;
  }
};
