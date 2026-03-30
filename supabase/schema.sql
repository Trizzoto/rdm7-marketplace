-- RDM-7 Marketplace Database Schema
-- Run this in the Supabase SQL Editor after creating your project

-- Profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Layouts
create table if not exists layouts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  ecu_type text,
  tags text[] default '{}',
  screenshot_url text,
  rdm_url text,
  file_size_bytes bigint default 0,
  widget_count int default 0,
  signal_count int default 0,
  downloads int default 0,
  rating numeric(3,2) default 0,
  rating_count int default 0,
  price numeric(10,2) default 0,
  is_published boolean default false,
  schema_version int default 11,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ratings
create table if not exists ratings (
  id uuid default gen_random_uuid() primary key,
  layout_id uuid references layouts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  score int check (score >= 1 and score <= 5) not null,
  comment text,
  created_at timestamptz default now(),
  unique(layout_id, user_id)
);

-- Downloads tracking
create table if not exists downloads (
  id uuid default gen_random_uuid() primary key,
  layout_id uuid references layouts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  downloaded_at timestamptz default now()
);

-- Indexes
create index if not exists idx_layouts_published on layouts(is_published, created_at desc);
create index if not exists idx_layouts_ecu on layouts(ecu_type) where is_published = true;
create index if not exists idx_layouts_downloads on layouts(downloads desc) where is_published = true;
create index if not exists idx_layouts_author on layouts(author_id);
create index if not exists idx_ratings_layout on ratings(layout_id);
create index if not exists idx_downloads_layout on downloads(layout_id);

-- Row Level Security
alter table profiles enable row level security;
alter table layouts enable row level security;
alter table ratings enable row level security;
alter table downloads enable row level security;

-- Profiles: anyone can read, users manage own
create policy "Public profiles" on profiles for select using (true);
create policy "Users manage own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Layouts: anyone can read published, authors manage own
create policy "Public layouts are viewable" on layouts for select using (is_published = true);
create policy "Authors can view own layouts" on layouts for select using (auth.uid() = author_id);
create policy "Authors can insert layouts" on layouts for insert with check (auth.uid() = author_id);
create policy "Authors can update own layouts" on layouts for update using (auth.uid() = author_id);
create policy "Authors can delete own layouts" on layouts for delete using (auth.uid() = author_id);

-- Ratings: anyone can read, authenticated users can write
create policy "Public ratings" on ratings for select using (true);
create policy "Users can rate" on ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own rating" on ratings for update using (auth.uid() = user_id);

-- Downloads: insert only (tracking)
create policy "Anyone can log download" on downloads for insert with check (true);
create policy "Public download stats" on downloads for select using (true);

-- Function: increment download counter
create or replace function increment_downloads(layout_id uuid)
returns void as $$
begin
  update layouts set downloads = downloads + 1 where id = layout_id;
end;
$$ language plpgsql security definer;

-- Function: update layout rating after new review
create or replace function update_layout_rating()
returns trigger as $$
begin
  update layouts set
    rating = (select coalesce(avg(score), 0) from ratings where ratings.layout_id = NEW.layout_id),
    rating_count = (select count(*) from ratings where ratings.layout_id = NEW.layout_id)
  where id = NEW.layout_id;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: auto-update rating on review insert/update
create or replace trigger on_rating_change
  after insert or update on ratings
  for each row execute function update_layout_rating();

-- Storage buckets (run these in the Supabase dashboard or via API):
-- 1. Create bucket "screenshots" (public, 2MB max, image/* only)
-- 2. Create bucket "layouts" (public, 10MB max)
