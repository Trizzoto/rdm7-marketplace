import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  item_type: "layout" | "dbc";
  vehicle_tags: string[];
  can_speed: string | null;
  compatibility_notes: string | null;
  dbc_signal_count: number;
  dbc_can_ids: string | null;
  is_published: boolean;
  schema_version: number;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string; avatar_url: string | null };
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  stripe_account_id: string | null;
  created_at: string;
};
