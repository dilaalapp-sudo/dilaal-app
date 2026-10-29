/**
 * Base URL for the Express backend (registration, categories catalog).
 * Android emulator: http://10.0.2.2:3000. Device on Wi-Fi: use the machine's
 * LAN IP, e.g. http://192.168.1.20:3000, via EXPO_PUBLIC_API_URL.
 */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
