-- DILAAL web push subscriptions table
-- Store web push subscriptions for browser-based push notifications.
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "web_push_subscriptions_owner_all" on public.web_push_subscriptions;
create policy "web_push_subscriptions_owner_all"
  on public.web_push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists web_push_subscriptions_user_idx
  on public.web_push_subscriptions (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger web_push_subscriptions_updated_at
  before update on public.web_push_subscriptions
  for each row execute function public.set_updated_at();
