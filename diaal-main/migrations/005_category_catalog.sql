-- 005_category_catalog.sql
-- Make the admin-managed category catalog usable by every marketplace client.
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- It is idempotent: re-running it is safe.

-- 1) Guests must be able to read the active category catalog.
--    The original policy was scoped TO authenticated, so anon visitors (the
--    marketplace and the Expo client) received an empty list.
drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

-- 2) Listings may belong to any admin-managed category slug, not only the
--    five values that were baked into the listing_category enum.
alter table public.listings alter column category drop default;
alter table public.listings alter column category type text using category::text;
alter table public.listings alter column category set default 'house';
