-- DILAAL real chat: policies, uniqueness and realtime for the existing
-- conversations / chat_messages / offers / message_attachments schema.
--
-- Identity model:
--   brokers.owner_id      = auth user id of the broker (profiles.id)
--   conversations.broker_id = brokers.id
--   conversations.buyer_id  = profiles.id (auth user id of the buyer)
--   chat_messages.conversation_id = conversations.id
--
-- Run once in the Supabase SQL editor for project usrqtgobuylkhwblpjnb.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- broker directory: readable, and each user may own exactly one broker row
-- ---------------------------------------------------------------------------
alter table public.brokers enable row level security;

drop policy if exists "brokers_read_public" on public.brokers;
create policy "brokers_read_public"
  on public.brokers for select
  to anon, authenticated
  using (true);

drop policy if exists "brokers_owner_insert" on public.brokers;
create policy "brokers_owner_insert"
  on public.brokers for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "brokers_owner_update" on public.brokers;
create policy "brokers_owner_update"
  on public.brokers for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- conversations: only the buyer or the owning broker may read / update
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;

drop policy if exists "conversations_participants_read" on public.conversations;
create policy "conversations_participants_read"
  on public.conversations for select
  to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.brokers b
      where b.id = conversations.broker_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "conversations_buyer_insert" on public.conversations;
create policy "conversations_buyer_insert"
  on public.conversations for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "conversations_participants_update" on public.conversations;
create policy "conversations_participants_update"
  on public.conversations for update
  to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.brokers b
      where b.id = conversations.broker_id and b.owner_id = auth.uid()
    )
  )
  with check (
    buyer_id = auth.uid()
    or exists (
      select 1 from public.brokers b
      where b.id = conversations.broker_id and b.owner_id = auth.uid()
    )
  );

-- one conversation per (listing, buyer)
create unique index if not exists conversations_listing_buyer_uidx
  on public.conversations (listing_id, buyer_id)
  where listing_id is not null;

-- ---------------------------------------------------------------------------
-- chat_messages: read by participants; author must be the buyer or the broker
-- ---------------------------------------------------------------------------
alter table public.chat_messages enable row level security;

-- Remove policies from the earlier (incompatible) migration attempt, if any.
drop policy if exists "chat_readable_by_participants" on public.chat_messages;
drop policy if exists "chat_insert_own_buyer_message" on public.chat_messages;

drop policy if exists "chat_messages_participants_read" on public.chat_messages;
create policy "chat_messages_participants_read"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
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

drop policy if exists "chat_messages_participants_insert" on public.chat_messages;
create policy "chat_messages_participants_insert"
  on public.chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = chat_messages.conversation_id
        and (
          (chat_messages.sender = 'user'::public.chat_sender and c.buyer_id = auth.uid())
          or (
            chat_messages.sender = 'system'::public.chat_sender
            and (
              c.buyer_id = auth.uid()
              or exists (
                select 1 from public.brokers b
                where b.id = c.broker_id and b.owner_id = auth.uid()
              )
            )
          )
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

-- ---------------------------------------------------------------------------
-- offers: participants of the parent message's conversation
-- ---------------------------------------------------------------------------
alter table public.offers enable row level security;

drop policy if exists "offers_participants_read" on public.offers;
create policy "offers_participants_read"
  on public.offers for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = offers.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "offers_participants_insert" on public.offers;
create policy "offers_participants_insert"
  on public.offers for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = offers.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "offers_participants_update" on public.offers;
create policy "offers_participants_update"
  on public.offers for update
  to authenticated
  using (
    exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = offers.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = offers.message_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- message_attachments: participants of the parent message's conversation
-- ---------------------------------------------------------------------------
alter table public.message_attachments enable row level security;

drop policy if exists "attachments_participants_read" on public.message_attachments;
create policy "attachments_participants_read"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
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
    exists (
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

-- ---------------------------------------------------------------------------
-- profiles: participants may read each other's display name
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_read_chat_counterparts" on public.profiles;
create policy "profiles_read_chat_counterparts"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where (
        c.buyer_id = profiles.id
        and exists (
          select 1 from public.brokers b
          where b.id = c.broker_id and b.owner_id = auth.uid()
        )
      )
      or (
        c.buyer_id = auth.uid()
        and exists (
          select 1 from public.brokers b
          where b.id = c.broker_id and b.owner_id = profiles.id
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- realtime: broadcast inserts so both sides update live
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['conversations', 'chat_messages', 'offers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
