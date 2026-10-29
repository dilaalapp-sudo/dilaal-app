-- DILAAL admin operations: searchable directory, moderation metrics,
-- verification evidence documents, and audit query indexes.
--
-- Run once in the Supabase SQL editor, after 008 and 010. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. User directory: search, role filter, real pagination
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users(
  p_query text default '',
  p_role text default 'all',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  full_name text,
  role text,
  suspended boolean,
  created_at timestamptz,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select
      p.id,
      coalesce(p.full_name, '') as full_name,
      coalesce(p.role, 'user') as role,
      coalesce(p.is_suspended, false) as suspended,
      p.created_at
    from public.profiles p
    where public.is_staff()
      and (
        coalesce(p_query, '') = ''
        or coalesce(p.full_name, '') ilike '%' || p_query || '%'
        or p.id::text = trim(coalesce(p_query, ''))
      )
      and (p_role = 'all' or coalesce(p.role, 'user') = p_role)
  )
  select f.*, count(*) over() as total
  from filtered f
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- ---------------------------------------------------------------------------
-- 2. Queue counters for the admin header
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_staff() then null
    else jsonb_build_object(
      'pendingDeeds', (
        select count(*) from public.listings
        where verification_status in ('submitted', 'in_review')
      ),
      'pendingReports', (
        select count(*) from public.reports where status = 'pending'
      ),
      'suspendedUsers', (
        select count(*) from public.profiles where coalesce(is_suspended, false)
      )
    )
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Verification evidence documents
-- ---------------------------------------------------------------------------
create table if not exists public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  broker_id uuid references public.brokers(id) on delete set null,
  uploaded_by uuid,
  evidence_type text not null default 'title_deed',
  document_ref text not null default '',
  document_path text,
  mime_type text,
  file_size text,
  issuer_authority text not null default '',
  registry_number text,
  notes text,
  status text not null default 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_evidence_listing_idx
  on public.verification_evidence (listing_id, created_at desc);

alter table public.verification_evidence enable row level security;

drop policy if exists "evidence_staff_read" on public.verification_evidence;
create policy "evidence_staff_read" on public.verification_evidence
  for select to authenticated
  using (public.is_staff() or uploaded_by = auth.uid());

drop policy if exists "evidence_uploader_insert" on public.verification_evidence;
create policy "evidence_uploader_insert" on public.verification_evidence
  for insert to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "evidence_owner_update" on public.verification_evidence;
create policy "evidence_owner_update" on public.verification_evidence
  for update to authenticated
  using (public.is_staff() or uploaded_by = auth.uid());

drop policy if exists "evidence_owner_delete" on public.verification_evidence;
create policy "evidence_owner_delete" on public.verification_evidence
  for delete to authenticated
  using (public.is_staff() or uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Private bucket for deed scans, surveys, licences
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('verification-docs', 'verification-docs', false, 20971520,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

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

-- ---------------------------------------------------------------------------
-- 5. Audit trail query support
-- ---------------------------------------------------------------------------
create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx
  on public.audit_logs (action);
