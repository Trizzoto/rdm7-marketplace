-- 013_publish_validation.sql
--
-- H3 (review 2026-06-11): layout validation was client-only. Persistence is a
-- direct client insert/update of `layouts` with is_published=true, so the
-- 32 KB / slot-cap / required-field checks in the upload form were advisory —
-- a crafted request could publish anything. This trigger enforces the
-- structural invariants server-side, in the database, so no client path can
-- bypass them.
--
-- Scope note: a Postgres trigger cannot run the JS widget-schema validator, so
-- it enforces the *structural* invariants only (file present, sane size, sane
-- schema_version, name present). Full content validation (widget schema, slot
-- caps, unknown-widget rejection) still belongs in an Edge Function that runs
-- the shared validator before flipping is_published — that is the remaining
-- depth of H3 and is tracked separately.
--
-- The gate fires ONLY on the act of publishing (an INSERT that is already
-- published, or a draft→published UPDATE). Routine updates of an
-- already-published row (download counters, ratings, edits) are not re-checked,
-- so applying this migration cannot retroactively break existing published
-- rows.

create or replace function validate_layout_publish()
returns trigger as $$
begin
  if NEW.is_published = true
     and (TG_OP = 'INSERT' or coalesce(OLD.is_published, false) = false) then

    if NEW.name is null or length(btrim(NEW.name)) = 0 then
      raise exception 'cannot publish layout: name is required';
    end if;

    if NEW.rdm_url is null or length(NEW.rdm_url) = 0 then
      raise exception 'cannot publish layout: an uploaded file (rdm_url) is required';
    end if;

    if coalesce(NEW.file_size_bytes, 0) <= 0 then
      raise exception 'cannot publish layout: file_size_bytes must be > 0';
    end if;

    -- .rdm files bundle the layout JSON plus optional embedded images/fonts, so
    -- this caps the whole container generously (not the 32 KB layout-JSON cap,
    -- which the inner-content validator enforces). Blocks absurd uploads.
    if coalesce(NEW.file_size_bytes, 0) > 16777216 then
      raise exception 'cannot publish layout: file_size_bytes exceeds 16 MB (got %)', NEW.file_size_bytes;
    end if;

    -- Block clearly-invalid schema versions (e.g. the 999 the JS validator let
    -- through) while leaving generous forward headroom over the current
    -- firmware LAYOUT_SCHEMA_VERSION (14).
    if coalesce(NEW.schema_version, 0) < 1 or coalesce(NEW.schema_version, 0) > 64 then
      raise exception 'cannot publish layout: schema_version % out of range (1-64)', NEW.schema_version;
    end if;

  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_validate_layout_publish on layouts;
create trigger trg_validate_layout_publish
  before insert or update on layouts
  for each row execute function validate_layout_publish();
