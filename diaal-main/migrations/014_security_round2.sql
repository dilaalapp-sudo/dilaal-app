-- DILAAL security hardening round 2 (014)
-- Run once in the Supabase SQL editor for project usrqtgobuylkhwblpjnb,
-- after 013_security_hardening.sql. Safe to re-run.
--
-- Closes the residual findings from the 2026-11-07 audit:
--   3. chat counterparts could read the whole profile row (phone, email)
--   4. exact coordinates and unverified registry numbers exposed to callers
--   5. anyone could self-register a broker and set arbitrary license details
--   6. listing owners could insert "approved" deed evidence
--   7. no throttling on reports / listings
--   8. users could delete their own profile and cascade chat history away
--   9. broker license numbers were self-asserted (now staff-only)
--
-- Requires the client change that reads public.chat_profiles instead of
-- public.profiles for counterpart display names.

-- ---------------------------------------------------------------------------
-- 3. Profiles: only self / moderator / staff; counterparts get a two-column
--    view (id, full_name) that cannot expose phone or email.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_read_chat_counterparts" on public.profiles;

drop view if exists public.chat_profiles;
create view public.chat_profiles
with (security_invoker = false) as
  select p.id, p.full_name
  from public.profiles p
  where p.id = auth.uid()
     or exists (
       select 1
       from public.conversations c
       join public.brokers b on b.id = c.broker_id
       where (c.buyer_id = auth.uid() and b.owner_id = p.id)
          or (c.buyer_id = p.id and b.owner_id = auth.uid())
     );

-- The view runs as its owner (postgres), so the WHERE above is the access
-- control. It exposes exactly two columns and nothing else.
revoke all on public.chat_profiles from anon, authenticated;
grant select on public.chat_profiles to authenticated;

comment on view public.chat_profiles is
  'Display names for chat counterparts. Deliberately security definer: it must replace the table-level select that used to leak phone/email.';

-- ---------------------------------------------------------------------------
-- 4. Listings: fuzz coordinates to ~110 m; unverified deed numbers stay in
--    the evidence table until staff approval
-- ---------------------------------------------------------------------------
create or replace function public.fuzz_listing_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- 3 decimal places ≈ 110 m in Somalia: enough for maps, not for a doorstep.
  if new.lat is not null then
    new.lat := round(new.lat, 3);
  end if;
  if new.lng is not null then
    new.lng := round(new.lng, 3);
  end if;
  return new;
end;
$$;

drop trigger if exists listings_fuzz_location on public.listings;
create trigger listings_fuzz_location
  before insert or update on public.listings
  for each row execute function public.fuzz_listing_location();

-- Backfill existing rows (also rounded for the owner's own map).
update public.listings
   set lat = round(lat, 3),
       lng = round(lng, 3)
 where lat is not null or lng is not null;

-- Strip deed references that were stored before the guard existed; they live
-- in the evidence table until staff approve the listing.
update public.listings
   set registry_number = null
 where registry_number is not null
   and verification_status <> 'approved';

-- Deed references are stored in the evidence table on submission. The listing
-- row only carries a registry number once staff approve it, so unverified
-- seller-entered numbers never appear in the public catalog payload.
create or replace function public.guard_listing_registry()
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
    new.registry_number := null;
    return new;
  end if;

  if new.registry_number is distinct from old.registry_number then
    raise exception 'registry number is set by DILAAL after verification';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_guard_registry on public.listings;
create trigger listings_guard_registry
  before insert or update on public.listings
  for each row execute function public.guard_listing_registry();

-- When staff approve a listing, copy the deed reference they reviewed from
-- the evidence row so the trust badge keeps working.
create or replace function public.stamp_verified_registry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'approved'
     and new.registry_number is null then
    select e.registry_number into new.registry_number
      from public.listing_verification_evidence e
     where e.listing_id = new.id
       and e.registry_number is not null
     order by e.created_at desc
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_stamp_registry on public.listings;
create trigger listings_stamp_registry
  before update on public.listings
  for each row execute function public.stamp_verified_registry();

-- ---------------------------------------------------------------------------
-- 5 + 9. Brokers: license details are staff-verified, never self-asserted.
-- ---------------------------------------------------------------------------
create or replace function public.guard_broker_license()
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
    new.license_number := null;
    new.license_authority := null;
    return new;
  end if;

  if new.license_number is distinct from old.license_number
     or new.license_authority is distinct from old.license_authority then
    raise exception 'license details are set by DILAAL after review';
  end if;
  return new;
end;
$$;

drop trigger if exists brokers_guard_license on public.brokers;
create trigger brokers_guard_license
  before insert or update on public.brokers
  for each row execute function public.guard_broker_license();

-- ---------------------------------------------------------------------------
-- 6. Evidence: owners submit, staff verify. Client writes are forced to
--    status 'submitted' with no reviewer fields.
-- ---------------------------------------------------------------------------
create or replace function public.guard_evidence_integrity()
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
    new.status := 'submitted';
    new.verified_by := null;
    new.verified_at := null;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.verified_by is distinct from old.verified_by
     or new.verified_at is distinct from old.verified_at then
    raise exception 'evidence verification fields are staff-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists evidence_guard_integrity on public.listing_verification_evidence;
create trigger evidence_guard_integrity
  before insert or update on public.listing_verification_evidence
  for each row execute function public.guard_evidence_integrity();

-- ---------------------------------------------------------------------------
-- 7. Abuse throttles (client traffic only; staff/service traffic is exempt)
-- ---------------------------------------------------------------------------
create or replace function public.throttle_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or auth.uid() is null then
    return new;
  end if;

  select count(*) into v_recent
    from public.reports
   where reporter_id = auth.uid()
     and created_at > now() - interval '1 hour';

  if v_recent >= 10 then
    raise exception 'report limit reached; try again later';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_throttle on public.reports;
create trigger reports_throttle
  before insert on public.reports
  for each row execute function public.throttle_reports();

create or replace function public.throttle_listings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
     or auth.uid() is null then
    return new;
  end if;

  select count(*) into v_recent
    from public.listings
   where owner_id = auth.uid()
     and created_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'listing limit reached; try again later';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_throttle on public.listings;
create trigger listings_throttle
  before insert on public.listings
  for each row execute function public.throttle_listings();

-- ---------------------------------------------------------------------------
-- 8. Profile deletion is a staff action; self-delete cascaded chats/offers away.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_delete_own_or_mod" on public.profiles;
drop policy if exists "profiles_delete_mod" on public.profiles;
create policy "profiles_delete_mod"
  on public.profiles for delete
  to authenticated
  using (public.is_moderator());

-- ---------------------------------------------------------------------------
-- Refresh PostgREST so the view and column grants are visible immediately.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verification (should return the rows described in the comments)
-- ---------------------------------------------------------------------------
-- 1) chat_profiles exists, anon cannot select it.
select table_name, privilege_type from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'chat_profiles'
 order by privilege_type;

-- 2) new triggers are installed.
select tgrelid::regclass as table_name, tgname
  from pg_trigger
 where not tgisinternal
   and tgrelid in (
     'public.listings'::regclass,
     'public.brokers'::regclass,
     'public.listing_verification_evidence'::regclass,
     'public.reports'::regclass
   )
 order by 1, 2;
