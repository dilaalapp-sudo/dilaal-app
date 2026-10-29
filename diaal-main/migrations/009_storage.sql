-- DILAAL storage buckets and policies.
--
-- Run after 008_persistence.sql, once, in the Supabase SQL editor.
-- Safe to re-run.
--
-- Path conventions (enforced below):
--   listing-photos/<userId>/<uuid>.<ext>       public read
--   avatars/<userId>/<uuid>.<ext>              public read
--   chat-attachments/<conversationId>/<uuid>.<ext>   participants only

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 8388608,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('avatars', 'avatars', true, 4194304,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('chat-attachments', 'chat-attachments', false, 20971520,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
         'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- public buckets: anyone can read, owners write inside their own folder
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
-- chat attachments: only the two participants of that conversation
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
create policy "chat_attachments_uploader_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-attachments' and owner = auth.uid());
