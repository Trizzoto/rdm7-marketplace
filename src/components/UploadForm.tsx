"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ECU_TYPES = ["MaxxECU", "Haltech", "Link", "AEM", "MoTeC", "Ecumaster", "Custom"];

export function UploadForm({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [itemType, setItemType] = useState<"layout" | "dbc">("layout");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ecuType, setEcuType] = useState("");
  const [tags, setTags] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [rdmFile, setRdmFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const screenshotRef = useRef<HTMLInputElement>(null);
  const rdmRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rdmFile) {
      setError("Name and .rdm file are required");
      return;
    }
    setError("");
    setUploading(true);

    try {
      const timestamp = Date.now();

      // Upload screenshot
      let screenshotUrl = "";
      if (screenshot) {
        const ext = screenshot.name.split(".").pop() || "png";
        const path = `${userId}/${timestamp}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("screenshots")
          .upload(path, screenshot, { contentType: screenshot.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      // Upload .rdm file
      const rdmPath = `${userId}/${timestamp}_${rdmFile.name}`;
      const { error: rdmErr } = await supabase.storage
        .from("layouts")
        .upload(rdmPath, rdmFile, { contentType: "application/octet-stream" });
      if (rdmErr) throw rdmErr;
      const { data: rdmUrlData } = supabase.storage.from("layouts").getPublicUrl(rdmPath);

      // Parse .rdm to get widget/signal counts
      let widgetCount = 0;
      let signalCount = 0;
      try {
        const buf = await rdmFile.arrayBuffer();
        const view = new DataView(buf);
        // Skip 16-byte header, read entries to find layout JSON
        let offset = 16;
        const entryCount = view.getUint16(6, true);
        for (let i = 0; i < entryCount && offset < buf.byteLength; i++) {
          const type = view.getUint8(offset);
          const nameLen = view.getUint8(offset + 1);
          offset += 2 + nameLen;
          const dataLen = view.getUint32(offset, true);
          offset += 4;
          if (type === 0) { // Layout JSON
            const json = new TextDecoder().decode(new Uint8Array(buf, offset, dataLen));
            const parsed = JSON.parse(json);
            widgetCount = parsed.widgets?.length || 0;
            signalCount = parsed.signals?.length || 0;
          }
          offset += dataLen;
        }
      } catch { /* parsing optional */ }

      // Create layout record
      const { error: dbErr } = await supabase.from("layouts").insert({
        author_id: userId,
        item_type: itemType,
        name,
        description: description || null,
        ecu_type: ecuType || null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        screenshot_url: screenshotUrl || null,
        rdm_url: rdmUrlData.publicUrl,
        file_size_bytes: rdmFile.size,
        widget_count: widgetCount,
        signal_count: signalCount,
        is_published: true,
      });
      if (dbErr) throw dbErr;

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Upload failed: " + msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Upload New Layout</h2>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setItemType("layout")}
          className={`px-4 py-2 text-sm font-bold rounded-md ${itemType === "layout" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"}`}>
          Dashboard Layout
        </button>
        <button type="button" onClick={() => setItemType("dbc")}
          className={`px-4 py-2 text-sm font-bold rounded-md ${itemType === "dbc" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]"}`}>
          DBC File
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Layout Name *</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">ECU Type</label>
          <select
            value={ecuType} onChange={(e) => setEcuType(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="">Select ECU...</option>
            {ECU_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] resize-none focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-[var(--text-muted)] mb-1">Tags (comma separated)</label>
        <input
          type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="racing, street, minimal"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Screenshot (PNG/JPG)</label>
          <input ref={screenshotRef} type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[var(--elevated)] file:text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">{itemType === "dbc" ? ".dbc File *" : ".rdm File *"}</label>
          <input ref={rdmRef} type="file" accept={itemType === "dbc" ? ".dbc" : ".rdm"} onChange={(e) => setRdmFile(e.target.files?.[0] || null)} required
            className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[var(--elevated)] file:text-[var(--text)]"
          />
        </div>
      </div>

      <button
        type="submit" disabled={uploading}
        className="bg-[var(--accent)] text-white font-bold px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 uppercase text-sm tracking-wide"
      >
        {uploading ? "Uploading..." : "Publish Layout"}
      </button>
    </form>
  );
}
