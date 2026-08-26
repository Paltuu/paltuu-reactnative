import axios from 'axios';
import { Alert } from 'react-native';

export interface ApiErrorInfo {
  title: string;
  message: string;
  retryAfterSeconds?: number;
}

const DEFAULT_TITLE = 'Something went wrong';

/**
 * Shapes any thrown error into a user-facing title/message. Callers with their own
 * special-cased errors (e.g. ExpressVetActiveBookingError's 409, or a claim-conflict 409)
 * MUST check for those FIRST and handle them separately — this is the fallback for
 * everything else, not a replacement for existing special-casing.
 */
export function getApiErrorInfo(error: unknown, fallbackMessage: string): ApiErrorInfo {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return { title: 'No connection', message: 'Check your internet connection and try again.' };
    }
    if (error.response.status === 429) {
      const retryAfter =
        Number(error.response.data?.retry_after) ||
        Number(error.response.headers?.['retry-after']) ||
        30;
      return {
        title: "You're going a bit fast",
        message: `Please wait ${retryAfter}s and try again.`,
        retryAfterSeconds: retryAfter,
      };
    }
  }
  return { title: DEFAULT_TITLE, message: fallbackMessage };
}

/** Drop-in replacement for the `Alert.alert('Something went wrong', '...')` pattern used
 *  throughout the app's mutation onError handlers — now 429/network-aware. */
export function showApiErrorAlert(error: unknown, fallbackMessage: string): void {
  const { title, message } = getApiErrorInfo(error, fallbackMessage);
  Alert.alert(title, message);
}
