import client from './client';

export const petsApi = {
  async getPets(params?: { city?: number; type?: string; breed?: string; page?: number }) {
    const { data } = await client.get('/v1/pets', { params });
    return data;
  },

  async getPetDetails(id: number) {
    const { data } = await client.get(`/v1/pets/${id}`);
    return data;
  },

  async createPet(petData: any) {
    const { data } = await client.post('/v1/pets', petData);
    return data;
  },

  async applyForAdoption(petId: number, formData: any) {
    const { data } = await client.post('/v1/applications/adoption', { petId, ...formData });
    return data;
  }
};
