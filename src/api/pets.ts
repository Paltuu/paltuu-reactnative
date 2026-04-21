import client from './client';

export interface PetFilters {
  sex?: string;
  minAge?: string;
  maxAge?: string;
  city?: string;
  species?: string;
  breed?: string;
  vaccinated?: boolean;
  neutered?: boolean;
  page?: number;
  limit?: number;
}

export const petApi = {
  // Used on Browse Pets screen
  async getAdoptionPets(filters: PetFilters = {}) {
    const { data } = await client.get('/pets', { params: filters });
    return data;
  },

  // Used on Dashboard
  async getPets(params?: { city?: number; type?: string; breed?: string; page?: number }) {
    const { data } = await client.get('/pets', { params });
    return data;
  },

  async getPetDetails(id: number) {
    const { data } = await client.get(`/pets/${id}`);
    return data;
  },

  async createPet(petData: any) {
    const { data } = await client.post('/pets', petData);
    return data;
  },

  async applyForAdoption(petId: number, formData: any) {
    const { data } = await client.post('/applications/adoption', { petId, ...formData });
    return data;
  },

  async getCities() {
    const { data } = await client.get('/cities');
    return data;
  },

  async getCategories() {
    const { data } = await client.get('../pet-categories');
    return data;
  },

  async getProfile(userId: string) {
    // Reverting to the primary profile endpoint used by the web app (relative to v1)
    const { data } = await client.get(`../my-profile/${userId}`);
    return data;
  }
};

// Exporting petsApi as an alias for backward compatibility with the Dashboard
export const petsApi = petApi;
