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
  async getPets(params: PetFilters = {}) {
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

  async applyForAdoption(formData: any) {
    const { data } = await client.post('/applications/adoption', formData);
    return data;
  },

  async createLostFoundPost(postData: any) {
    const { data } = await client.post('/lost-and-found', postData);
    return data;
  },

  async uploadLostFoundImages(postId: number, formData: FormData) {
    const { data } = await client.post('/lost-and-found/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'Params': `post_id=${postId}` },
    });
    return data;
  },

  async getCities() {
    const { data } = await client.get('/cities');
    return data;
  },

  async getCategories() {
    const { data } = await client.get('/pet-categories');
    return data;
  },

  async getMyListings() {
    const { data } = await client.get('/profile/listings');
    return data;
  },

  async updatePetStatus(id: number, status: string) {
    const { data } = await client.patch(`/pets/${id}/status`, { status });
    return data;
  },

  async deletePet(id: number) {
    const { data } = await client.delete(`/pets/${id}`);
    return data;
  },

  async getMyAdoptionRequests() {
    const { data } = await client.get('/applications/my-pets');
    return data;
  },

  async getMyApplications() {
    const { data } = await client.get('/applications/my');
    return data;
  },

  async updateApplicationStatus(params: { application_id: number; type: 'adoption' | 'foster'; status: 'approved' | 'rejected' }) {
    const { data } = await client.put('/applications/status', params);
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
