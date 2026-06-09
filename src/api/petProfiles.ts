import client from './client';
import { SocialPost } from './social';

export interface PetProfile {
  pet_profile_id: number;
  owner_id: number;
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  date_of_birth: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_listed_for_adoption: boolean;
  adoption_listing_id: number | null;
  created_at: string;
  updated_at: string;
  age?: string | null; // calculated dynamically on backend
}

export interface PetProfilePhoto {
  photo_id: number;
  pet_profile_id: number;
  photo_url: string;
  caption: string | null;
  ordering: number;
  created_at: string;
}

export const petProfilesApi = {
  async createPetProfile(payload: {
    name: string;
    species: string;
    breed?: string | null;
    gender?: string;
    date_of_birth?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
  }) {
    const { data } = await client.post('/pet-profiles', payload);
    return data as PetProfile;
  },

  async getPetProfile(petId: number | string) {
    const { data } = await client.get(`/pet-profiles/${petId}`);
    return data as PetProfile;
  },

  async updatePetProfile(
    petId: number | string,
    payload: {
      name?: string;
      species?: string;
      breed?: string | null;
      gender?: string;
      date_of_birth?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
    }
  ) {
    const { data } = await client.patch(`/pet-profiles/${petId}`, payload);
    return data as PetProfile;
  },

  async deletePetProfile(petId: number | string) {
    const { data } = await client.delete(`/pet-profiles/${petId}`);
    return data as { success: boolean };
  },

  async getUserPetProfiles(userId: number | string) {
    const { data } = await client.get(`/users/${userId}/pet-profiles`);
    return data as { pet_profiles: PetProfile[] };
  },

  async getPetPhotos(petId: number | string) {
    const { data } = await client.get(`/pet-profiles/${petId}/photos`);
    return data as { photos: PetProfilePhoto[] };
  },

  async uploadPetPhoto(petId: number | string, photoUrl: string, caption?: string) {
    const { data } = await client.post(`/pet-profiles/${petId}/photos`, {
      photo_url: photoUrl,
      caption: caption || null,
    });
    return data as PetProfilePhoto;
  },

  async deletePetPhoto(petId: number | string, photoId: number | string) {
    const { data } = await client.delete(`/pet-profiles/${petId}/photos/${photoId}`);
    return data as { success: boolean };
  },

  async setPetAvatar(petId: number | string, photoId: number | string) {
    const { data } = await client.patch(`/pet-profiles/${petId}/avatar`, { photo_id: photoId });
    return data as PetProfile;
  },

  async getTaggedPosts(petId: number | string, cursor?: string | null, limit: number = 20) {
    const url = `/pet-profiles/${petId}/tagged-posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const { data } = await client.get(url);
    return data as { posts: SocialPost[]; next_cursor: string | null; has_more: boolean };
  },

  async convertPetToAdoption(petId: number | string) {
    const { data } = await client.post(`/pet-profiles/${petId}/list-for-adoption`);
    return data as { success: boolean; pet_id: number };
  },
};
