"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";

export function DownloadButton({ layoutId, rdmUrl, name, itemType }: { layoutId: string; rdmUrl: string | null; name: string; itemType?: string }) {
  const [downloading, setDownloading] = useState(false);
  const ext = itemType === "dbc" ? ".dbc" : ".rdm";

  const handleDownload = async () => {
    if (!rdmUrl) return;
    setDownloading(true);
    try {
      try { await supabase.rpc("increment_downloads", { layout_id: layoutId }); } catch { /* ok */ }
      const link = document.createElement("a");
      link.href = rdmUrl;
      link.download = `${name}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!rdmUrl || downloading}
      className="w-full bg-[var(--accent)] text-white font-bold py-2.5 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
    >
      {downloading ? "Downloading..." : `Download ${ext}`}
    </button>
  );
}
