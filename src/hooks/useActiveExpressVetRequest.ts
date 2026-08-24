import { useQuery } from '@tanstack/react-query';
import { expressVetApi, ExpressVetRequest } from '../api/expressVet';

// "Active/trackable" mirrors the backend's one-active-booking guard (see
// app/api/v1/express-vet/requests/route.ts) exactly: anything short of cancelled/expired, or
// completed but not yet reviewed — the client still has something to do (wait, or review).
// Used by both the persistent booking bar (shows it) and the category entry points (redirect
// straight to it instead of letting the user start a second booking that the server would
// reject anyway).
export function isTrackableExpressVetRequest(r: ExpressVetRequest): boolean {
  if (r.status === 'cancelled' || r.status === 'expired') return false;
  if (r.status === 'completed' && r.review_rating != null) return false;
  return true;
}

export function useActiveExpressVetRequest(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['express-vet-my-requests', 'active'],
    queryFn: () => expressVetApi.getMyRequests(1),
    enabled,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });

  const active = (query.data?.data ?? []).find(isTrackableExpressVetRequest) ?? null;

  return { activeRequest: active, isPending: query.isPending };
}
