// Plain module-level holder for "this device's currently active push token" — deliberately
// not a zustand store or React state, since it needs to be readable from
// `useAuthStore.logout()` (a plain async function, not a hook, called both from the normal
// profile-menu logout mutation and directly from the dispatcher console's logout button) with
// no dependency on which component tree called it. Written by NotificationContext.tsx
// whenever the token changes; read once, right before clearing credentials, so the
// unregister-device call still has a valid access token to authenticate with.
let currentToken: string | null = null;

export function setCurrentPushToken(token: string | null) {
  currentToken = token;
}

export function getCurrentPushToken(): string | null {
  return currentToken;
}
