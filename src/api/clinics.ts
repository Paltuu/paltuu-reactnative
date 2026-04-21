import client from './client';
import { Clinic, ClinicDetails } from '../types/models';

export const getClinics = async (): Promise<Clinic[]> => {
  const response = await client.get('/clinics');
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
