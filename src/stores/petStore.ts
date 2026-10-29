import { create } from 'zustand';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { petsApi, PetFilters, Breed } from '../api/pets';
import client, { UPLOAD_TIMEOUT_MS } from '../api/client';

// Camera-roll photos (esp. HEIC/high-res JPEG) routinely exceed the API's
// request-size limit — resize + re-encode before upload, keeping total batch
// payload well under Vercel's 4.5 MB serverless function limit.
const compressImage = async (uri: string) => {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );
    return result.uri;
  } catch (err) {
    console.warn('[compressImage] compression failed, using original uri:', err);
    return uri;
  }
};

interface PetState {
  pets: any[];
  cities: any[];
  categories: any[];
  breeds: Breed[];
  isLoading: boolean;
  error: string | null;
  filters: PetFilters;
  myListings: any[];
  adoptionRequests: any[];
  myApplications: any[];

  // Actions
  fetchPets: (filters?: PetFilters) => Promise<void>;
  fetchMetadata: () => Promise<void>;
  fetchBreeds: () => Promise<void>;
  setFilters: (filters: Partial<PetFilters>) => void;
  resetFilters: () => void;
  fetchMyListings: () => Promise<void>;
  updatePetStatus: (id: number, status: string) => Promise<void>;
  deletePet: (id: number) => Promise<void>;
  fetchAdoptionRequests: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  updateApplicationStatus: (applicationId: number, type: 'adoption' | 'foster', status: 'approved' | 'rejected') => Promise<void>;

  // Selection
  selectedPet: any | null;
  setSelectedPet: (pet: any) => void;

  // Creation
  createPet: (petData: any, images: any[]) => Promise<any>;
  updatePet: (id: number, petData: any, images: any[]) => Promise<any>;
  createLostFoundPost: (postData: any, images: any[]) => Promise<any>;
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  cities: [],
  categories: [],
  breeds: [],
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
      const [cities, categories, breeds] = await Promise.all([
        petsApi.getCities(),
        petsApi.getCategories(),
        petsApi.getBreeds().catch((err) => {
          console.error('Failed to fetch breeds in metadata', err);
          return [];
        }),
      ]);

      set({
        cities: Array.isArray(cities) ? cities : (cities?.data || []),
        categories: Array.isArray(categories) ? categories : (categories?.data || []),
        breeds: Array.isArray(breeds) ? breeds : ((breeds as any)?.data || []),
      });
    } catch (error) {
      console.error('Failed to fetch pet metadata', error);
    }
  },

  fetchBreeds: async () => {
    try {
      const breeds = await petsApi.getBreeds();
      set({ breeds: Array.isArray(breeds) ? breeds : ((breeds as any)?.data || []) });
    } catch (error) {
      console.error('Failed to fetch breeds', error);
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
    let petId: number | undefined;
    try {
      const response = await petsApi.createPet(petData);
      petId = response?.pet_id || response?.data?.pet_id;

      if (!petId) throw new Error('Failed to create pet listing');

      if (images && images.length > 0) {
        const formData = new FormData();
        for (let index = 0; index < images.length; index++) {
          const image = images[index];
          const uri = await compressImage(image.uri);
          formData.append('files', {
            uri,
            type: 'image/jpeg',
            name: image.name || `pet_image_${index}.jpg`,
          } as any);
        }
        formData.append('pet_id', petId.toString());
        // Server emails the admin about the new listing once its photos are
        // saved — only when this flag is set, since edits reuse this endpoint.
        formData.append('notify_new_listing', 'true');

        await client.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: UPLOAD_TIMEOUT_MS,
        });
      }

      set({ isLoading: false });
      return response;
    } catch (error: any) {
      // The listing row already exists by the time photos upload. Delete it on
      // failure so the user's retry doesn't leave a duplicate in the approval
      // queue (same rollback the web create-listing page does).
      if (petId) {
        await petsApi.deletePet(petId).catch((rollbackError) =>
          console.error('[createPet] failed to roll back listing', petId, rollbackError)
        );
      }
      set({ error: error.message || 'Failed to create pet', isLoading: false });
      throw error;
    }
  },

  updatePet: async (id, petData, images) => {
    set({ isLoading: true, error: null });
    try {
      // Existing images carry an image_id; only images without one are new local files.
      const newLocalImages = (images || []).filter((img) => !img.image_id);
      let newImageUrls: string[] = [];

      if (newLocalImages.length > 0) {
        const formData = new FormData();
        for (let index = 0; index < newLocalImages.length; index++) {
          const image = newLocalImages[index];
          const uri = await compressImage(image.uri);
          formData.append('files', {
            uri,
            type: 'image/jpeg',
            name: image.name || `pet_image_${index}.jpg`,
          } as any);
        }
        const uploadRes = await client.post('/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: UPLOAD_TIMEOUT_MS,
        });
        newImageUrls = uploadRes.data?.urls || [];
      }

      let urlIndex = 0;
      const finalImages = (images || []).map((img) =>
        img.image_id
          ? { image_id: img.image_id, image_url: img.image_url }
          : { image_url: newImageUrls[urlIndex++] }
      );

      const response = await petsApi.updatePet(id, { ...petData, images: finalImages });
      set({ isLoading: false });
      return response;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update pet', isLoading: false });
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
        for (let index = 0; index < images.length; index++) {
          const image = images[index];
          const uri = await compressImage(image.uri);
          formData.append('files', {
            uri,
            type: 'image/jpeg',
            name: image.name || `post_image_${index}.jpg`,
          } as any);
        }
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
    const previousListings = get().myListings;
    set({ myListings: previousListings.filter(p => p.pet_id !== id) });
    try {
      await petsApi.deletePet(id);
    } catch (error: any) {
      set({ myListings: previousListings, error: error.message || 'Failed to delete listing' });
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

  updateApplicationStatus: async (applicationId, type, status) => {
    try {
      await petsApi.updateApplicationStatus({ application_id: applicationId, type, status });
      // Update local state
      const adoptionRequests = get().adoptionRequests.map(r => 
        ((type === 'adoption' && r.adoption_id === applicationId) || 
         (type === 'foster' && r.foster_id === applicationId)) ? { ...r, status } : r
      );
      set({ adoptionRequests });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update application status' });
      throw error;
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
