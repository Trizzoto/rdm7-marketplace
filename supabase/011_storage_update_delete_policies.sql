-- Migration 011 — Add UPDATE and DELETE policies on storage.objects
--
-- Root cause: only INSERT policies existed for the layouts/screenshots
-- buckets. The marketplace upload code uses `upsert: true` on
-- supabase.storage.upload(), which sends `x-upsert: true` and asks
-- Postgres to do an UPSERT (INSERT ... ON CONFLICT). Postgres requires
-- BOTH insert and update permissions for an upsert, so without an
-- UPDATE policy every authenticated upload was being rejected with the
-- cryptic "new row violates row-level security policy" error.
--
-- Scope: each user can only update/delete files inside their own
-- top-level folder, which by convention is `<authorId>/...`. This is
-- the same scope storage.foldername uses elsewhere in our policies.
--
-- DELETE policies are added at the same time so users can replace old
-- screenshots / unpublished files cleanly.

create policy "Authenticated users can update own layouts"
  on storage.objects for update
  using (
    (bucket_id = 'layouts'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  )
  with check (
    (bucket_id = 'layouts'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

create policy "Authenticated users can update own screenshots"
  on storage.objects for update
  using (
    (bucket_id = 'screenshots'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  )
  with check (
    (bucket_id = 'screenshots'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

create policy "Authenticated users can delete own layouts"
  on storage.objects for delete
  using (
    (bucket_id = 'layouts'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );

create policy "Authenticated users can delete own screenshots"
  on storage.objects for delete
  using (
    (bucket_id = 'screenshots'::text)
    and ((select auth.uid())::text = (storage.foldername(name))[1])
  );
