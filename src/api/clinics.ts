import client from './client';
import { Clinic, ClinicDetails } from '../types/models';

export interface ClinicQueryParams {
  page?: number;
  limit?: number;
  city?: string;
  category?: string;
  search?: string;
  verified?: boolean;
  partner?: boolean;
  sort?: 'rating' | 'distance';
  lat?: number;
  lng?: number;
}

export interface ClinicPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ClinicsResponse {
  data: Clinic[];
  pagination: ClinicPagination;
  cities: string[];
}

export const getClinics = async (params: ClinicQueryParams = {}): Promise<ClinicsResponse> => {
  const response = await client.get('/clinics', { params });
  return response.data;
};

export const getClinicDetails = async (id: string | number): Promise<ClinicDetails> => {
  const response = await client.get(`/clinics/${id}`);
  return response.data;
};

export const getClinicReviewStats = async (id: string | number) => {
  const response = await client.get(`/clinics/reviews-stats?clinic_id=${id}`);
  return response.data;
};

export const getVetDetails = async (id: string | number) => {
  const response = await client.get(`/vets/${id}`);
  return response.data;
};
