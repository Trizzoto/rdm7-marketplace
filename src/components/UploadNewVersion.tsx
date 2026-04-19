"use client";

/**
 * UploadNewVersion — author-only UI for pushing a new version of an existing layout.
 *
 * When authors upload a new .rdm, the flow:
 *  1. Insert a row into layout_versions (version N+1, rdm_url, metadata)
 *  2. The on_layout_version_insert trigger (migration 008) bumps the main layouts row
 *     AND inserts notifications for every user who's ever downloaded this layout
 *
 * No server-side API — pure Supabase RLS + trigger.
 */

import { supabase } from "@/lib/supabase";
import { useState } from "react";

type Props = {
  layoutId: string;
  layoutName: string;
  currentVersion: number;
  authorId: string;
  onComplete?: () => void;
};

// Parse an .rdm bundle and extract the inner layout JSON + counts.
// This mirrors the parsing the main UploadForm already does.
async function parseRdmFile(file: File): Promise<{
  widgetCount: number;
  signalCount: number;
  fileSizeBytes: number;
} | null> {
  try {
    const arrayBuf = await file.arrayBuffer();
    const u8 = new Uint8Array(arrayBuf);
    const view = new DataView(arrayBuf);
    if (u8.length < 16) return null;
    // Magic "RDM1"
    if (u8[0] !== 0x52 || u8[1] !== 0x44 || u8[2] !== 0x4D || u8[3] !== 0x31) return null;
    const entryCount = view.getUint16(6, true);
    let off = 16;
    for (let i = 0; i < entryCount; i++) {
      if (off + 2 > u8.length) return null;
      const entryType = u8[off++];
      const nameLen = u8[off++];
      off += nameLen;
      if (off + 4 > u8.length) return null;
      const dataLen = view.getUint32(off, true);
      off += 4;
      if (entryType === 0) {
        // Layout JSON
        const data = u8.slice(off, off + dataLen);
        const text = new TextDecoder().decode(data);
        const obj = JSON.parse(text);
        return {
          widgetCount: Array.isArray(obj.widgets) ? obj.widgets.length : 0,
          signalCount: Array.isArray(obj.signals) ? obj.signals.length : 0,
          fileSizeBytes: file.size,
        };
      }
      off += dataLen;
    }
    return null;
  } catch {
    return null;
  }
}

export function UploadNewVersion({ layoutId, layoutName, currentVersion, authorId, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<{
    widgetCount: number;
    signalCount: number;
    fileSizeBytes: number;
  } | null>(null);

  const onFileSelect = async (f: File | null) => {
    setError(null);
    setFile(f);
    setParsed(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".rdm")) {
      setError("Only .rdm files supported for versions");
      setFile(null);
      return;
    }
    setParsing(true);
    const info = await parseRdmFile(f);
    setParsing(false);
    if (!info) {
      setError("Could not parse .rdm file — not a valid bundle?");
      setFile(null);
      return;
    }
    setParsed(info);
  };

  const onPublish = async () => {
    if (!file || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      /* Session-freshness check — same rationale as UploadForm.tsx: the
       * `authorId` prop was captured on page load, so if the JWT has
       * since expired every Supabase call silently drops to anon and
       * storage/RLS rejects the write. Refreshing here turns the opaque
       * RLS error into a clear "please sign in" message. */
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const uid = authData.user.id;

      const newVersion = currentVersion + 1;
      const safeName = layoutName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const storagePath = `${uid}/${layoutId}/v${newVersion}-${Date.now()}-${safeName}.rdm`;

      // Upload to the layouts bucket
      const { error: upErr } = await supabase.storage
        .from("layouts")
        .upload(storagePath, file, { contentType: "application/octet-stream", upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("layouts").getPublicUrl(storagePath);
      const rdmUrl = urlData.publicUrl;

      // Insert version row — trigger handles notifications + updating the main layouts row
      const { error: insErr } = await supabase.from("layout_versions").insert({
        layout_id: layoutId,
        version: newVersion,
        rdm_url: rdmUrl,
        file_size_bytes: parsed.fileSizeBytes,
        widget_count: parsed.widgetCount,
        signal_count: parsed.signalCount,
        notes: notes.trim() || null,
      });
      if (insErr) throw insErr;

      if (onComplete) onComplete();
      setFile(null);
      setNotes("");
      setParsed(null);
    } catch (e) {
      setError((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[var(--border)] rounded-card p-4 space-y-3 bg-[var(--surface)]">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-sm font-bold uppercase">Upload New Version</h4>
        <span className="text-xs text-[var(--text-muted)]">Current: v{currentVersion}</span>
      </div>

      <label className="block">
        <span className="text-xs text-[var(--text-muted)] block mb-1">.rdm file</span>
        <input
          type="file"
          accept=".rdm"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          className="block w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)]"
        />
      </label>

      {parsing && <p className="text-xs text-[var(--text-muted)]">Parsing…</p>}

      {parsed && (
        <div className="text-xs text-[var(--text-muted)] flex gap-4">
          <span>{parsed.widgetCount} widgets</span>
          <span>{parsed.signalCount} signals</span>
          <span>{(parsed.fileSizeBytes / 1024).toFixed(1)} KB</span>
        </div>
      )}

      <label className="block">
        <span className="text-xs text-[var(--text-muted)] block mb-1">Release notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Added oil temp gauge, re-colored the RPM bar"
          rows={2}
          maxLength={280}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        />
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={onPublish}
        disabled={!parsed || busy}
        className="w-full bg-[var(--accent)] text-white font-heading font-bold text-xs uppercase py-2 rounded hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Publishing…" : `Publish v${currentVersion + 1}`}
      </button>

      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
        Publishing a new version notifies everyone who previously downloaded this layout.
      </p>
    </div>
  );
}
