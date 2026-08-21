import client from './client';

export interface ExpressVetDispatchRequest {
  request_id: string;
  client_user_id: number;
  client_name: string;
  client_photo_url: string | null;
  category: string;
  species: string;
  sub_service: string | null;
  city_id: number;
  status: 'pending_dispatch' | 'claimed' | 'assigned' | 'completed' | 'cancelled' | 'expired';
  questionnaire_version: string;
  questionnaire_answers: Record<string, any>;
  address_line: string;
  address_landmark: string | null;
  latitude: string | null;
  longitude: string | null;
  contact_phone: string;
  starting_price_pkr: number;
  final_price_pkr: number | null;
  assigned_provider_id: string | null;
  provider_name?: string | null;
  provider_photo_url?: string | null;
  claimed_by_dispatcher_id: number | null;
  assigned_by_dispatcher_id?: number | null;
  claimed_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ExpressVetProvider {
  provider_id: string;
  name: string;
  photo_url: string | null;
  years_experience: number | null;
  qualifications: string | null;
  categories: string[];
  phone_number: string | null;
  is_active: boolean;
  rating: string | null;
  total_reviews: number;
  linked_user_id: number | null;
}

export interface NewProviderInput {
  name: string;
  photo_url?: string | null;
  years_experience?: number | null;
  qualifications?: string | null;
  categories: string[];
  phone_number?: string | null;
}

export interface AssignPayload {
  final_price_pkr: number;
  provider_id?: string | number;
  new_provider?: NewProviderInput;
  self_assign?: boolean;
  force?: boolean;
}

export interface AssignResult {
  request?: ExpressVetDispatchRequest;
  provider?: ExpressVetProvider;
  needs_confirmation?: boolean;
  warning?: string;
}

export const expressVetDispatchApi = {
  async getDuty(): Promise<{ status: { dispatcher_id: number; is_on_duty: boolean } }> {
    const { data } = await client.get('/express-vet/dispatcher/duty');
    return data;
  },

  async setDuty(isOnDuty: boolean): Promise<{ status: { dispatcher_id: number; is_on_duty: boolean } }> {
    const { data } = await client.post('/express-vet/dispatcher/duty', { is_on_duty: isOnDuty });
    return data;
  },

  async getInbox(): Promise<{ data: ExpressVetDispatchRequest[] }> {
    const { data } = await client.get('/express-vet/dispatcher/inbox');
    return data;
  },

  async getJobs(status?: 'assigned' | 'completed'): Promise<{ data: ExpressVetDispatchRequest[] }> {
    const { data } = await client.get('/express-vet/dispatcher/jobs', { params: status ? { status } : {} });
    return data;
  },

  async getStats(): Promise<{ in_progress: number; completed_today: number }> {
    const { data } = await client.get('/express-vet/dispatcher/stats');
    return data;
  },

  async getRequestDetail(id: string | number): Promise<{ request: ExpressVetDispatchRequest }> {
    const { data } = await client.get(`/express-vet/dispatcher/requests/${id}`);
    return data;
  },

  async claim(id: string | number): Promise<{ request: ExpressVetDispatchRequest }> {
    const { data } = await client.post(`/express-vet/dispatcher/requests/${id}/claim`);
    return data;
  },

  async release(id: string | number, reason?: string): Promise<{ request: ExpressVetDispatchRequest }> {
    const { data } = await client.post(`/express-vet/dispatcher/requests/${id}/release`, { reason });
    return data;
  },

  async assign(id: string | number, payload: AssignPayload): Promise<AssignResult> {
    const { data } = await client.post(`/express-vet/dispatcher/requests/${id}/assign`, payload);
    return data;
  },

  async complete(id: string | number): Promise<{ request: ExpressVetDispatchRequest }> {
    const { data } = await client.post(`/express-vet/dispatcher/requests/${id}/complete`);
    return data;
  },

  async searchProviders(params: { search?: string; category?: string }): Promise<{ data: ExpressVetProvider[] }> {
    const { data } = await client.get('/express-vet/dispatcher/providers', { params });
    return data;
  },

  async createProvider(input: NewProviderInput): Promise<{ provider: ExpressVetProvider }> {
    const { data } = await client.post('/express-vet/dispatcher/providers', input);
    return data;
  },

  async getProvider(id: string | number): Promise<{ provider: ExpressVetProvider; reviews: any[] }> {
    const { data } = await client.get(`/express-vet/dispatcher/providers/${id}`);
    return data;
  },

  async updateProvider(id: string | number, patch: Partial<NewProviderInput & { is_active: boolean }>): Promise<{ provider: ExpressVetProvider }> {
    const { data } = await client.patch(`/express-vet/dispatcher/providers/${id}`, patch);
    return data;
  },

  // Ringing-call push token — raw APNs VoIP token (iOS) or raw FCM token (Android), never
  // an Expo push token. See src/services/callkeep.ts for why this is a separate channel
  // from the normal notification token registered by NotificationContext.
  async registerPushToken(payload: { platform: 'ios' | 'android'; voip_token?: string; fcm_token?: string }): Promise<void> {
    await client.post('/express-vet/dispatcher/push-token', payload);
  },
};
