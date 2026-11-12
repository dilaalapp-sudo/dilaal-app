-- DILAAL storage + chat attachment fix (buckets, policies, missing columns).
-- Paste this whole file into the Supabase SQL editor once. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('avatars', 'avatars', true, 4194304,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 20971520,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
         'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm']),
  ('verification-docs', 'verification-docs', false, 20971520,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. message_attachments columns used by the app for storage paths and audio
-- ---------------------------------------------------------------------------
alter table public.message_attachments add column if not exists storage_path text;
alter table public.message_attachments add column if not exists mime_type text;
alter table public.message_attachments add column if not exists updated_at timestamptz default now();

create index if not exists attachments_message_idx
  on public.message_attachments (message_id);

-- ---------------------------------------------------------------------------
-- 3. Role helpers used by the storage policies
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

-- ---------------------------------------------------------------------------
-- 4. Public buckets: anyone reads, owners write inside their own folder
-- ---------------------------------------------------------------------------
drop policy if exists "public_buckets_read" on storage.objects;
create policy "public_buckets_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('listing-photos', 'avatars'));

drop policy if exists "public_buckets_owner_insert" on storage.objects;
create policy "public_buckets_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public_buckets_owner_update" on storage.objects;
create policy "public_buckets_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public_buckets_owner_delete" on storage.objects;
create policy "public_buckets_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('listing-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 5. Chat attachments: only the two participants of that conversation
-- ---------------------------------------------------------------------------
drop policy if exists "chat_attachments_participant_read" on storage.objects;
create policy "chat_attachments_participant_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "chat_attachments_participant_insert" on storage.objects;
create policy "chat_attachments_participant_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (
          c.buyer_id = auth.uid()
          or exists (
            select 1 from public.brokers b
            where b.id = c.broker_id and b.owner_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "chat_attachments_uploader_delete" on storage.objects;
drop policy if exists "chat_attachments_participant_delete" on storage.objects;
create policy "chat_attachments_participant_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
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
-- 6. Verification documents: uploader + staff only
-- ---------------------------------------------------------------------------
drop policy if exists "verification_docs_owner_write" on storage.objects;
create policy "verification_docs_owner_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_read" on storage.objects;
create policy "verification_docs_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

drop policy if exists "verification_docs_owner_delete" on storage.objects;
create policy "verification_docs_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );
