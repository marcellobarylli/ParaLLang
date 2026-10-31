// The Simulator shares the Mac's network, so the local server is reachable at 127.0.0.1.
// Expo inlines EXPO_PUBLIC_* variables at bundle time; restart `expo start` after changing it.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
