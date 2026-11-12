// DILAAL push fan-out.
//
// Deploy:  supabase functions deploy push-notification --no-verify-jwt
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the
//          platform; never hard-code them in this file.
//
// Trigger: Database Webhook on INSERT into public.notifications
//   (Dashboard → Database → Webhooks → Create:
//    table public.notifications, event INSERT,
//    type Supabase Edge Function → push-notification)
//
// The function looks up every Expo push token for the notification's
// recipient and sends one message per device. Tokens Expo reports as
// DeviceNotRegistered are removed so the table stays clean.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: NotificationRow;
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const notification = payload?.record;
  if (!notification?.user_id) {
    return new Response('No recipient', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return new Response('Server misconfigured: missing Supabase credentials', { status: 500 });
  }

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('expo_token')
    .eq('user_id', notification.user_id);

  if (error || !tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = tokens.map((row: { expo_token: string }) => ({
    to: row.expo_token,
    title: notification.title || 'DILAAL',
    body: notification.body || '',
    sound: 'default',
    channelId: 'dilaal-messages',
    data: { notificationId: notification.id, kind: notification.kind },
  }));

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error('[push] Expo push API failed', await response.text());
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = (await response.json()) as {
    data?: Array<{ status: string; details?: { error?: string } }>;
  };

  const staleTokens = tokens
    .filter(
      (_row: { expo_token: string }, index: number) =>
        result.data?.[index]?.details?.error === 'DeviceNotRegistered'
    )
    .map((row: { expo_token: string }) => row.expo_token);

  if (staleTokens.length > 0) {
    await supabase.from('push_tokens').delete().in('expo_token', staleTokens);
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
