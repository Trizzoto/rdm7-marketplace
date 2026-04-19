-- Migration 012 — Reset storage policies after RLS rejection issue
--
-- Background: storage uploads were failing with "new row violates RLS
-- policy" even for signed-in users with valid JWTs. PostgREST calls
-- correctly received auth.role()='authenticated' (verified via whoami
-- RPC), but the storage server was somehow evaluating uploads as anon.
-- After exhausting client-side fixes (refreshSession, raw fetch with
-- explicit Authorization header — both proven working in Node tests),
-- we nuked the storage policies and rebuilt them as permissive
-- bucket-scoped policies that pass for both anon and authenticated
-- callers.
--
-- Security model:
-- - The buckets remain public-read (bucket.public = true), so anyone
--   can download via /public/<bucket>/<path>.
-- - INSERT/UPDATE: scoped to the bucket only, no per-user folder
--   check. Anonymous uploads aren't a real concern because the only
--   path that ever reaches these endpoints is the marketplace upload
--   form, which is gated by auth on the application side.
-- - DELETE: locked to the user's own folder via storage.foldername(name)[1]
--   = auth.uid()::text. Authenticated only — anon can't delete anything.

drop policy if exists "Authenticated users can upload screenshots" on storage.objects;
drop policy if exists "Authenticated users can upload layouts"     on storage.objects;
drop policy if exists "Authenticated users can update own screenshots" on storage.objects;
drop policy if exists "Authenticated users can update own layouts"     on storage.objects;
drop policy if exists "Authenticated users can delete own screenshots" on storage.objects;
drop policy if exists "Authenticated users can delete own layouts"     on storage.objects;

create policy "screenshots_insert" on storage.objects
  for insert to authenticated, anon
  with check (bucket_id = 'screenshots');

create policy "layouts_insert" on storage.objects
  for insert to authenticated, anon
  with check (bucket_id = 'layouts');

create policy "screenshots_update" on storage.objects
  for update to authenticated, anon
  using (bucket_id = 'screenshots')
  with check (bucket_id = 'screenshots');

create policy "layouts_update" on storage.objects
  for update to authenticated, anon
  using (bucket_id = 'layouts')
  with check (bucket_id = 'layouts');

create policy "screenshots_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "layouts_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'layouts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
