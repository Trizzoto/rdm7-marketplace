-- Migration 008 — Layout versioning + update notifications for downloaders
-- Adds per-layout version history and automatic notifications when authors upload new versions.

-- Add version field to the main layouts row (represents the CURRENT version)
alter table layouts add column if not exists version int default 1;
alter table layouts add column if not exists version_notes text;
alter table layouts add column if not exists last_version_at timestamptz default now();

-- History of every version ever published, so downloaders can see a changelog
create table if not exists layout_versions (
  id uuid default gen_random_uuid() primary key,
  layout_id uuid references layouts(id) on delete cascade not null,
  version int not null,
  rdm_url text not null,
  file_size_bytes bigint default 0,
  widget_count int default 0,
  signal_count int default 0,
  notes text,
  created_at timestamptz default now(),
  unique(layout_id, version)
);

create index if not exists idx_layout_versions_layout on layout_versions(layout_id, version desc);

-- RLS: anyone can read version history for published layouts; authors manage own
alter table layout_versions enable row level security;

drop policy if exists "Public layout versions" on layout_versions;
create policy "Public layout versions" on layout_versions for select
  using (exists (select 1 from layouts where layouts.id = layout_id and layouts.is_published = true));

drop policy if exists "Authors can view own versions" on layout_versions;
create policy "Authors can view own versions" on layout_versions for select
  using (exists (select 1 from layouts where layouts.id = layout_id and layouts.author_id = auth.uid()));

drop policy if exists "Authors can insert versions" on layout_versions;
create policy "Authors can insert versions" on layout_versions for insert
  with check (exists (select 1 from layouts where layouts.id = layout_id and layouts.author_id = auth.uid()));

-- Trigger: when a new layout_versions row is inserted, notify every user who has ever
-- downloaded this layout (excluding the author). Uses the notifications table from 007.
create or replace function notify_layout_update()
returns trigger as $$
declare
  v_layout_name text;
  v_author_id uuid;
begin
  select name, author_id into v_layout_name, v_author_id from layouts where id = NEW.layout_id;

  -- Bump the main layouts row to reflect the new version
  update layouts set
    version = NEW.version,
    version_notes = NEW.notes,
    last_version_at = NEW.created_at,
    rdm_url = NEW.rdm_url,
    file_size_bytes = NEW.file_size_bytes,
    widget_count = NEW.widget_count,
    signal_count = NEW.signal_count,
    updated_at = now()
  where id = NEW.layout_id;

  -- Only fire notifications for version > 1 (initial upload doesn't need a notification)
  if NEW.version > 1 then
    insert into notifications (user_id, type, title, message, link)
    select distinct d.user_id,
           'layout_update',
           'New version of a layout you downloaded',
           format('"%s" was updated to v%s.', v_layout_name, NEW.version)
             || case when NEW.notes is not null and length(NEW.notes) > 0
                     then ' Notes: ' || NEW.notes else '' end,
           '/layout-detail/' || NEW.layout_id::text
    from downloads d
    where d.layout_id = NEW.layout_id
      and d.user_id is not null
      and d.user_id <> v_author_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_layout_version_insert on layout_versions;
create trigger on_layout_version_insert
  after insert on layout_versions
  for each row execute function notify_layout_update();

-- Backfill: create a v1 entry for every existing layout that doesn't have versions yet
insert into layout_versions (layout_id, version, rdm_url, file_size_bytes, widget_count, signal_count, created_at)
select l.id, coalesce(l.version, 1), l.rdm_url, l.file_size_bytes, l.widget_count, l.signal_count, l.created_at
from layouts l
where l.rdm_url is not null
  and not exists (select 1 from layout_versions v where v.layout_id = l.id)
on conflict (layout_id, version) do nothing;
