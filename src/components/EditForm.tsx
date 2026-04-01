"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Layout } from "@/lib/supabase";

const ECU_TYPES = ["MaxxECU", "Haltech", "Link", "AEM", "MoTeC", "Ecumaster", "Custom"];

const inputClass =
  "w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors";

export function EditForm({
  layout,
  onSuccess,
  onCancel,
}: {
  layout: Layout;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(layout.name);
  const [description, setDescription] = useState(layout.description || "");
  const [price, setPrice] = useState(layout.price.toString());
  const [tags, setTags] = useState((layout.tags || []).join(", "));
  const [ecuType, setEcuType] = useState(layout.ecu_type || "");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isDbc = layout.item_type === "dbc";

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let screenshotUrl = layout.screenshot_url;

      // Upload new screenshot if changed
      if (screenshotFile) {
        const ext = screenshotFile.name.split(".").pop() || "png";
        const path = `${layout.author_id}/${layout.id}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("screenshots")
          .upload(path, screenshotFile, { contentType: screenshotFile.type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      const parsedPrice = parseFloat(price);
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const updates: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        price: isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice,
        tags: tagArray,
        ecu_type: ecuType || null,
        screenshot_url: screenshotUrl,
      };

      const { error: dbErr } = await supabase
        .from("layouts")
        .update(updates)
        .eq("id", layout.id)
        .eq("author_id", layout.author_id);

      if (dbErr) throw dbErr;

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Failed to save: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const currentScreenshot = screenshotPreview || layout.screenshot_url;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-lg font-bold uppercase">
          Edit {isDbc ? "DBC File" : "Layout"}
        </h2>
        <button
          onClick={onCancel}
          className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className={inputClass}
          placeholder="Layout name"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Describe what makes this special..."
        />
      </div>

      {/* Price + Tags row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
            Price (AUD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="0.00 for free"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputClass}
            placeholder="racing, street, minimal"
          />
        </div>
      </div>

      {/* ECU Type (layout only) */}
      {!isDbc && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wide">
            ECU Type
          </label>
          <select
            value={ecuType}
            onChange={(e) => setEcuType(e.target.value)}
            className={inputClass}
          >
            <option value="">Select ECU...</option>
            {ECU_TYPES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      )}

      {/* Screenshot */}
      {!isDbc && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wide">
            Screenshot
          </label>
          {currentScreenshot && (
            <div className="mb-3 rounded-lg overflow-hidden border border-[var(--border)] bg-[#0a0a0c] max-w-md">
              <img
                src={currentScreenshot}
                alt="Layout preview"
                className="w-full h-auto block"
                style={{ maxHeight: "280px", objectFit: "contain" }}
              />
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleScreenshotChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs font-heading font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            {screenshotFile ? "Change screenshot" : "Replace screenshot"}
          </button>
          {screenshotFile && (
            <button
              type="button"
              onClick={() => {
                setScreenshotFile(null);
                setScreenshotPreview(null);
              }}
              className="text-xs text-[var(--text-muted)] hover:underline ml-3"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={onCancel}
          className="text-sm font-heading font-bold uppercase tracking-wider px-5 py-2.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-heading font-bold uppercase tracking-wider px-5 py-2.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
