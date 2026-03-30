import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  void request;

  // Increment download counter via RPC
  try {
    await supabase.rpc("increment_downloads", { layout_id: id });
  } catch {
    // ignore if RPC doesn't exist yet
  }

  return NextResponse.json({ ok: true });
}
