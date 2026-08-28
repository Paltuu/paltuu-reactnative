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
  maps_link: string | null;
  contact_phone: string;
  starting_price_pkr: number;
  final_price_pkr: number | null;
  scheduled_at: string | null;
  assigned_provider_id: string | null;
  provider_name?: string | null;
  provider_photo_url?: string | null;
  claimed_by_dispatcher_id: number | null;
  assigned_by_dispatcher_id?: number | null;
  claimed_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  /** Only present in `scope: 'team'` responses — the name of the dispatcher who owns this row. */
  dispatcher_name?: string | null;
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
  scheduled_at: string; // ISO 8601 — required, the confirmed visit date/time
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
  // No on/off duty toggle — dispatchers are always alertable. This is the only control:
  // mute for 30 minutes.
  async getMuteStatus(): Promise<{ muted_until: string | null }> {
    const { data } = await client.get('/express-vet/dispatcher/mute');
    return data;
  },

  async muteFor30Min(): Promise<{ muted_until: string }> {
    const { data } = await client.post('/express-vet/dispatcher/mute');
    return data;
  },

  async getInbox(): Promise<{ data: ExpressVetDispatchRequest[] }> {
    const { data } = await client.get('/express-vet/dispatcher/inbox');
    return data;
  },

  async getJobs(options?: {
    status?: 'assigned' | 'completed';
    /** Admin-only — drops the per-dispatcher filter and adds `dispatcher_name` to each row. A
     *  non-admin passing this gets a 403 from the backend. */
    scope?: 'team';
  }): Promise<{ data: ExpressVetDispatchRequest[] }> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.scope) params.scope = options.scope;
    const { data } = await client.get('/express-vet/dispatcher/jobs', { params });
    return data;
  },

  async getStats(): Promise<{
    in_progress: number;
    completed_today: number;
    total_completed: number;
    total_earned_pkr: number;
    unconfirmed_count: number;
    /** Present only when the caller is an admin. */
    team?: {
      in_progress: number;
      completed_today: number;
      total_completed: number;
      total_earned_pkr: number;
    };
  }> {
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

  // The caller's own provider row (linked_user_id = me). `provider` is null until they
  // either self-assign a job or open "My vet profile". Edited through the same screen as
  // any other provider — see providers/[id].tsx.
  async getMyProviderProfile(): Promise<{ provider: ExpressVetProvider | null }> {
    const { data } = await client.get('/express-vet/dispatcher/providers/me');
    return data;
  },

  // Get-or-create the caller's own provider row so it can be edited. Called when the
  // dispatcher opens "My vet profile" for the first time.
  async ensureMyProviderProfile(): Promise<{ provider: ExpressVetProvider }> {
    const { data } = await client.post('/express-vet/dispatcher/providers/me');
    return data;
  },

  async updateProvider(id: string | number, patch: Partial<NewProviderInput & { is_active: boolean }>): Promise<{ provider: ExpressVetProvider }> {
    const { data } = await client.patch(`/express-vet/dispatcher/providers/${id}`, patch);
    return data;
  },

  // Ringing-call push token — raw APNs VoIP token (iOS) or raw FCM token (Android), never
  // an Expo push token. See src/services/callkeep.ts for why this is a separate channel
  // from the normal notification token registered by NotificationContext.
  async registerPushToken(payload: {
    platform: 'ios' | 'android';
    voip_token?: string;
    fcm_token?: string;
    /**
     * Bundle id of THIS build. The server derives the APNs VoIP topic from it
     * (`<bundle id>.voip`), and dev/preview/production builds each have their own — a
     * server-side default would silently send every push to the wrong topic for anyone
     * not on a production build, and APNs answers 400 with nothing visible on the device.
     */
    bundle_id?: string;
  }): Promise<void> {
    await client.post('/express-vet/dispatcher/push-token', payload);
  },

  // Fire-and-forget diagnostic logging for failures nobody can otherwise see (no device
  // logs/adb access to the dispatcher's phone) — lands in Vercel's function logs. See
  // app/api/v1/express-vet/dispatcher/client-log/route.ts.
  async reportClientLog(payload: { context: string; message: string; extra?: Record<string, unknown> }): Promise<void> {
    await client.post('/express-vet/dispatcher/client-log', payload);
  },
};
