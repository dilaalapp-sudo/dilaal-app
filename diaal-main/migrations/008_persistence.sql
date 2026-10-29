-- DILAAL persistence layer: favorites, saved searches, notifications, read
-- receipts, broker reviews, escrow deals and call logs.
--
-- Run once in the Supabase SQL editor, after 007_real_chat.sql.
-- Safe to re-run: every object is created with IF NOT EXISTS or dropped first.
--
-- Design notes
--   * listing_id columns are intentionally NOT foreign keys: listings.id has
--     been created outside version control and its type cannot be assumed.
--   * every table is RLS-on and owner/participant scoped.
--   * state transitions that move money or trust (offers, verification,
--     reports, suspension) go through SECURITY DEFINER functions so the client
--     cannot forge them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'guest');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('reviewer', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_owner_read" on public.favorites;
create policy "favorites_owner_read" on public.favorites
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "favorites_owner_insert" on public.favorites;
create policy "favorites_owner_insert" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "favorites_owner_delete" on public.favorites;
create policy "favorites_owner_delete" on public.favorites
  for delete to authenticated using (user_id = auth.uid());

create index if not exists favorites_listing_idx on public.favorites (listing_id);

-- ---------------------------------------------------------------------------
-- saved searches
-- ---------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  query text not null default '',
  category text not null default 'all',
  min_price numeric(14, 2) not null default 0,
  max_price numeric(14, 2),
  country_code text not null default 'SO',
  location text not null default '',
  notify_on_match boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_owner_all" on public.saved_searches;
create policy "saved_searches_owner_all" on public.saved_searches
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- notifications (written by triggers only — clients can read/mark read)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'system',
  title text not null default '',
  body text not null default '',
  listing_id uuid,
  conversation_id uuid,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- read receipts (one row per conversation per participant)
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "conversation_reads_owner_read" on public.conversation_reads;
create policy "conversation_reads_owner_read" on public.conversation_reads
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "conversation_reads_participant_write" on public.conversation_reads;
create policy "conversation_reads_participant_write" on public.conversation_reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "conversation_reads_participant_update" on public.conversation_reads;
create policy "conversation_reads_participant_update" on public.conversation_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- broker reviews
-- ---------------------------------------------------------------------------
create table if not exists public.broker_reviews (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.brokers (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (broker_id, reviewer_id)
);

alter table public.broker_reviews enable row level security;

drop policy if exists "broker_reviews_public_read" on public.broker_reviews;
create policy "broker_reviews_public_read" on public.broker_reviews
  for select to anon, authenticated using (true);

drop policy if exists "broker_reviews_own_insert" on public.broker_reviews;
create policy "broker_reviews_own_insert" on public.broker_reviews
  for insert to authenticated with check (reviewer_id = auth.uid());

drop policy if exists "broker_reviews_own_update" on public.broker_reviews;
create policy "broker_reviews_own_update" on public.broker_reviews
  for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists "broker_reviews_own_delete" on public.broker_reviews;
create policy "broker_reviews_own_delete" on public.broker_reviews
  for delete to authenticated using (reviewer_id = auth.uid());

create index if not exists broker_reviews_broker_idx
  on public.broker_reviews (broker_id, created_at desc);

-- Keep the public rating aggregate in sync with the review rows.
create or replace function public.refresh_broker_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.broker_id, old.broker_id);
begin
  update public.brokers b
     set rating = coalesce(agg.avg_rating, 0),
         reviews_count = coalesce(agg.review_count, 0),
         deals = coalesce(b.deals, 0)
    from (
      select round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as review_count
        from public.broker_reviews
       where broker_id = target
    ) agg
   where b.id = target;
  return null;
end;
$$;

drop trigger if exists broker_reviews_aggregate on public.broker_reviews;
create trigger broker_reviews_aggregate
  after insert or update or delete on public.broker_reviews
  for each row execute function public.refresh_broker_rating();

-- ---------------------------------------------------------------------------
-- escrow deals
-- ---------------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_number text not null unique,
  listing_id uuid,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  broker_id uuid,
  asset_title text not null default '',
  asset_image text not null default '',
  asset_location text not null default '',
  asset_category text not null default '',
  agreed_price numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  deposit_amount numeric(14, 2) not null default 0,
  deposit_paid boolean not null default false,
  current_milestone integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled', 'disputed')),
  payment_channel text not null default 'mobile_money',
  payment_provider text not null default '',
  is_sandbox boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deals enable row level security;

drop policy if exists "deals_participants_read" on public.deals;
create policy "deals_participants_read" on public.deals
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.brokers b
      where b.id = deals.broker_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "deals_buyer_insert" on public.deals;
create policy "deals_buyer_insert" on public.deals
  for insert to authenticated with check (buyer_id = auth.uid());

drop policy if exists "deals_participants_update" on public.deals;
create policy "deals_participants_update" on public.deals
  for update to authenticated
  using (
    buyer_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.brokers b
      where b.id = deals.broker_id and b.owner_id = auth.uid()
    )
  )
  with check (
    buyer_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.brokers b
      where b.id = deals.broker_id and b.owner_id = auth.uid()
    )
  );

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create index if not exists deals_buyer_idx on public.deals (buyer_id, created_at desc);
create index if not exists deals_broker_idx on public.deals (broker_id, created_at desc);

create table if not exists public.deal_milestones (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  ordinal integer not null,
  title text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed')),
  evidence_url text,
  notes text,
  completed_at timestamptz,
  unique (deal_id, ordinal)
);

alter table public.deal_milestones enable row level security;

drop policy if exists "deal_milestones_participants_all" on public.deal_milestones;
create policy "deal_milestones_participants_all" on public.deal_milestones
  for all to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_milestones.deal_id
        and (
          d.buyer_id = auth.uid()
          or public.is_staff()
          or exists (
            select 1 from public.brokers b
            where b.id = d.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.deals d
      where d.id = deal_milestones.deal_id
        and (
          d.buyer_id = auth.uid()
          or public.is_staff()
          or exists (
            select 1 from public.brokers b
            where b.id = d.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- call log
-- ---------------------------------------------------------------------------
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  caller_id uuid not null references auth.users (id) on delete cascade,
  callee_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'audio' check (kind in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended', 'failed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer
);

alter table public.call_logs enable row level security;

drop policy if exists "call_logs_participant_read" on public.call_logs;
create policy "call_logs_participant_read" on public.call_logs
  for select to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid() or public.is_staff());

drop policy if exists "call_logs_caller_insert" on public.call_logs;
create policy "call_logs_caller_insert" on public.call_logs
  for insert to authenticated with check (caller_id = auth.uid());

drop policy if exists "call_logs_participant_update" on public.call_logs;
create policy "call_logs_participant_update" on public.call_logs
  for update to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid())
  with check (caller_id = auth.uid() or callee_id = auth.uid());

create index if not exists call_logs_caller_idx on public.call_logs (caller_id, started_at desc);
create index if not exists call_logs_callee_idx on public.call_logs (callee_id, started_at desc);

-- ---------------------------------------------------------------------------
-- push tokens
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_owner_all" on public.push_tokens;
create policy "push_tokens_owner_all" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- moderation trail
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  target_type text not null,
  target_id uuid,
  action text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;

drop policy if exists "moderation_actions_staff_read" on public.moderation_actions;
create policy "moderation_actions_staff_read" on public.moderation_actions
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- reports / audit log columns and ownership
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists reporter_id uuid;
alter table public.reports add column if not exists resolved_by uuid;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolution_notes text;

alter table public.audit_logs add column if not exists actor_id uuid;
alter table public.audit_logs add column if not exists target_id uuid;

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_anyone_insert" on public.reports;
create policy "reports_anyone_insert" on public.reports
  for insert to anon, authenticated with check (true);

drop policy if exists "reports_owner_or_staff_read" on public.reports;
create policy "reports_owner_or_staff_read" on public.reports
  for select to anon, authenticated
  using (reporter_id = auth.uid() or public.is_staff());

drop policy if exists "reports_staff_update" on public.reports;
create policy "reports_staff_update" on public.reports
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Reporter identity is server-owned so a client cannot file under someone else.
create or replace function public.stamp_report_reporter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reporter_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists reports_stamp_reporter on public.reports;
create trigger reports_stamp_reporter
  before insert on public.reports
  for each row execute function public.stamp_report_reporter();

-- Confirm receipt to the reporter; staff notifications come from moderation.
create or replace function public.notify_report_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reporter_id is not null then
    insert into public.notifications (user_id, kind, title, body)
    values (
      new.reporter_id,
      'report_received',
      'Report received',
      left(coalesce(new.target_title, ''), 140)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists reports_notify_reporter on public.reports;
create trigger reports_notify_reporter
  after insert on public.reports
  for each row execute function public.notify_report_created();

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_staff_read" on public.audit_logs;
create policy "audit_logs_staff_read" on public.audit_logs
  for select to authenticated using (public.is_staff());

drop policy if exists "audit_logs_authenticated_insert" on public.audit_logs;
create policy "audit_logs_authenticated_insert" on public.audit_logs
  for insert to authenticated with check (true);

-- Actor identity is server-owned: never trust the client-supplied role/email.
create or replace function public.stamp_audit_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
begin
  select p.full_name, p.role into me
    from public.profiles p where p.id = auth.uid();
  new.actor_id := auth.uid();
  new.actor_role := coalesce(me.role, 'buyer');
  new.actor_email := coalesce(me.full_name, 'unknown');
  return new;
end;
$$;

drop trigger if exists audit_logs_stamp_actor on public.audit_logs;
create trigger audit_logs_stamp_actor
  before insert on public.audit_logs
  for each row execute function public.stamp_audit_actor();

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- message attachments: storage path support
-- ---------------------------------------------------------------------------
alter table public.message_attachments add column if not exists storage_path text;
alter table public.message_attachments add column if not exists mime_type text;
alter table public.message_attachments add column if not exists updated_at timestamptz default now();

create index if not exists chat_messages_conversation_sent_idx
  on public.chat_messages (conversation_id, sent_at);

create index if not exists offers_message_idx on public.offers (message_id);
create index if not exists attachments_message_idx on public.message_attachments (message_id);
create index if not exists conversations_buyer_updated_idx
  on public.conversations (buyer_id, updated_at desc);
create index if not exists conversations_broker_updated_idx
  on public.conversations (broker_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- identity hardening: one broker row per owner (only when data allows it)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    create unique index if not exists brokers_owner_uidx
      on public.brokers (owner_id) where owner_id is not null;
  exception when unique_violation then
    raise notice 'brokers_owner_uidx skipped: duplicate owner_id rows exist; clean them and re-run.';
  end;
end $$;

-- Verification badges are issued by staff, never self-declared.
create or replace function public.guard_broker_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verification_status := 'submitted';
    return new;
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'broker verification changes require a reviewer';
  end if;
  return new;
end;
$$;

drop trigger if exists brokers_guard_verification on public.brokers;
create trigger brokers_guard_verification
  before insert or update on public.brokers
  for each row execute function public.guard_broker_verification();

-- ---------------------------------------------------------------------------
-- profiles: users edit their own row, but never their role or suspension
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'role changes require an administrator';
  end if;
  if new.is_suspended is distinct from old.is_suspended then
    raise exception 'suspension changes require an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- read receipt helper: unread counter for the caller
-- ---------------------------------------------------------------------------
create or replace function public.conversation_unread()
returns table (conversation_id uuid, unread integer)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, count(m.id)::int
    from public.conversations c
    left join public.conversation_reads r
      on r.conversation_id = c.id and r.user_id = auth.uid()
    join public.chat_messages m
      on m.conversation_id = c.id
     and m.sent_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
     and m.sender::text = case when c.buyer_id = auth.uid() then 'broker' else 'user' end
   where c.buyer_id = auth.uid()
      or exists (
        select 1 from public.brokers b
        where b.id = c.broker_id and b.owner_id = auth.uid()
      )
   group by c.id;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (
        c.buyer_id = auth.uid()
        or exists (
          select 1 from public.brokers b
          where b.id = c.broker_id and b.owner_id = auth.uid()
        )
      )
  ) then
    raise exception 'not a participant of this conversation';
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (p_conversation_id, auth.uid(), now())
  on conflict (conversation_id, user_id)
  do update set last_read_at = excluded.last_read_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- offers: only the counterparty may accept/decline, one offer at a time
-- ---------------------------------------------------------------------------
drop policy if exists "offers_participants_update" on public.offers;

create or replace function public.respond_offer(
  p_offer_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender public.chat_sender;
  v_conversation uuid;
  v_buyer uuid;
  v_broker_owner uuid;
  v_broker_id uuid;
  v_counterparty_ok boolean;
begin
  if p_status not in ('accepted', 'declined', 'countered') then
    raise exception 'invalid offer status %', p_status;
  end if;

  select m.sender, m.conversation_id, c.buyer_id, b.owner_id, c.broker_id
    into v_sender, v_conversation, v_buyer, v_broker_owner, v_broker_id
    from public.offers o
    join public.chat_messages m on m.id = o.message_id
    join public.conversations c on c.id = m.conversation_id
    left join public.brokers b on b.id = c.broker_id
   where o.id = p_offer_id;

  if v_conversation is null then
    raise exception 'offer not found';
  end if;

  if auth.uid() is distinct from v_buyer and auth.uid() is distinct from v_broker_owner then
    raise exception 'not a participant of this offer';
  end if;

  -- The party that proposed cannot also accept/decline it.
  v_counterparty_ok :=
    case
      when v_sender = 'user' then auth.uid() = v_broker_owner
      when v_sender = 'broker' then auth.uid() = v_buyer
      else false
    end;

  if not v_counterparty_ok then
    raise exception 'only the counterparty can respond to this offer';
  end if;

  update public.offers
     set status = p_status
   where id = p_offer_id;

  if p_status = 'accepted' then
    update public.offers o
       set status = 'declined'
      from public.chat_messages m
     where m.id = o.message_id
       and m.conversation_id = v_conversation
       and o.id <> p_offer_id
       and o.status = 'active';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- verification + moderation (staff only)
-- ---------------------------------------------------------------------------
create or replace function public.review_listing(
  p_listing_id uuid,
  p_status text,
  p_notes text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'reviewer role required';
  end if;
  if p_status not in ('in_review', 'more_info_required', 'approved', 'rejected', 'revoked') then
    raise exception 'invalid verification status %', p_status;
  end if;

  update public.listings
     set verification_status = p_status,
         is_verified = p_status = 'approved',
         moderation_status = case
           when p_status = 'approved' then 'published'
           when p_status = 'rejected' then 'flagged'
           else 'under_review'
         end,
         verified_label = case
           when p_status = 'approved' then 'Deed Verified'
           else 'Status: ' || p_status
         end,
         updated_at = now()
   where id = p_listing_id;

  insert into public.audit_logs (action, actor_role, actor_email, target_entity, target_id, details)
  values ('LISTING_VERIFICATION', public.current_role()::text, '', 'listing', p_listing_id,
          coalesce(p_notes, '') || ' -> ' || p_status);

  insert into public.moderation_actions (actor_id, target_type, target_id, action, notes)
  values (auth.uid(), 'listing', p_listing_id, p_status, coalesce(p_notes, ''));

  if p_status = 'approved' then
    declare
      v_owner uuid;
      v_title text;
    begin
      select coalesce(owner_id, created_by), title into v_owner, v_title
        from public.listings where id = p_listing_id;
      if v_owner is not null then
        insert into public.notifications (user_id, kind, title, body, listing_id)
        values (v_owner, 'listing_approved', '', coalesce(v_title, ''), p_listing_id);
      end if;
    end;
  end if;
end;
$$;

create or replace function public.remove_listing(
  p_listing_id uuid,
  p_notes text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'reviewer role required';
  end if;

  update public.listings
     set moderation_status = 'removed', updated_at = now()
   where id = p_listing_id;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, notes)
  values (auth.uid(), 'listing', p_listing_id, 'removed', coalesce(p_notes, ''));

  insert into public.audit_logs (action, actor_role, actor_email, target_entity, target_id, details)
  values ('LISTING_REMOVED', public.current_role()::text, '', 'listing', p_listing_id, coalesce(p_notes, ''));
end;
$$;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_status text,
  p_notes text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'reviewer role required';
  end if;
  if p_status not in ('in_review', 'resolved', 'dismissed') then
    raise exception 'invalid report status %', p_status;
  end if;

  update public.reports
     set status = p_status,
         resolved_by = auth.uid(),
         resolved_at = now(),
         resolution_notes = p_notes
   where id = p_report_id;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, notes)
  values (auth.uid(), 'report', p_report_id, p_status, coalesce(p_notes, ''));
end;
$$;

create or replace function public.set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_notes text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'administrator role required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot suspend your own account';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user_id;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, notes)
  values (auth.uid(), 'user', p_user_id,
          case when p_suspended then 'suspended' else 'reinstated' end,
          coalesce(p_notes, ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- notifications from chat + offers (server-side so they cannot be forged)
-- ---------------------------------------------------------------------------
create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_broker_owner uuid;
  v_recipient uuid;
begin
  select c.buyer_id, b.owner_id into v_buyer, v_broker_owner
    from public.conversations c
    left join public.brokers b on b.id = c.broker_id
   where c.id = new.conversation_id;

  v_recipient := case
    when new.sender = 'user' then v_broker_owner
    when new.sender = 'broker' then v_buyer
    else null
  end;

  if v_recipient is not null and v_recipient <> auth.uid() then
    insert into public.notifications (user_id, kind, title, body, conversation_id, data)
    values (
      v_recipient,
      case when new.is_audio then 'chat_voice' else 'chat_message' end,
      coalesce(new.sender_name, ''),
      left(coalesce(new.body, ''), 140),
      new.conversation_id,
      jsonb_build_object('message_id', new.id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists chat_messages_notify on public.chat_messages;
create trigger chat_messages_notify
  after insert on public.chat_messages
  for each row execute function public.notify_chat_message();

create or replace function public.notify_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_broker_owner uuid;
  v_sender public.chat_sender;
  v_recipient uuid;
begin
  select c.buyer_id, b.owner_id, m.sender
    into v_buyer, v_broker_owner, v_sender
    from public.chat_messages m
    join public.conversations c on c.id = m.conversation_id
    left join public.brokers b on b.id = c.broker_id
   where m.id = new.message_id;

  v_recipient := case
    when v_sender = 'user' then v_broker_owner
    when v_sender = 'broker' then v_buyer
    else null
  end;

  if v_recipient is not null then
    insert into public.notifications (user_id, kind, title, body, data)
    values (v_recipient, 'offer', '', coalesce(new.asset_subject, ''), jsonb_build_object('offer_id', new.id));
  end if;
  return null;
end;
$$;

drop trigger if exists offers_notify on public.offers;
create trigger offers_notify
  after insert on public.offers
  for each row execute function public.notify_offer();

-- ---------------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'favorites', 'conversation_reads', 'deals', 'broker_reviews'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
