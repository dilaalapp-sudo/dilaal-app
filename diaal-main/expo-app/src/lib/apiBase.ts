import { Platform } from 'react-native';

const PORT = 3000;

const explicit = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

const LOCALHOST = `http://localhost:${PORT}`;

const DEV_CANDIDATES =
  Platform.OS === 'android' ? [`http://10.0.2.2:${PORT}`, LOCALHOST] : [LOCALHOST];

const isHttps = (url: string) => url.startsWith('https://');

/**
 * Release builds are HTTPS-only: they use the pinned EXPO_PUBLIC_API_URL only
 * when it is https, and never probe plaintext dev hosts. Dev builds keep the
 * local candidates (emulator alias / adb-reverse localhost).
 */
const CANDIDATES = explicit
  ? __DEV__ || isHttps(explicit)
    ? [explicit]
    : []
  : __DEV__
    ? DEV_CANDIDATES
    : [];

let resolved: string | null = null;

async function reachable(base: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${base}/api/categories`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Base URL for the Express backend (registration, categories catalog).
 *
 * Release builds must pin an HTTPS host via `EXPO_PUBLIC_API_URL=https://...`;
 * with none set, server-backed features fail closed (no plaintext fallback).
 * Dev builds probe the emulator alias `10.0.2.2` then `localhost` (USB devices
 * use `adb reverse tcp:3000 tcp:3000`), or a pinned `EXPO_PUBLIC_API_URL`.
 */
export async function getApiBase(): Promise<string> {
  if (resolved) return resolved;

  for (const base of CANDIDATES) {
    if (await reachable(base)) {
      resolved = base;
      return base;
    }
  }

  const fallback = __DEV__ ? explicit || LOCALHOST : isHttps(explicit) ? explicit : '';
  resolved = fallback;
  return fallback;
}
