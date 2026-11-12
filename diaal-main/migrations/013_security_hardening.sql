-- DILAAL security hardening (013)
-- Run once in the Supabase SQL editor for project usrqtgobuylkhwblpjnb.
-- Safe to re-run: functions/triggers/policies are replaced in place.
--
-- Context: the live database has 007 (chat) and 012 (storage) applied, but the
-- 008/010 hardening functions are missing (verified: REST RPC calls return
-- PGRST202 for prevent_profile_privilege_escalation, respond_offer,
-- guard_broker_verification, set_user_role, review_listing, ...). That leaves
-- role escalation, self-verification and offer tampering possible through the
-- public PostgREST API. This file closes those holes without re-introducing the
-- 008 policy that let any authenticated user insert audit_logs.
--
-- Service-role traffic (the admin server) and the SQL editor (postgres /
-- supabase_admin) are always allowed, so the admin panel keeps working and
-- manual admin provisioning from the SQL editor still works.

-- ---------------------------------------------------------------------------
-- 1. Profiles: role and suspension are server-owned, on insert and update
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A self-deleted profile must not come back as admin/reviewer.
    new.role := 'buyer';
    new.is_suspended := false;
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
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- 2. Brokers: verification badge and trust stats are staff-issued
-- ---------------------------------------------------------------------------
create or replace function public.guard_broker_trust()
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

  if tg_op = 'INSERT' then
    new.verification_status := 'not_submitted';
    new.rating := 0;
    new.reviews_count := 0;
    new.deals := 0;
    new.trust_score := 0;
    new.tier := null;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.rating is distinct from old.rating
     or new.reviews_count is distinct from old.reviews_count
     or new.deals is distinct from old.deals
     or new.trust_score is distinct from old.trust_score
     or new.tier is distinct from old.tier then
    raise exception 'broker verification and trust stats are server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists brokers_guard_trust on public.brokers;
create trigger brokers_guard_trust
  before insert or update on public.brokers
  for each row execute function public.guard_broker_trust();

-- ---------------------------------------------------------------------------
-- 3. Listings: owners cannot self-verify, self-inflate reports, or undo
--    a moderator flag / removal.
-- ---------------------------------------------------------------------------
create or replace function public.guard_listing_integrity()
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

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.verification_status := 'not_submitted';
    new.verified_label := null;
    new.reports_count := 0;
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.verification_status is distinct from old.verification_status
     or new.verified_label is distinct from old.verified_label
     or new.reports_count is distinct from old.reports_count then
    raise exception 'listing verification fields are server-managed';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'listing owner cannot be reassigned';
  end if;

  if new.moderation_status is distinct from old.moderation_status
     and old.moderation_status in ('flagged', 'removed', 'under_review') then
    raise exception 'moderation status is server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_guard_integrity on public.listings;
create trigger listings_guard_integrity
  before insert or update on public.listings
  for each row execute function public.guard_listing_integrity();

-- ---------------------------------------------------------------------------
-- 4. Offers: terms are immutable; only the counterparty may respond
-- ---------------------------------------------------------------------------
create or replace function public.guard_offer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender public.chat_sender;
  v_buyer uuid;
  v_broker_owner uuid;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or public.is_staff() then
    return new;
  end if;

  if new.proposed_price is distinct from old.proposed_price
     or new.original_price is distinct from old.original_price
     or new.currency is distinct from old.currency
     or new.deposit_amount is distinct from old.deposit_amount
     or new.discount_percent is distinct from old.discount_percent
     or new.escrow_terms is distinct from old.escrow_terms
     or new.title_guarantee is distinct from old.title_guarantee
     or new.asset_subject is distinct from old.asset_subject
     or new.expiry_time is distinct from old.expiry_time
     or new.version is distinct from old.version
     or new.message_id is distinct from old.message_id
     or new.listing_id is distinct from old.listing_id
     or new.broker_id is distinct from old.broker_id then
    raise exception 'offer terms are immutable; send a counter-offer instead';
  end if;

  if new.status is distinct from old.status then
    select m.sender, c.buyer_id, b.owner_id
      into v_sender, v_buyer, v_broker_owner
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
      left join public.brokers b on b.id = c.broker_id
     where m.id = old.message_id;

    if v_sender = 'user' and auth.uid() is distinct from v_broker_owner then
      raise exception 'only the broker can respond to this offer';
    end if;
    if v_sender = 'broker' and auth.uid() is distinct from v_buyer then
      raise exception 'only the buyer can respond to this offer';
    end if;
    if new.status::text not in ('accepted', 'declined', 'countered', 'expired') then
      raise exception 'invalid offer status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists offers_guard_update on public.offers;
create trigger offers_guard_update
  before update on public.offers
  for each row execute function public.guard_offer_update();

-- ---------------------------------------------------------------------------
-- 5. Reports: server-stamped reporter, authenticated submissions only
-- ---------------------------------------------------------------------------
create or replace function public.stamp_report_reporter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Client inserts are stamped; server/service inserts keep their explicit value.
  if auth.uid() is not null then
    new.reporter_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists reports_stamp_reporter on public.reports;
create trigger reports_stamp_reporter
  before insert on public.reports
  for each row execute function public.stamp_report_reporter();

drop policy if exists "reports_anyone_insert" on public.reports;

-- ---------------------------------------------------------------------------
-- 6. Deed evidence: only the listing owner and staff may read it
-- ---------------------------------------------------------------------------
drop policy if exists "evidence_select_visible" on public.listing_verification_evidence;
drop policy if exists "evidence_select_owner_or_staff" on public.listing_verification_evidence;
create policy "evidence_select_owner_or_staff"
  on public.listing_verification_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.owner_id = auth.uid() or public.is_staff())
    )
  );

-- ---------------------------------------------------------------------------
-- Verification (run after applying; all four should return rows)
-- ---------------------------------------------------------------------------
-- select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal;
-- select tgname from pg_trigger where tgrelid = 'public.brokers'::regclass and not tgisinternal;
-- select tgname from pg_trigger where tgrelid = 'public.listings'::regclass and not tgisinternal;
-- select tgname from pg_trigger where tgrelid = 'public.offers'::regclass and not tgisinternal;
