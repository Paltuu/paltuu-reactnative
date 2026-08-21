import { create } from 'zustand';

// Maps a CallKeep callUUID -> the Express Vet request payload it represents, for the
// window between `displayIncomingCall` and the dispatcher either answering (navigate to
// the request + attempt claim) or the call ending (drop it). CallKeep's own events only
// carry the UUID, not the request data, so this is the lookup the answer/end handlers use.
export interface IncomingExpressVetCallPayload {
  request_id: string;
  category: string;
  client_name: string;
  client_photo_url: string | null;
  address_line: string;
  starting_price_pkr: number;
  contact_phone: string;
}

interface IncomingCallState {
  calls: Record<string, IncomingExpressVetCallPayload>;
  register: (callUUID: string, payload: IncomingExpressVetCallPayload) => void;
  get: (callUUID: string) => IncomingExpressVetCallPayload | undefined;
  clear: (callUUID: string) => void;
}

export const useIncomingCallStore = create<IncomingCallState>((set, get) => ({
  calls: {},
  register: (callUUID, payload) =>
    set((state) => ({ calls: { ...state.calls, [callUUID]: payload } })),
  get: (callUUID) => get().calls[callUUID],
  clear: (callUUID) =>
    set((state) => {
      const next = { ...state.calls };
      delete next[callUUID];
      return { calls: next };
    }),
}));
