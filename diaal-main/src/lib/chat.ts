import { supabase } from './supabase';
import { signedAttachmentUrls } from './storage';
import type { ChatMessage, Currency } from '../types';

// Real Supabase chat schema:
//   conversations  (id, listing_id, broker_id -> brokers.id, buyer_id -> profiles.id)
//   chat_messages  (id, conversation_id, broker_id, sender, sender_name, body, ...)
//   offers         (message_id, listing_id, broker_id, created_by, ...)
//   message_attachments (message_id, ...)
// A broker user is linked to an auth user through brokers.owner_id.

export interface ConversationRow {
  id: string;
  listing_id: string | null;
  broker_id: string;
  buyer_id: string;
  updated_at: string;
}

export interface BrokerIdentity {
  id: string;
  name: string;
  ownerId: string | null;
}

export interface InboxItem {
  conversationId: string;
  listingId: string | null;
  listingTitle: string;
  listingImage: string;
  buyerId: string;
  buyerName: string;
  lastMessage: string;
  lastAt: string;
  updatedAt: string;
}

export interface BuyerInboxItem {
  conversationId: string;
  listingId: string | null;
  listingTitle: string;
  listingImage: string;
  brokerId: string;
  brokerName: string;
  brokerAvatar: string;
  lastMessage: string;
  lastAt: string;
  updatedAt: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  broker_id: string | null;
  sender: 'broker' | 'user' | 'system';
  sender_name: string | null;
  body: string;
  sent_at: string;
  is_audio: boolean | null;
  audio_duration: string | null;
  audio_origin: string | null;
  created_at: string;
}

interface OfferRow {
  id: string;
  message_id: string | null;
  version: number;
  asset_subject: string;
  proposed_price: number | string;
  currency: Currency;
  original_price: number | string | null;
  discount_percent: number | string | null;
  deposit_amount: number | string | null;
  escrow_terms: string | null;
  title_guarantee: string | null;
  expiry_time: string | null;
  status: 'active' | 'accepted' | 'countered' | 'declined' | 'expired';
}

interface AttachmentRow {
  id: string;
  message_id: string | null;
  title: string;
  type: 'pdf' | 'image';
  image: string | null;
  size: string | null;
  storage_path: string | null;
  mime_type: string | null;
}

const MESSAGE_COLUMNS =
  'id, conversation_id, broker_id, sender, sender_name, body, sent_at, is_audio, audio_duration, audio_origin, created_at';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mapOffer(row: OfferRow): NonNullable<ChatMessage['offer']> {
  return {
    id: row.id,
    version: Number(row.version) || 1,
    assetSubject: row.asset_subject,
    proposedPrice: Number(row.proposed_price) || 0,
    currency: row.currency,
    originalPrice: Number(row.original_price) || 0,
    discountPercent: Number(row.discount_percent) || 0,
    depositAmount: Number(row.deposit_amount) || 0,
    escrowTerms: row.escrow_terms ?? '',
    titleGuarantee: row.title_guarantee ?? '',
    expiryTime: row.expiry_time ?? '',
    status: row.status,
  };
}

function mapMessage(
  row: MessageRow,
  offer?: NonNullable<ChatMessage['offer']>,
  attachments?: NonNullable<ChatMessage['attachments']>
): ChatMessage {
  return {
    id: row.id,
    sender: row.sender,
    senderName: row.sender_name ?? undefined,
    text: row.body,
    sentAt: row.sent_at ?? row.created_at ?? undefined,
    timestamp: formatTime(row.sent_at || row.created_at),
    isAudio: row.is_audio ?? false,
    audioDuration: row.audio_duration ?? undefined,
    audioOrigin: row.audio_origin ?? undefined,
    attachments,
    offer,
  };
}

async function fetchOffersForMessages(
  messageIds: string[]
): Promise<Record<string, NonNullable<ChatMessage['offer']>>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .in('message_id', messageIds);
  if (error || !data) return {};
  const map: Record<string, NonNullable<ChatMessage['offer']>> = {};
  (data as OfferRow[]).forEach((row) => {
    if (row.message_id) map[row.message_id] = mapOffer(row);
  });
  return map;
}

async function fetchAttachmentsForMessages(
  messageIds: string[]
): Promise<Record<string, NonNullable<ChatMessage['attachments']>>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await supabase
    .from('message_attachments')
    .select('*')
    .in('message_id', messageIds);
  if (error || !data) return {};
  const rows = data as AttachmentRow[];
  const paths = rows
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));
  const signed = paths.length > 0 ? await signedAttachmentUrls(paths) : {};
  const map: Record<string, NonNullable<ChatMessage['attachments']>> = {};
  rows.forEach((row) => {
    if (!row.message_id) return;
    (map[row.message_id] ||= []).push({
      id: row.id,
      title: row.title,
      type: row.type,
      image: row.storage_path ? signed[row.storage_path] : row.image ?? undefined,
      size: row.size ?? undefined,
      storagePath: row.storage_path ?? undefined,
      mimeType: row.mime_type ?? undefined,
    });
  });
  return map;
}

/** The broker profile owned by a signed-in user (brokers.owner_id). */
export async function fetchBrokerByOwner(ownerId: string): Promise<BrokerIdentity | null> {
  if (!ownerId) return null;
  const { data, error } = await supabase
    .from('brokers')
    .select('id, name, owner_id')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: String(data.id), name: String(data.name || ''), ownerId: data.owner_id ?? null };
}

/** Get the signed-in user's broker profile, creating one for sellers who lack it. */
export async function ensureBrokerProfile(
  userId: string,
  name: string
): Promise<BrokerIdentity | null> {
  if (!userId) return null;
  const existing = await fetchBrokerByOwner(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('brokers')
    .insert({
      name: name || 'Verified Seller',
      title: 'Verified Seller',
      title_so: 'Iibiye La Aqoonsaday',
      rating: 0,
      reviews_count: 0,
      deals: 0,
      trust_score: 0,
      verification_status: 'submitted',
      languages: [],
      is_online: true,
      owner_id: userId,
    })
    .select('id, name, owner_id')
    .single();
  if (error || !data) {
    console.warn('[DILAAL] broker profile provisioning failed:', error?.message);
    return null;
  }
  return { id: String(data.id), name: String(data.name || ''), ownerId: data.owner_id ?? null };
}

/** One conversation per (listing, buyer) — or per (broker, buyer) for directory chats. */
export async function getOrCreateConversation(opts: {
  listingId: string | null;
  brokerId: string;
  buyerId: string;
}): Promise<ConversationRow | null> {
  if (!opts.brokerId || !opts.buyerId) return null;

  // Prevent self-chat: if the broker profile belongs to the same user, block.
  const { data: broker } = await supabase
    .from('brokers')
    .select('owner_id')
    .eq('id', opts.brokerId)
    .maybeSingle();
  if (broker?.owner_id && broker.owner_id === opts.buyerId) return null;

  // Only filter by listing when one is attached; directory chats reuse the
  // buyer's conversation with that broker instead of creating duplicates.
  const scoped = () => {
    let query = supabase
      .from('conversations')
      .select('id, listing_id, broker_id, buyer_id, updated_at')
      .eq('buyer_id', opts.buyerId);
    if (opts.listingId) {
      return query.eq('listing_id', opts.listingId);
    }
    return query.eq('broker_id', opts.brokerId).is('listing_id', null);
  };

  const { data: existing } = await scoped().maybeSingle();
  if (existing) return existing as ConversationRow;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: opts.listingId,
      broker_id: opts.brokerId,
      buyer_id: opts.buyerId,
    })
    .select('id, listing_id, broker_id, buyer_id, updated_at')
    .single();

  if (error) {
    // Lost a concurrent create race — read the row that won.
    const { data: retry } = await scoped().maybeSingle();
    if (retry) return retry as ConversationRow;
    console.warn('[DILAAL] conversation create failed:', error.message);
    return null;
  }
  return data as ConversationRow;
}

/** Full message history for one conversation, with offers and attachments merged in. */
export async function fetchConversationMessages(
  conversationId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<ChatMessage[] | null> {
  if (!conversationId) return [];
  const limit = opts.limit ?? 50;
  let query = supabase
    .from('chat_messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (opts.before) query = query.lt('sent_at', opts.before);
  const { data, error } = await query;
  if (error) {
    console.warn('[DILAAL] chat fetch failed:', error.message);
    return null;
  }
  // Query newest-first for the page cursor, then restore reading order.
  const rows = ((data ?? []) as MessageRow[]).slice().reverse();
  const ids = rows.map((r) => r.id);
  const [offers, attachments] = await Promise.all([
    fetchOffersForMessages(ids),
    fetchAttachmentsForMessages(ids),
  ]);
  return rows.map((row) => mapMessage(row, offers[row.id], attachments[row.id]));
}

/** Insert a real chat message (optionally with an offer or attachment). */
export async function sendChatMessage(opts: {
  conversationId: string;
  listingId: string | null;
  brokerId: string | null;
  sender: 'user' | 'broker' | 'system';
  senderName?: string;
  body: string;
  offer?: ChatMessage['offer'];
  attachment?: NonNullable<ChatMessage['attachments']>[number];
  isAudio?: boolean;
  audioDuration?: string;
  audioOrigin?: string;
}): Promise<ChatMessage | null> {
  if (!opts.conversationId) return null;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: opts.conversationId,
      broker_id: opts.brokerId,
      sender: opts.sender,
      sender_name: opts.senderName ?? null,
      body: opts.body,
      is_audio: opts.isAudio ?? false,
      audio_duration: opts.audioDuration ?? null,
      audio_origin: opts.audioOrigin ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    console.warn('[DILAAL] chat insert failed:', error?.message);
    return null;
  }
  const row = data as MessageRow;

  let persistedOffer: NonNullable<ChatMessage['offer']> | undefined;
  if (opts.offer) {
    const { data: offerRow, error: offerError } = await supabase
      .from('offers')
      .insert({
        message_id: row.id,
        listing_id: opts.listingId,
        broker_id: opts.brokerId,
        version: opts.offer.version || 1,
        asset_subject: opts.offer.assetSubject,
        proposed_price: opts.offer.proposedPrice,
        currency: opts.offer.currency,
        original_price: opts.offer.originalPrice,
        discount_percent: opts.offer.discountPercent,
        deposit_amount: opts.offer.depositAmount,
        escrow_terms: opts.offer.escrowTerms,
        title_guarantee: opts.offer.titleGuarantee,
        expiry_time: opts.offer.expiryTime,
        status: opts.offer.status,
      })
      .select('*')
      .single();
    if (offerError) {
      console.warn('[DILAAL] offer insert failed:', offerError.message);
    } else if (offerRow) {
      persistedOffer = mapOffer(offerRow as OfferRow);
    }
  }

  let persistedAttachment: NonNullable<ChatMessage['attachments']> | undefined;
  if (opts.attachment) {
    const { data: attachmentRow, error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: row.id,
        title: opts.attachment.title,
        type: opts.attachment.type,
        image: opts.attachment.storagePath ? null : opts.attachment.image ?? null,
        size: opts.attachment.size ?? null,
        storage_path: opts.attachment.storagePath ?? null,
        mime_type: opts.attachment.mimeType ?? null,
      })
      .select('*')
      .single();
    if (attachmentError) {
      console.warn('[DILAAL] attachment insert failed:', attachmentError.message);
    } else if (attachmentRow) {
      const mapped = attachmentRow as AttachmentRow;
      const signed = mapped.storage_path
        ? (await signedAttachmentUrls([mapped.storage_path]))[mapped.storage_path]
        : undefined;
      persistedAttachment = [
        {
          id: mapped.id,
          title: mapped.title,
          type: mapped.type,
          image: signed ?? mapped.image ?? undefined,
          size: mapped.size ?? undefined,
          storagePath: mapped.storage_path ?? undefined,
          mimeType: mapped.mime_type ?? undefined,
        },
      ];
    }
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', opts.conversationId);

  return mapMessage(row, persistedOffer, persistedAttachment);
}

/**
 * Ephemeral typing pings for one conversation (Realtime broadcast, nothing stored).
 * Senders are excluded from their own events, so no identity is needed.
 */
export function subscribeTyping(
  conversationId: string,
  onPeerTyping: (typing: boolean) => void
): { notifyTyping: () => void; stop: () => void } {
  if (!conversationId) return { notifyTyping: () => {}, stop: () => {} };
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  channel.on('broadcast', { event: 'typing' }, (payload: { payload?: { typing?: boolean } }) => {
    onPeerTyping(Boolean(payload?.payload?.typing));
  });
  channel.subscribe();
  let lastSent = 0;
  return {
    notifyTyping: () => {
      const now = Date.now();
      if (now - lastSent < 1500) return;
      lastSent = now;
      void channel
        .send({ type: 'broadcast', event: 'typing', payload: { typing: true } })
        .catch(() => undefined);
    },
    stop: () => {
      void supabase.removeChannel(channel);
    },
  };
}

/** Stream new messages for one conversation. Returns an unsubscribe function. */
export function subscribeConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  if (!conversationId) return () => {};
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as MessageRow;
        void (async () => {
          const [offers, attachments] = await Promise.all([
            fetchOffersForMessages([row.id]),
            fetchAttachmentsForMessages([row.id]),
          ]);
          onMessage(mapMessage(row, offers[row.id], attachments[row.id]));
        })();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Every buyer conversation addressed to a broker, newest activity first. */
export async function fetchBrokerInbox(brokerId: string): Promise<InboxItem[]> {
  if (!brokerId) return [];
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, listing_id, broker_id, buyer_id, updated_at')
    .eq('broker_id', brokerId)
    .order('updated_at', { ascending: false });
  if (error || !convs) {
    console.warn('[DILAAL] inbox fetch failed:', error?.message);
    return [];
  }
  const rows = convs as ConversationRow[];
  if (rows.length === 0) return [];

  const listingIds = Array.from(
    new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)))
  );
  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id).filter(Boolean)));

  const [listingsRes, profilesRes, messagesRes] = await Promise.all([
    listingIds.length
      ? supabase.from('listings').select('id, title, image').in('id', listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; image: string | null }[] }),
    buyerIds.length
      // Two-column view: counterpart profiles never expose phone/email.
      ? supabase.from('chat_profiles').select('id, full_name').in('id', buyerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    supabase
      .from('chat_messages')
      .select('conversation_id, body, sent_at')
      .in(
        'conversation_id',
        rows.map((r) => r.id)
      )
      .order('sent_at', { ascending: false }),
  ]);

  const listingMap = new Map(
    ((listingsRes.data ?? []) as { id: string; title: string; image: string | null }[]).map((l) => [
      l.id,
      l,
    ])
  );
  const buyerMap = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null }[]).map((p) => [
      p.id,
      p.full_name,
    ])
  );
  const lastByConversation = new Map<string, { body: string; sent_at: string }>();
  (
    (messagesRes.data ?? []) as { conversation_id: string; body: string; sent_at: string }[]
  ).forEach((m) => {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, { body: m.body, sent_at: m.sent_at });
    }
  });

  return rows.map((row) => {
    const listing = row.listing_id ? listingMap.get(row.listing_id) : undefined;
    const buyer = buyerMap.get(row.buyer_id);
    const last = lastByConversation.get(row.id);

    // Skip self-conversations (broker chatting with themselves)
    if (row.buyer_id === row.broker_id) return null;

    return {
      conversationId: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      listingTitle: listing?.title || (row.listing_id ? 'Listing' : 'Direct message'),
      listingImage: listing?.image || '',
      buyerName: buyer || 'Buyer',
      lastMessage: last?.body || 'No messages yet',
      lastAt: last ? formatTime(last.sent_at) : '',
      updatedAt: row.updated_at,
    };
  }).filter(Boolean);
}

/** Every conversation a buyer has with brokers, newest activity first. */
export async function fetchBuyerInbox(buyerId: string): Promise<BuyerInboxItem[]> {
  if (!buyerId) return [];
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, listing_id, broker_id, buyer_id, updated_at')
    .eq('buyer_id', buyerId)
    .order('updated_at', { ascending: false });
  if (error || !convs) {
    console.warn('[DILAAL] buyer inbox fetch failed:', error?.message);
    return [];
  }
  const rows = convs as ConversationRow[];
  if (rows.length === 0) return [];

  const listingIds = Array.from(
    new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)))
  );
  const brokerIds = Array.from(new Set(rows.map((r) => r.broker_id).filter(Boolean)));

  const [listingsRes, brokersRes, messagesRes] = await Promise.all([
    listingIds.length
      ? supabase.from('listings').select('id, title, image').in('id', listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; image: string | null }[] }),
    supabase.from('brokers').select('id, name, avatar').in('id', brokerIds),
    supabase
      .from('chat_messages')
      .select('conversation_id, body, sent_at')
      .in(
        'conversation_id',
        rows.map((r) => r.id)
      )
      .order('sent_at', { ascending: false }),
  ]);

  const listingMap = new Map(
    ((listingsRes.data ?? []) as { id: string; title: string; image: string | null }[]).map((l) => [
      l.id,
      l,
    ])
  );
  const brokerMap = new Map(
    ((brokersRes.data ?? []) as { id: string; name: string; avatar: string | null }[]).map((b) => [
      b.id,
      b,
    ])
  );
  const lastByConversation = new Map<string, { body: string; sent_at: string }>();
  (
    (messagesRes.data ?? []) as { conversation_id: string; body: string; sent_at: string }[]
  ).forEach((m) => {
    if (!lastByConversation.has(m.conversation_id)) {
      lastByConversation.set(m.conversation_id, { body: m.body, sent_at: m.sent_at });
    }
  });

  return rows.map((row) => {
    const listing = row.listing_id ? listingMap.get(row.listing_id) : undefined;
    const broker = brokerMap.get(row.broker_id);
    const last = lastByConversation.get(row.id);

    // Skip self-conversations (buyer chatting with themselves)
    if (row.buyer_id === row.broker_id) return null;

    return {
      conversationId: row.id,
      listingId: row.listing_id,
      listingTitle: listing?.title || (row.listing_id ? 'Listing' : 'Direct message'),
      listingImage: listing?.image || '',
      brokerId: row.broker_id,
      brokerName: broker?.name || 'Broker',
      brokerAvatar: broker?.avatar || '',
      lastMessage: last?.body || 'No messages yet',
      lastAt: last ? formatTime(last.sent_at) : '',
      updatedAt: row.updated_at,
    };
  }).filter(Boolean);
}

/** Refresh a conversation list when a new conversation or message arrives. */
export function subscribeInbox(
  scope: 'broker_id' | 'buyer_id',
  id: string,
  onChange: () => void
): () => void {
  if (!id) return () => {};
  const channel = supabase
    .channel(`inbox:${scope}:${id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations', filter: `${scope}=eq.${id}` },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Broker-side response to an offer (accept / decline). */
export async function updateOfferStatus(
  offerId: string,
  status: 'active' | 'accepted' | 'countered' | 'declined' | 'expired'
): Promise<boolean> {
  if (!offerId) return false;
  const { error } = await supabase.from('offers').update({ status }).eq('id', offerId);
  if (error) {
    console.warn('[DILAAL] offer status update failed:', error.message);
    return false;
  }
  return true;
}

/** The broker that owns a listing, falling back to the listing owner. */
export async function resolveListingBroker(
  listingId: string
): Promise<{ brokerId: string | null; ownerId: string | null }> {
  if (!listingId) return { brokerId: null, ownerId: null };
  const { data, error } = await supabase
    .from('listings')
    .select('broker_id, owner_id')
    .eq('id', listingId)
    .maybeSingle();
  if (error || !data) return { brokerId: null, ownerId: null };
  return { brokerId: data.broker_id ?? null, ownerId: data.owner_id ?? null };
}
