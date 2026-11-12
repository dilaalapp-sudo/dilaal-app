-- DILAAL admin access: create admin user + remove MFA gate for testing
-- Run once in Supabase SQL Editor for project usrqtgobuylkhwblpjnb

-- ---------------------------------------------------------------------------
-- 1. Remove aal2 MFA requirement from is_staff / is_admin / is_moderator
--    This allows password-only login to access the admin panel.
-- ---------------------------------------------------------------------------
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

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'reviewer'), false);
$$;

-- ---------------------------------------------------------------------------
-- 2. Create admin profile if it doesn't exist
--    Sign up first at http://localhost:3000 with:
--    Email: admin@dilaal.test
--    Password: Admin123!
--    Then run this SQL to set the role to 'admin'
-- ---------------------------------------------------------------------------

-- Set existing admin@dilaal.test to admin role (run after sign-up)
update public.profiles
set role = 'admin'::public.user_role
where email = 'admin@dilaal.test';

-- If the profile doesn't exist yet, this RPC can create it via set_user_role
-- But first the user must sign up via the app. After sign-up, run:
-- select public.set_user_role('<auth_user_id>', 'admin');

-- ---------------------------------------------------------------------------
-- 3. Verify
-- ---------------------------------------------------------------------------
-- select id, email, raw_user_meta_data->>'role' as role
-- from auth.users
-- where email = 'admin@dilaal.test';
