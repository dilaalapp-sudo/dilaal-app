-- DILAAL admin moderation layer: staff user directory, role changes.
--
-- Run once in the Supabase SQL editor, after 008_persistence.sql.
-- Safe to re-run: policies and functions are redefined in place.
--
-- Suspension and listing removal already live in 008 (set_user_suspension,
-- remove_listing). This file adds the read model the admin screen needs and
-- the role-change RPC, both gated by public.is_staff()/public.is_admin().

-- ---------------------------------------------------------------------------
-- profiles: staff can read the whole directory for moderation
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_staff_read" on public.profiles;
create policy "profiles_staff_read" on public.profiles
  for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- user directory for the admin screen (returns nothing for non-staff)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  full_name text,
  role text,
  suspended boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(p.full_name, ''),
    coalesce(p.role, 'user'),
    coalesce(p.is_suspended, false),
    p.created_at
  from public.profiles p
  where public.is_staff()
  order by p.created_at desc
  limit 200;
$$;

-- ---------------------------------------------------------------------------
-- role changes: administrators only, never on their own account
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(
  p_user_id uuid,
  p_role text
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
    raise exception 'you cannot change your own role';
  end if;
  if p_role not in ('guest', 'user', 'broker', 'reviewer', 'admin') then
    raise exception 'invalid role %', p_role;
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, notes)
  values (auth.uid(), 'user', p_user_id, 'role_changed:' || p_role, '');
end;
$$;
