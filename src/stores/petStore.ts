import { create } from 'zustand';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { petsApi, PetFilters, Breed } from '../api/pets';
import client, { UPLOAD_TIMEOUT_MS } from '../api/client';
import { requestId, requestStatus } from '../utils/adoption';

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
  // Last load error per adoption list (null once a load succeeds), so each
  // screen can show its own retry state instead of an empty list.
  myListingsError: unknown;
  adoptionRequestsError: unknown;
  myApplicationsError: unknown;

  // Actions
  fetchPets: (filters?: PetFilters) => Promise<void>;
  fetchMetadata: () => Promise<void>;
  fetchBreeds: () => Promise<void>;
  setFilters: (filters: Partial<PetFilters>) => void;
  resetFilters: () => void;
  /** Resolves true when the list loaded. */
  fetchMyListings: () => Promise<boolean>;
  updatePetStatus: (id: number, status: string) => Promise<void>;
  setListingAvailability: (id: number, available: boolean) => Promise<void>;
  deletePet: (id: number) => Promise<void>;
  /** Resolves true when the list loaded. */
  fetchAdoptionRequests: () => Promise<boolean>;
  /** Resolves true when the list loaded. */
  fetchMyApplications: () => Promise<boolean>;
  updateApplicationStatus: (applicationId: number, type: 'adoption' | 'foster', status: 'approved' | 'rejected') => Promise<void>;
  withdrawApplication: (applicationId: number, type: 'adoption' | 'foster') => Promise<void>;

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
  myListingsError: null,
  adoptionRequestsError: null,
  myApplicationsError: null,
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

  // The three adoption-list loads below don't touch the shared `isLoading`:
  // they're refreshed in the background (on focus, and by the adoption
  // prompt), which would otherwise flash spinners on unrelated screens.
  fetchMyListings: async () => {
    try {
      const response = await petsApi.getMyListings();
      const list = Array.isArray(response) ? response : (response?.listings || response?.data?.listings || []);
      set({ myListings: list, myListingsError: null });
      return true;
    } catch (error: any) {
      set({ myListingsError: error, error: error.message || 'Failed to fetch my listings' });
      return false;
    }
  },

  updatePetStatus: async (id, status) => {
    try {
      await petsApi.updatePetStatus(id, status);
      const myListings = get().myListings.map((p) =>
        p.pet_id === id
          ? {
              ...p,
              adoption_status: status,
              // The server clears a pending "still available?" check on any status change.
              ...(p.adoption_status !== status ? { availability_check_sent_at: null } : {}),
            }
          : p
      );
      set({ myListings });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update status' });
      throw error;
    }
  },

  setListingAvailability: async (id, available) => {
    const row = await petsApi.setPetAvailability(id, available);
    const patch = {
      adoption_status: available ? 'available' : 'adopted',
      availability_check_sent_at: null,
      ...(row && typeof row === 'object' ? row : {}),
    };
    set({ myListings: get().myListings.map((p) => (p.pet_id === id ? { ...p, ...patch } : p)) });
  },

  deletePet: async (id) => {
    const previousListings = get().myListings;
    set({ myListings: previousListings.filter(p => p.pet_id !== id) });
    try {
      await petsApi.deletePet(id);
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to delete listing';
      set({ myListings: previousListings, error: errMsg });
      throw error;
    }
  },

  fetchAdoptionRequests: async () => {
    try {
      const response = await petsApi.getMyAdoptionRequests();
      const list = Array.isArray(response) ? response : (response?.applications || response?.data?.applications || []);
      set({ adoptionRequests: list, adoptionRequestsError: null });
      return true;
    } catch (error: any) {
      set({ adoptionRequestsError: error, error: error.message || 'Failed to fetch adoption requests' });
      return false;
    }
  },

  updateApplicationStatus: async (applicationId, type, status) => {
    try {
      await petsApi.updateApplicationStatus({ application_id: applicationId, type, status });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update application status' });
      throw error;
    }
    const target = get().adoptionRequests.find((r) => requestId(r) === applicationId);
    const petId = target?.pet_id;
    const wasPending = !!target && requestStatus(target) === 'pending';
    set({
      // Mirrors the server: approving one application declines every other
      // one for the same pet that isn't declined already.
      adoptionRequests: get().adoptionRequests.map((r) => {
        if (r === target) return { ...r, status };
        if (status === 'approved' && petId != null && r.pet_id === petId && requestStatus(r) !== 'rejected') {
          return { ...r, status: 'rejected' };
        }
        return r;
      }),
      // ...and marks the pet adopted.
      myListings: get().myListings.map((p) => {
        if (petId == null || p.pet_id !== petId) return p;
        if (status === 'approved') {
          return { ...p, adoption_status: 'adopted', pending_application_count: 0 };
        }
        return wasPending && p.pending_application_count > 0
          ? { ...p, pending_application_count: p.pending_application_count - 1 }
          : p;
      }),
    });
  },

  fetchMyApplications: async () => {
    try {
      const response = await petsApi.getMyApplications();
      const list = Array.isArray(response) ? response : (response?.applications || response?.data?.applications || []);
      set({ myApplications: list, myApplicationsError: null });
      return true;
    } catch (error: any) {
      set({ myApplicationsError: error, error: error.message || 'Failed to fetch my applications' });
      return false;
    }
  },

  withdrawApplication: async (applicationId, type) => {
    await petsApi.withdrawApplication(applicationId, type);
    set({
      myApplications: get().myApplications.filter(
        (a) => !(a.application_id === applicationId && (a.application_type || 'adoption') === type)
      ),
    });
  },
}));
