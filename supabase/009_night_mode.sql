-- Migration 009 — Night-mode metadata for layouts
-- Tracks whether a layout has any night-mode appearance overrides so the
-- marketplace can surface a 🌙 badge on listings without re-parsing the
-- .rdm file on every render.
--
-- Source of truth is the layout JSON itself (per-widget `config.night`
-- blocks and/or layout root `night_mode` block); this column is a denorm
-- populated at upload time by the UploadForm parser. New uploads with
-- night-mode content set this true; existing rows default false until
-- re-uploaded or backfilled.

alter table layouts
  add column if not exists has_night_mode boolean default false;

-- Lightweight index for filtering "show me all night-mode-capable layouts"
create index if not exists idx_layouts_has_night_mode
  on layouts (has_night_mode)
  where has_night_mode = true;
