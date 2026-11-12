-- DILAAL security hardening round 3 (015)
-- Run once in the Supabase SQL editor for project usrqtgobuylkhwblpjnb,
-- after 014_security_round2.sql. Safe to re-run.
--
-- Closes the 2026-11-08 audit findings:
--   1. offers INSERT was unguarded: a participant could insert an offer
--      already 'accepted' with a spoofed created_by (013 guards UPDATE only).
--   2. The base schema's chat policies were never dropped by 007. RLS combines
--      permissive policies with OR, so the loose base insert let a buyer post
--      sender='broker' messages, and the base delete let a buyer erase the
--      broker's messages/attachments.
--   3. escrow_deals allowed the buyer to write every column (deposit_paid,
--      milestones, dispute). No client writes this table today (the app
--      targets 008's `deals`, which is not applied), so writes become
--      staff-only. When live escrow ships, use security-definer RPCs that
--      verify payment server-side instead of reopening table writes.
--   4. conversations: the broker-owner could reassign buyer_id and hand the
--      chat history to another account. Participant ids are now frozen.
--   6. listings: owners could attach their listing to any broker's name.
--      broker_id must now reference a broker profile the seller owns.
--   8. support_ticket_messages: ticket owners could forge 'support' replies.
--
-- Verified client compatibility:
--   * Offer sends/counter-offers always insert status 'active'; created_by was
--     never sent by the client (now stamped). Counter version is untouched.
--   * Buyer-side 'system' messages (offer accepted/declined notices) remain
--     allowed; only their sender_name is normalized to 'System'.
--   * Listing creation provisions the seller's own broker profile first
--     (ensureBrokerProfile), so the ownership rule matches the app flow.
--   * Escrow/deal persistence in the app uses the (unapplied) 008 `deals`
--     table and falls back to local state; escrow_deals is untouched by it.

-- ---------------------------------------------------------------------------
-- 1. Offers: client inserts start life as 'active', authored by the caller.
--    Status transitions stay governed by 013's offers_guard_update.
-- ---------------------------------------------------------------------------
create or replace function public.guard_offer_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_staff() then
    return new;
  end if;

  new.status := 'active';
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists offers_guard_insert on public.offers;
create trigger offers_guard_insert
  before insert on public.offers
  for each row execute function public.guard_offer_insert();

-- ---------------------------------------------------------------------------
-- 2. Chat: remove the loose base-schema policies that 007 left behind.
--    007's sender-scoped insert policy (chat_messages_participants_insert)
--    remains: 'user' requires the buyer, 'broker' requires the owning broker,
--    'system' requires a participant. With the base insert gone, a buyer can
--    no longer post as the broker.
-- ---------------------------------------------------------------------------
drop policy if exists "messages_select_participant" on public.chat_messages;
drop policy if exists "messages_insert_participant" on public.chat_messages;
drop policy if exists "messages_delete_owner_or_mod" on public.chat_messages;

drop policy if exists "attachments_select_participant" on public.message_attachments;
drop policy if exists "attachments_insert_participant" on public.message_attachments;
drop policy if exists "attachments_delete_participant" on public.message_attachments;

-- Read: participants + staff (007's read lacked the staff branch the base
-- policy used to provide).
drop policy if exists "chat_messages_participants_read" on public.chat_messages;
create policy "chat_messages_participants_read"
  on public.chat_messages for select
  to authenticated
  using (
    public.is_moderator()
    or exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

-- Delete: only the message's author (buyer for 'user', owning broker for
-- 'broker') or staff. 'system' notices are staff-deletable only, so neither
-- party can erase the platform's record of an offer decision.
drop policy if exists "chat_messages_author_delete" on public.chat_messages;
create policy "chat_messages_author_delete"
  on public.chat_messages for delete
  to authenticated
  using (
    public.is_moderator()
    or exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and (
          (chat_messages.sender = 'user'::public.chat_sender and c.buyer_id = auth.uid())
          or (
            chat_messages.sender = 'broker'::public.chat_sender
            and exists (
              select 1 from public.brokers b
              where b.id = c.broker_id and b.owner_id = auth.uid()
            )
          )
        )
    )
  );

-- Attachments: participants + staff read/insert; delete follows the parent
-- message's author, not "any participant".
drop policy if exists "attachments_participants_read" on public.message_attachments;
create policy "attachments_participants_read"
  on public.message_attachments for select
  to authenticated
  using (
    public.is_moderator()
    or exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_attachments.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "attachments_participants_insert" on public.message_attachments;
create policy "attachments_participants_insert"
  on public.message_attachments for insert
  to authenticated
  with check (
    public.is_moderator()
    or exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_attachments.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "attachments_author_delete" on public.message_attachments;
create policy "attachments_author_delete"
  on public.message_attachments for delete
  to authenticated
  using (
    public.is_moderator()
    or exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_attachments.message_id
        and (
          (m.sender = 'user'::public.chat_sender and c.buyer_id = auth.uid())
          or (
            m.sender = 'broker'::public.chat_sender
            and exists (
              select 1 from public.brokers b
              where b.id = c.broker_id and b.owner_id = auth.uid()
            )
          )
        )
    )
  );

-- Normalize display names: 'system' notices always render as System, and
-- 'user' messages carry the profile name, not a client-supplied string.
create or replace function public.stamp_chat_sender_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.sender = 'system'::public.chat_sender then
    new.sender_name := 'System';
  elsif new.sender = 'user'::public.chat_sender and auth.uid() is not null then
    select p.full_name into v_name from public.profiles p where p.id = auth.uid();
    new.sender_name := coalesce(v_name, new.sender_name);
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_stamp_sender on public.chat_messages;
create trigger chat_messages_stamp_sender
  before insert on public.chat_messages
  for each row execute function public.stamp_chat_sender_name();

-- ---------------------------------------------------------------------------
-- 3. Escrow: payment/milestone/dispute state is staff-managed. Buyers keep
--    read access to their own deals; service_role bypasses RLS as usual.
-- ---------------------------------------------------------------------------
drop policy if exists "deals_insert_buyer" on public.escrow_deals;
drop policy if exists "deals_update_buyer_or_mod" on public.escrow_deals;

drop policy if exists "deals_insert_staff" on public.escrow_deals;
create policy "deals_insert_staff"
  on public.escrow_deals for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "deals_update_staff" on public.escrow_deals;
create policy "deals_update_staff"
  on public.escrow_deals for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- 4. Conversations: participants are fixed once the thread exists.
-- ---------------------------------------------------------------------------
create or replace function public.guard_conversation_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_staff() then
    return new;
  end if;

  if new.buyer_id is distinct from old.buyer_id
     or new.broker_id is distinct from old.broker_id
     or new.listing_id is distinct from old.listing_id then
    raise exception 'conversation participants are fixed after creation';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_guard_identity on public.conversations;
create trigger conversations_guard_identity
  before update on public.conversations
  for each row execute function public.guard_conversation_identity();

-- ---------------------------------------------------------------------------
-- 6. Listings: a seller may only attribute a listing to a broker profile they
--    own. Unchanged broker_id values pass through so legacy rows stay editable.
-- ---------------------------------------------------------------------------
create or replace function public.guard_listing_broker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_staff() then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.broker_id is not distinct from old.broker_id then
    return new;
  end if;

  if new.broker_id is not null and not exists (
    select 1 from public.brokers b
    where b.id = new.broker_id and b.owner_id = new.owner_id
  ) then
    raise exception 'listings may only reference a broker profile owned by the seller';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_guard_broker on public.listings;
create trigger listings_guard_broker
  before insert or update on public.listings
  for each row execute function public.guard_listing_broker();

-- ---------------------------------------------------------------------------
-- 8. Support tickets: non-staff inserts are always the user's own voice.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_ticket_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_staff() then
    return new;
  end if;

  new.sender := 'user';
  return new;
end;
$$;

drop trigger if exists ticket_messages_stamp_sender on public.support_ticket_messages;
create trigger ticket_messages_stamp_sender
  before insert on public.support_ticket_messages
  for each row execute function public.stamp_ticket_sender();

-- ---------------------------------------------------------------------------
-- Refresh PostgREST so policy changes are visible immediately.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- 1) New guards installed (expect offers_guard_insert, chat_messages_stamp_sender,
--    conversations_guard_identity, listings_guard_broker, ticket_messages_stamp_sender
--    alongside the 013/014 triggers).
select tgrelid::regclass as table_name, tgname
  from pg_trigger
 where not tgisinternal
   and tgrelid in (
     'public.offers'::regclass,
     'public.chat_messages'::regclass,
     'public.conversations'::regclass,
     'public.listings'::regclass,
     'public.support_ticket_messages'::regclass
   )
 order by 1, 2;

-- 2) Loose base policies are gone; chat/attachment/escrow policy sets are tight.
select tablename, policyname
  from pg_policies
 where schemaname = 'public'
   and tablename in ('chat_messages', 'message_attachments', 'escrow_deals')
 order by 1, 2;