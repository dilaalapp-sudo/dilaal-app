import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

interface PushSubscriptionPayload {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Register a web push subscription for the authenticated user.
 * Requires VITE_VAPID_PUBLIC_KEY to be set in .env for web push to work.
 * Failures never block sign-in.
 */
export async function registerWebPushToken(userId: string): Promise<void> {
  if (!userId) return;
  if (!VAPID_PUBLIC_KEY) {
    // VAPID key not configured — skip silently for web
    return;
  }
  if (!('PushManager' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });

    const rawKey = subscription.getKey?.('p256dh');
    const rawAuth = subscription.getKey?.('auth');

    if (!rawKey || !rawAuth) {
      console.warn('[DILAAL] push subscription missing keys');
      return;
    }

    const payload: PushSubscriptionPayload = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(rawKey),
      auth: arrayBufferToBase64(rawAuth),
    };

    await supabase.from('web_push_subscriptions').upsert(
      payload,
      { onConflict: 'user_id,endpoint' }
    );
  } catch (err) {
    console.warn('[DILAAL] web push registration failed:', err instanceof Error ? err.message : String(err));
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
