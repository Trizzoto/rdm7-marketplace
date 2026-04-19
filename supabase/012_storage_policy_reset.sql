-- Migration 012 — Reset storage policies after RLS rejection issue
--
-- Background: storage uploads were failing with "new row violates RLS
-- policy" even for signed-in users with valid JWTs. The actual root
-- cause turned out to be the marketplace upload code sending
-- `x-upsert: true`, which triggers an INSERT...ON CONFLICT path on the
-- storage server that evaluates RLS against both INSERT and UPDATE
-- policies; that combined evaluation reliably rejects valid sessions
-- even when standalone INSERT alone would pass.
--
-- The marketplace fix is to NOT send x-upsert (paths are uniquely
-- timestamped so collisions don't happen). With x-upsert removed, the
-- standalone INSERT policy is what's evaluated.
--
-- Final policy shape:
-- - INSERT: authenticated users only, bucket match + folder name must
--   equal auth.uid() — so users can only upload into their own folder.
-- - UPDATE: authenticated, scoped to user's own folder. Marketplace
--   doesn't actually use UPDATE (no x-upsert), this is here for safety
--   and any future replace-in-place flow.
-- - DELETE: same as UPDATE — authenticated, own folder only.
-- - SELECT: not needed — buckets are public so direct downloads work
--   via /storage/v1/object/public/<bucket>/<path> without RLS.

drop policy if exists "Authenticated users can upload screenshots" on storage.objects;
drop policy if exists "Authenticated users can upload layouts"     on storage.objects;
drop policy if exists "Authenticated users can update own screenshots" on storage.objects;
drop policy if exists "Authenticated users can update own layouts"     on storage.objects;
drop policy if exists "Authenticated users can delete own screenshots" on storage.objects;
drop policy if exists "Authenticated users can delete own layouts"     on storage.objects;
drop policy if exists "screenshots_insert" on storage.objects;
drop policy if exists "layouts_insert"     on storage.objects;
drop policy if exists "screenshots_update" on storage.objects;
drop policy if exists "layouts_update"     on storage.objects;
drop policy if exists "screenshots_delete" on storage.objects;
drop policy if exists "layouts_delete"     on storage.objects;

create policy "screenshots_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "layouts_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'layouts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "screenshots_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "layouts_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'layouts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'layouts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

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
