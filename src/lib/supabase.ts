import { createClient } from "@supabase/supabase-js";

/* Whitespace in the project URL is not cosmetic — it gets BAKED INTO the rows.
 * A trailing newline on the deployed env var put one inside every stored
 * rdm_url and screenshot_url ("…supabase.co\n/storage/v1/…"). Browsers strip
 * newlines out of URLs before fetching, so the site looked fine, while
 * anything that does not strip them — a server-side fetch, curl, reqwest in
 * the desktop app, or the value re-encoded as %0A into a deep link — got
 * "bad hostname". Trim once, here, so no env value can poison the data again. */
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\s+/g, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const supabase = createClient(SUPABASE_URL, supabaseAnonKey);

export type Layout = {
  id: string;
  author_id: string;
  name: string;
  description: string | null;
  ecu_type: string | null;
  tags: string[];
  screenshot_url: string | null;
  rdm_url: string | null;
  file_size_bytes: number;
  widget_count: number;
  signal_count: number;
  downloads: number;
  rating: number;
  rating_count: number;
  price: number;
  item_type: "layout" | "dbc" | "splash";
  vehicle_tags: string[];
  can_speed: string | null;
  compatibility_notes: string | null;
  dbc_signal_count: number;
  dbc_can_ids: string | null;
  is_published: boolean;
  schema_version: number;
  has_night_mode: boolean; // added in migration 009
  version: number; // added in migration 008
  version_notes: string | null;
  last_version_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string; avatar_url: string | null };
};

export type LayoutVersion = {
  id: string;
  layout_id: string;
  version: number;
  rdm_url: string;
  file_size_bytes: number;
  widget_count: number;
  signal_count: number;
  notes: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  stripe_account_id: string | null;
  created_at: string;
};
