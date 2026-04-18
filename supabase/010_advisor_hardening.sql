-- Migration 010 — Security + performance hardening from Supabase advisors.
-- Cleared all 24 perf warnings + 8 of 9 security warnings on 2026-04-18.
-- Applied directly to production on 2026-04-18; this file is the source of
-- truth so a fresh DB or restore reaches the same state.
--
-- Final advisor state after this migration:
--   * Performance Advisor: 0 errors, 0 warnings (was 24)
--   * Security Advisor:    0 errors, 1 warning  (was 9)
--
-- The 1 remaining security warning is "Leaked Password Protection Disabled"
-- — that's the HaveIBeenPwned-backed `password_hibp_enabled` setting which
-- Supabase only exposes on Pro plan and above. The marketplace is on Free
-- so the toggle is greyed out. Upgrade the plan if you want to enable it;
-- otherwise no SQL fix is possible.

-- ── 1. Pin search_path on SECURITY DEFINER functions ──────────────────────
-- Prevents search_path injection. Splinter: "Function Search Path Mutable".
alter function public.notify_layout_update() set search_path = public, pg_temp;
alter function public.increment_downloads(uuid) set search_path = public, pg_temp;
alter function public.update_layout_rating() set search_path = public, pg_temp;

-- ── 2. Wrap auth.uid() / auth.jwt() in (select …) for query-plan caching ──
-- Splinter: "Auth RLS Initialization Plan". Without the wrap, auth.uid() is
-- re-evaluated for every row; with the wrap, it's evaluated once per query.

alter policy "Authors can insert versions" on public.layout_versions
  with check (exists (select 1 from layouts where layouts.id = layout_id and layouts.author_id = (select auth.uid())));

alter policy "Authors can delete own layouts" on public.layouts
  using ((select auth.uid()) = author_id);

alter policy "Authors can insert layouts" on public.layouts
  with check ((select auth.uid()) = author_id);

alter policy "Authors can update own layouts" on public.layouts
  using ((select auth.uid()) = author_id);

alter policy "Users can delete own notifications" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users can update own notifications" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users can view own notifications" on public.notifications
  using ((select auth.uid()) = user_id);

alter policy "Users manage own profile" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users update own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users can view own purchases" on public.purchases
  using ((select auth.uid()) = buyer_id);

alter policy "Users can rate" on public.ratings
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own rating" on public.ratings
  using ((select auth.uid()) = user_id);

-- ── 3. Tighten "WITH CHECK (true)" INSERT policies ────────────────────────
-- Splinter: "RLS Policy Always True". The legitimate write paths use either
-- the SECURITY DEFINER increment_downloads() RPC or supabaseAdmin (service
-- role bypasses RLS), so the previous wide-open with-checks were dead-code
-- security holes. Tightening them blocks fake inserts from anon/auth callers
-- without affecting any legitimate flow.

alter policy "Anyone can log download" on public.downloads
  with check (user_id is null or user_id = (select auth.uid()));

-- Misleadingly named — the user-side RatingSection actually uses this to
-- notify layout authors of new ratings. Keep that working but restrict to
-- known notification types so it can't be abused for arbitrary spam.
alter policy "Service role can insert notifications" on public.notifications
  with check (
    (select auth.uid()) is not null
    and type in ('rating', 'comment', 'download', 'layout_update')
  );

alter policy "System can insert purchases" on public.purchases
  with check (((select auth.jwt()) ->> 'role') = 'service_role');

-- ── 4. Merge multiple permissive SELECT policies ──────────────────────────
-- Splinter: "Multiple Permissive Policies". Postgres runs every permissive
-- policy for every relevant query; merging into a single policy with OR is
-- equivalent semantically and faster.

drop policy if exists "Authors can view own layouts" on public.layouts;
drop policy if exists "Public layouts are viewable" on public.layouts;
create policy "View layouts (own or published)" on public.layouts for select
  using (is_published = true or (select auth.uid()) = author_id);

drop policy if exists "Authors can view own versions" on public.layout_versions;
drop policy if exists "Public layout versions" on public.layout_versions;
create policy "View versions (own or public)" on public.layout_versions for select
  using (
    exists (
      select 1 from layouts
      where layouts.id = layout_id
        and (layouts.is_published = true or layouts.author_id = (select auth.uid()))
    )
  );

-- ── 5. Storage: drop broad public SELECT, fix auth.role() re-eval ─────────
-- Splinter: "Public Bucket Allows Listing". Both buckets are
-- bucket.public = true, so direct downloads via the
-- /storage/v1/object/public/<bucket>/<path> URL bypass RLS — they keep
-- working without any SELECT policy. The marketplace never calls
-- storage.list() or storage.download() (file URLs come from
-- .getPublicUrl() and are stored in layouts.rdm_url /
-- layouts.screenshot_url). Removing this policy blocks anonymous bucket
-- enumeration via the LIST endpoint without affecting any download flow.
drop policy if exists "Anyone can read layouts" on storage.objects;
drop policy if exists "Anyone can read screenshots" on storage.objects;

-- Same auth.role() re-eval fix for the upload INSERT policies.
alter policy "Authenticated users can upload layouts" on storage.objects
  with check ((bucket_id = 'layouts'::text) and ((select auth.role()) = 'authenticated'::text));

alter policy "Authenticated users can upload screenshots" on storage.objects
  with check ((bucket_id = 'screenshots'::text) and ((select auth.role()) = 'authenticated'::text));
