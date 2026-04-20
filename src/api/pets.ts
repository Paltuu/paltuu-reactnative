import client from './client';

export interface PetFilters {
  sex?: string;
  minAge?: string;
  maxAge?: string;
  city?: string;
  species?: string;
  breed?: string;
  page?: number;
  limit?: number;
}

export const petApi = {
  async getAdoptionPets(filters: PetFilters = {}) {
    const { data } = await client.get('/browse-pets', { params: filters });
    return data;
  },
  
  async getPetDetails(id: string) {
    const { data } = await client.get(`/browse-pets/${id}`);
    return data;
  }
};
