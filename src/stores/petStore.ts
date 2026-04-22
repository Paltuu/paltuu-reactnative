import { create } from 'zustand';
import { petsApi, PetFilters } from '../api/pets';
import client from '../api/client';

interface PetState {
  pets: any[];
  cities: any[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  filters: PetFilters;
  myListings: any[];
  adoptionRequests: any[];
  myApplications: any[];

  // Actions
  fetchPets: (filters?: PetFilters) => Promise<void>;
  fetchMetadata: () => Promise<void>;
  setFilters: (filters: Partial<PetFilters>) => void;
  resetFilters: () => void;
  fetchMyListings: () => Promise<void>;
  updatePetStatus: (id: number, status: string) => Promise<void>;
  deletePet: (id: number) => Promise<void>;
  fetchAdoptionRequests: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;

  // Selection
  selectedPet: any | null;
  setSelectedPet: (pet: any) => void;

  // Creation
  createPet: (petData: any, images: any[]) => Promise<any>;
  createLostFoundPost: (postData: any, images: any[]) => Promise<any>;
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  cities: [],
  categories: [],
  myListings: [],
  adoptionRequests: [],
  myApplications: [],
  isLoading: false,
  error: null,
  filters: {
    limit: 20,
    page: 1,
  },
  selectedPet: null,

  fetchPets: async (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ isLoading: true, error: null });

    try {
      const response = await petsApi.getPets(filters);

      const findArray = (obj: any): any[] => {
        if (Array.isArray(obj)) return obj;
        if (obj && typeof obj === 'object') {
          for (const key in obj) {
            if (Array.isArray(obj[key])) return obj[key];
            const nested = findArray(obj[key]);
            if (nested.length > 0) return nested;
          }
        }
        return [];
      };

      const pets = findArray(response);
      set({ pets, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pets', isLoading: false });
    }
  },

  fetchMetadata: async () => {
    try {
      const [cities, categories] = await Promise.all([
        petsApi.getCities(),
        petsApi.getCategories()
      ]);

      set({
        cities: Array.isArray(cities) ? cities : (cities?.data || []),
        categories: Array.isArray(categories) ? categories : (categories?.data || [])
      });
    } catch (error) {
      console.error('Failed to fetch pet metadata', error);
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  resetFilters: () => {
    set({
      filters: { limit: 20, page: 1 }
    });
  },

  setSelectedPet: (pet) => {
    set({ selectedPet: pet });
  },

  createPet: async (petData, images) => {
    set({ isLoading: true, error: null });
    try {
      const response = await petsApi.createPet(petData);
      const petId = response?.pet_id || response?.data?.pet_id;

      if (!petId) throw new Error('Failed to create pet listing');

      if (images && images.length > 0) {
        const formData = new FormData();
        images.forEach((image, index) => {
          formData.append('files', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `pet_image_${index}.jpg`,
          } as any);
        });
        formData.append('pet_id', petId.toString());

        // We need an upload endpoint for images in the mobile API
        // For now, using a placeholder logic if client doesn't have it
        await client.post('../upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      set({ isLoading: false });
      return response;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create pet', isLoading: false });
      throw error;
    }
  },

  createLostFoundPost: async (postData, images) => {
    set({ isLoading: true, error: null });
    try {
      const response = await petsApi.createLostFoundPost(postData);
      const postId = response?.post_id || response?.data?.post_id;

      if (!postId) throw new Error('Failed to create lost & found post');

      if (images && images.length > 0) {
        const formData = new FormData();
        images.forEach((image, index) => {
          formData.append('files', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `post_image_${index}.jpg`,
          } as any);
        });
        formData.append('post_id', postId.toString());

        await petsApi.uploadLostFoundImages(postId, formData);
      }

      set({ isLoading: false });
      return response;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create lost & found post', isLoading: false });
      throw error;
    }
  },

  fetchMyListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await petsApi.getMyListings();
      const list = Array.isArray(response) ? response : (response?.listings || response?.data?.listings || []);
      set({ myListings: list, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch my listings', isLoading: false });
    }
  },

  updatePetStatus: async (id, status) => {
    try {
      await petsApi.updatePetStatus(id, status);
      const myListings = get().myListings.map(p => p.pet_id === id ? { ...p, adoption_status: status } : p);
      set({ myListings });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update status' });
      throw error;
    }
  },

  deletePet: async (id) => {
    try {
      await petsApi.deletePet(id);
      const myListings = get().myListings.filter(p => p.pet_id !== id);
      set({ myListings });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete listing' });
      throw error;
    }
  },

  fetchAdoptionRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await petsApi.getMyAdoptionRequests();
      const list = Array.isArray(response) ? response : (response?.applications || response?.data?.applications || []);
      set({ adoptionRequests: list, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch adoption requests', isLoading: false });
    }
  },

  fetchMyApplications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await petsApi.getMyApplications();
      const list = Array.isArray(response) ? response : (response?.applications || response?.data?.applications || []);
      set({ myApplications: list, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch my applications', isLoading: false });
    }
  },
}));
