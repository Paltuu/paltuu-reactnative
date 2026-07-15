// Prevents the same route+params from being pushed twice in quick succession,
// e.g. two slow taps on a thread row each independently scheduling a
// router.push before the first navigation's screen has mounted.
const NAV_GUARD_MS = 800;
let lastPushKey = '';
let lastPushAt = 0;

export function guardedPush(router: { push: (opts: any) => void }, opts: { pathname: string; params: Record<string, any> }) {
  const key = opts.pathname + JSON.stringify(opts.params);
  const now = Date.now();
  if (key === lastPushKey && now - lastPushAt < NAV_GUARD_MS) return;
  lastPushKey = key;
  lastPushAt = now;
  router.push(opts);
}
