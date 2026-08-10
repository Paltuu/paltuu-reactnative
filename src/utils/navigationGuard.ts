// Globally guards expo-router's imperative push/navigate against duplicate
// calls fired in quick succession — e.g. two taps on a header icon or a list
// row before the first navigation's screen has mounted, which used to push
// (and mount) the destination screen twice.
//
// `useRouter()` and the `router` singleton exported by 'expo-router' are the
// same object (see expo-router/build/imperative-api.js), and every screen in
// this app navigates through one of those two — never <Link>. So patching
// `router.push`/`router.navigate` once, here, covers every call site without
// touching them individually. Import this module once for its side effect
// (see app/_layout.tsx).
import { router } from 'expo-router';

const NAV_GUARD_MS = 800;

function keyOf(opts: unknown): string {
  if (typeof opts === 'string') return opts;
  const o = opts as { pathname?: string; params?: Record<string, unknown> } | null;
  return (o?.pathname ?? '') + JSON.stringify(o?.params ?? {});
}

function guard<T extends (opts: any) => void>(fn: T): T {
  let lastKey = '';
  let lastAt = 0;
  return ((opts: any) => {
    const key = keyOf(opts);
    const now = Date.now();
    if (key === lastKey && now - lastAt < NAV_GUARD_MS) return;
    lastKey = key;
    lastAt = now;
    fn(opts);
  }) as T;
}

type GuardableRouter = typeof router & { __navGuardInstalled?: boolean };
const guardable = router as GuardableRouter;

// Flag lives on the router singleton itself (not a module-level var) so a
// Fast Refresh of this file doesn't re-wrap an already-wrapped function.
if (!guardable.__navGuardInstalled) {
  guardable.__navGuardInstalled = true;
  guardable.push = guard(guardable.push);
  guardable.navigate = guard(guardable.navigate);
}
