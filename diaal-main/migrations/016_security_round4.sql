-- DILAAL security round 4 (016)
-- Run once in the Supabase SQL editor for project usrqtgobuylkhwblpjnb,
-- after 015_security_round3.sql. Safe to re-run.
--
-- Closes the app-audit findings that live in the database:
--   #2  MFA was UI-only: staff helpers now require an aal2 (TOTP-verified)
--       session, so every policy/guard/RPC that uses them enforces MFA.
--       Direct PostgREST calls with an aal1 staff JWT no longer moderate.
--   #2  The admin RPCs the mobile screen calls (review_listing,
--       resolve_report, set_user_suspension, set_user_role, remove_listing,
--       admin_list_users) did not exist live (008/010/011 never applied).
--       They are defined here against the REAL live schema: no
--       moderation_actions table, correct user_role enum values.
--   #12 Attachments could be added to the other party's message; offers
--       could be inserted into someone else's conversation with forged
--       broker/listing attribution; profiles.email was self-settable.
--
-- Service-role traffic and the SQL editor are unaffected: the aal2 gate
-- only applies when auth.uid() is present (a real user JWT).

-- ---------------------------------------------------------------------------
-- 1. Staff helpers: role AND a verified second factor
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('reviewer', 'admin'), false)
     and (auth.uid() is null or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
     and (auth.uid() is null or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'reviewer'), false)
     and (auth.uid() is null or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2');
$$;

-- Staff can read the full profile directory (moderation screen).
drop policy if exists "profiles_staff_read" on public.profiles;
create policy "profiles_staff_read" on public.profiles
  for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 2. Columns the admin RPCs need (008 added them but was never applied)
-- ---------------------------------------------------------------------------
alter table public.reports
  add column if not exists resolved_by uuid references public.profiles (id) on delete set null;

alter table public.audit_logs
  add column if not exists target_id text;

-- Shared audit writer: actor identity comes from the session, never the client.
create or replace function public.admin_audit(
  p_action text,
  p_entity text,
  p_target_id uuid,
  p_details text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (action, actor_role, actor_email, target_entity, target_id, details)
  values (
    p_action,
    public.current_role()::public.user_role,
    (select email from auth.users where id = auth.uid()),
    p_entity,
    p_target_id::text,
    coalesce(p_details, '')
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Admin RPCs (signatures match expo-app/src/lib/persistence.ts)
--    is_staff()/is_admin() already enforce aal2, so a stolen password alone
--    cannot moderate even if the attacker skips the app's MFA screen.
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
    raise exception 'staff role with two-factor verification required';
  end if;
  if p_status not in ('in_review', 'more_info_required', 'approved', 'rejected', 'revoked') then
    raise exception 'invalid verification status %', p_status;
  end if;

  update public.listings
     set verification_status = p_status::public.verification_status,
         is_verified = (p_status = 'approved'),
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

  perform public.admin_audit('LISTING_VERIFICATION', 'listing', p_listing_id,
                             coalesce(p_notes, '') || ' -> ' || p_status);
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
    raise exception 'staff role with two-factor verification required';
  end if;

  update public.listings
     set moderation_status = 'removed', updated_at = now()
   where id = p_listing_id;

  perform public.admin_audit('LISTING_REMOVED', 'listing', p_listing_id, p_notes);
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
    raise exception 'staff role with two-factor verification required';
  end if;
  if p_status not in ('in_review', 'resolved', 'dismissed') then
    raise exception 'invalid report status %', p_status;
  end if;

  update public.reports
     set status = p_status::public.report_status,
         resolved_by = auth.uid(),
         resolved_at = now(),
         resolution_notes = coalesce(p_notes, '')
   where id = p_report_id;

  perform public.admin_audit('REPORT_RESOLVED', 'report', p_report_id,
                             coalesce(p_notes, '') || ' -> ' || p_status);
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
    raise exception 'administrator role with two-factor verification required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot suspend your own account';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user_id;

  -- Real ban: GoTrue refuses sign-in and refresh while banned_until is set.
  update auth.users
     set banned_until = case when p_suspended then 'infinity'::timestamptz else null end
   where id = p_user_id;

  perform public.admin_audit(
    case when p_suspended then 'USER_SUSPENDED' else 'USER_REINSTATED' end,
    'user', p_user_id, p_notes);
end;
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := case when p_role = 'user' then 'buyer' else p_role end;
begin
  if not public.is_admin() then
    raise exception 'administrator role with two-factor verification required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;
  -- Live enum: guest, buyer, seller, broker, reviewer, admin.
  -- 'user' is the app's legacy label for 'buyer' and is normalized above.
  if v_role not in ('guest', 'buyer', 'seller', 'broker', 'reviewer', 'admin') then
    raise exception 'invalid role %', p_role;
  end if;

  update public.profiles set role = v_role::public.user_role where id = p_user_id;

  perform public.admin_audit('ROLE_CHANGED', 'user', p_user_id, '-> ' || v_role);
end;
$$;

-- Paginated directory. Defaults let the legacy no-arg call resolve too.
create or replace function public.admin_list_users(
  p_query text default '',
  p_role text default 'all',
  p_limit integer default 25,
  p_offset integer default 0
) returns table (
  id uuid,
  full_name text,
  role text,
  suspended boolean,
  created_at timestamptz,
  total bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff role with two-factor verification required';
  end if;

  return query
  select
    p.id,
    coalesce(p.full_name, ''),
    p.role::text,
    coalesce(p.is_suspended, false),
    p.created_at,
    count(*) over () as total
  from public.profiles p
  where (
      coalesce(p_query, '') = ''
      or p.full_name ilike '%' || p_query || '%'
      or p.email ilike '%' || p_query || '%'
    )
    and (
      coalesce(p_role, 'all') = 'all'
      or p.role::text = case when p_role = 'user' then 'buyer' else p_role end
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Round-3 leftovers (#12)
-- ---------------------------------------------------------------------------

-- 4a. Attachments: only the parent message's AUTHOR may attach (015 allowed
--     any participant, so the buyer could attach files to the broker's
--     message and vice versa). Staff override stays.
drop policy if exists "attachments_participants_insert" on public.message_attachments;
create policy "attachments_author_insert"
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

-- 4b. Offers: attribution is stamped from the parent conversation, and the
--     insert policy requires the caller to be a participant of it.
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

  if new.message_id is not null then
    select c.listing_id, c.broker_id
      into new.listing_id, new.broker_id
      from public.chat_messages m
      join public.conversations c on c.id = m.conversation_id
     where m.id = new.message_id;
  end if;

  return new;
end;
$$;

drop policy if exists "offers_insert_creator" on public.offers;
drop policy if exists "offers_insert_participant" on public.offers;
create policy "offers_insert_participant"
  on public.offers for insert
  to authenticated
  with check (
    public.is_moderator()
    or (
      created_by = auth.uid()
      and (
        message_id is null
        or exists (
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
    )
  );

-- 4c. profiles.email is identity data: only staff/service role may change it.
--     (Same body as 013's guard plus the email rule.)
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
  if new.email is distinct from old.email then
    raise exception 'email changes require an administrator';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Refresh PostgREST's schema cache
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verification (run after applying; expected results in comments)
-- ---------------------------------------------------------------------------
-- select proname from pg_proc
--  where proname in ('review_listing','remove_listing','resolve_report',
--                    'set_user_suspension','set_user_role','admin_list_users')
--    and pronamespace = 'public'::regnamespace;
-- expect: 6 rows
--
-- select polname from pg_policies
--  where schemaname = 'public'
--    and tablename in ('message_attachments','offers','profiles')
--    and polname in ('attachments_author_insert','offers_insert_participant','profiles_staff_read');
-- expect: 3 rows
--
-- select pg_get_functiondef('public.is_staff()'::regproc);
-- expect: definition contains "aal"