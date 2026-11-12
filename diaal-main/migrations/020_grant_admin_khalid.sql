-- Grant admin access for the specified account.
-- Prerequisites:
--   1) The user must already exist in Supabase Auth (sign up / create user) with the intended password.
--   2) A matching row must exist in public.profiles for that auth user.
-- Run in Supabase SQL Editor for project usrqtgobuylkhwblpjnb.

-- Ensure profile role is admin (and not suspended) for this email.
update public.profiles
set role = 'admin'::public.user_role,
    is_suspended = false
where lower(email) = lower('khalidandmaxamed@gmail.com');

-- Verify:
-- select id, email, role, is_suspended from public.profiles where lower(email)=lower('khalidandmaxamed@gmail.com');
-- If no rows are returned, create/sign up the auth user first, then ensure a profile row exists and rerun.
