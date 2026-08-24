import client from './client';

export interface ExpressVetCategoryConfig {
  key: string;
  label: string;
  species: string[];
}

export interface ExpressVetRateCard {
  category: string;
  species: string;
  sub_service: string | null;
  city_id: number;
  starting_price_pkr: number;
}

export interface ExpressVetQuestionnaireField {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'boolean' | 'photo';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface ExpressVetConfig {
  enabled_cities: { city_ids: number[] };
  request_expiry_hours: Record<string, number>;
  categories: ExpressVetCategoryConfig[];
  rate_cards: ExpressVetRateCard[];
  questionnaires: {
    version: string | null;
    schema: Record<string, { fields: ExpressVetQuestionnaireField[] } | Record<string, { fields: ExpressVetQuestionnaireField[] }>>;
  };
}

export interface ExpressVetRequest {
  request_id: string;
  client_user_id: number;
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
  maps_link: string | null;
  contact_phone: string;
  starting_price_pkr: number;
  final_price_pkr: number | null;
  scheduled_at: string | null;
  dispatcher_notes: string | null;
  assigned_provider_id: string | null;
  created_at: string;
  provider_name?: string | null;
  provider_photo_url?: string | null;
  provider_rating?: string | null;
  provider_years_experience?: number | null;
  provider_qualifications?: string | null;
  provider_phone_number?: string | null;
  review_rating?: number | null;
  review_content?: string | null;
}

export interface CreateExpressVetRequestPayload {
  category: string;
  species: string;
  sub_service?: string | null;
  city_id: number;
  questionnaire_answers: Record<string, any>;
  address_line: string;
  address_landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_link?: string | null;
  contact_phone: string;
}

// Thrown by createRequest when the backend rejects with 409 — the client already has an
// active (or completed-but-unreviewed) booking. Carries the existing request's id so the
// caller can redirect straight to it instead of showing a generic error.
export class ExpressVetActiveBookingError extends Error {
  existingRequestId: string;
  constructor(message: string, existingRequestId: string) {
    super(message);
    this.existingRequestId = existingRequestId;
  }
}

// Must match EXPRESS_VET_ADDON_REASON_TAGS in lib/expressVet/catalog.ts on the backend.
export const EXPRESS_VET_ADDON_REASON_TAGS = [
  'Additional Treatment',
  'Medication/Prescription',
  'Diagnostic Test/Lab Work',
  'Extra Grooming Service',
  'Other',
];

export interface SubmitReviewPayload {
  rating: number;
  was_on_time?: boolean | null;
  price_as_agreed?: boolean | null;
  review_content?: string | null;
  addon_reason_tags?: string[];
  addon_total_pkr?: number | null;
}

export interface ExpressVetReview {
  review_id: string;
  request_id: string;
  provider_id: string;
  client_user_id: number;
  rating: number;
  structured_answers: { was_on_time: boolean | null; price_as_agreed: boolean | null } | null;
  review_content: string | null;
  addon_reason_tags: string[];
  addon_total_pkr: number | null;
  created_at: string;
}

export const expressVetApi = {
  async getConfig(): Promise<ExpressVetConfig> {
    const { data } = await client.get('/express-vet/config');
    return data;
  },

  async createRequest(payload: CreateExpressVetRequestPayload): Promise<{ request: ExpressVetRequest }> {
    try {
      const { data } = await client.post('/express-vet/requests', payload);
      return data;
    } catch (err: any) {
      const existingId = err?.response?.data?.existing_request_id;
      if (err?.response?.status === 409 && existingId) {
        throw new ExpressVetActiveBookingError(err.response.data.error, String(existingId));
      }
      throw err;
    }
  },

  async getMyRequests(page = 1): Promise<{ data: ExpressVetRequest[]; page: number; limit: number }> {
    const { data } = await client.get('/express-vet/requests/my', { params: { page } });
    return data;
  },

  async getRequestDetail(id: string | number): Promise<{ request: ExpressVetRequest }> {
    const { data } = await client.get(`/express-vet/requests/${id}`);
    return data;
  },

  async cancelRequest(id: string | number, reason?: string): Promise<{ request: ExpressVetRequest }> {
    const { data } = await client.post(`/express-vet/requests/${id}/cancel`, { reason });
    return data;
  },

  async submitReview(id: string | number, payload: SubmitReviewPayload): Promise<{ review: ExpressVetReview }> {
    const { data } = await client.post(`/express-vet/requests/${id}/review`, payload);
    return data;
  },
};
