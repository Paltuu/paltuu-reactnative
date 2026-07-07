import { io, Socket } from 'socket.io-client';
import { storage } from '../utils/storage';

const REALTIME_URL = process.env.EXPO_PUBLIC_REALTIME_URL || process.env.EXPO_PUBLIC_API_URL || '';

let socket: Socket | null = null;

async function getAccessToken(): Promise<string | null> {
  return storage.getToken();
}

export async function getRealtimeSocket(): Promise<Socket | null> {
  if (!REALTIME_URL) return null;

  const token = await getAccessToken();
  if (!token) return null;

  if (socket) {
    const currentToken = socket.auth?.token;
    if (currentToken === token && socket.connected) {
      return socket;
    }

    socket.disconnect();
    socket = null;
  }

  socket = io(REALTIME_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    auth: { token },
  });

  return socket;
}

export async function disconnectRealtimeSocket(): Promise<void> {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onRealtimeAuthFailed(handler: () => void): void {
  if (!socket) return;
  socket.on('connect_error', (error) => {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('token')) {
      handler();
    }
  });
}
