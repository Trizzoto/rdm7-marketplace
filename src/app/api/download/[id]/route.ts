import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void request;

  // Increment download counter via RPC
  try {
    await supabase.rpc("increment_downloads", { layout_id: id });
  } catch {
    // ignore if RPC doesn't exist yet
  }

  // Create download notification for the layout author (consolidated per layout)
  try {
    const { data: layout } = await supabaseAdmin
      .from("layouts")
      .select("author_id, name, downloads")
      .eq("id", id)
      .single();

    if (layout?.author_id) {
      const link = `/layout-detail/${id}`;

      // Delete any existing download notification for this layout, then insert fresh
      await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", layout.author_id)
        .eq("type", "download")
        .eq("link", link);

      await supabaseAdmin.from("notifications").insert({
        user_id: layout.author_id,
        type: "download",
        title: "Layout Downloaded",
        message: `Your "${layout.name}" was downloaded. ${layout.downloads || 0} total downloads.`,
        link,
      });
    }
  } catch {
    // Don't fail the download if notification fails
  }

  return NextResponse.json({ ok: true });
}
