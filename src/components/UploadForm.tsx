"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/Toast";
import { validateLayout } from "@/lib/widget-schema";
import { studioCaptureUrl, studioPreviewUrl, studioBase } from "@/lib/studio";

const CAN_SPEEDS = ["500 kbps", "1 Mbps", "Other"];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ParsedRdm {
  name: string;
  widgetCount: number;
  signalCount: number;
  ecu: string;
  hasNightMode: boolean;
}

interface ParsedDbc {
  signalCount: number;
  messageCount: number;
  canIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */

/* Read a File as bare base64 (no data: prefix) — used to hand .rdm bytes to
   Studio's preview iframe over postMessage. */
function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string; // data URL
      resolve(res.slice(res.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(f);
  });
}

/* Turn a data URL (the image Studio sends back) into a File so it flows through
   the same upload path as a manually-chosen screenshot. */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

/* ------------------------------------------------------------------ */
/*  Badge helper                                                       */
/* ------------------------------------------------------------------ */

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded"
      style={{
        backgroundColor: color ? `${color}22` : "var(--bg)",
        color: color || "var(--text-muted)",
        border: `1px solid ${color ? `${color}44` : "var(--border)"}`,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function UploadForm({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {

  // Step 1 state
  const [itemType, setItemType] = useState<"layout" | "dbc" | "splash">("layout");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRdm, setParsedRdm] = useState<ParsedRdm | null>(null);
  const [parsedDbc, setParsedDbc] = useState<ParsedDbc | null>(null);
  /**
   * Layout schema validation errors. Populated by `validateLayout` after
   * the inner JSON is parsed. Empty array = clean layout. Non-empty blocks
   * Step 1→2 advance for itemType="layout" uploads.
   *
   * Splash and DBC uploads bypass this — different file format, schema
   * doesn't apply.
   */
  const [layoutValidationErrors, setLayoutValidationErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [canSpeed, setCanSpeed] = useState("");
  const [compatibilityNotes, setCompatibilityNotes] = useState("");
  const [customScreenshot, setCustomScreenshot] = useState<File | null>(null);
  const customScreenshotRef = useRef<HTMLInputElement>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Step 3 state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------------------------------------------------------- */
  /*  RDM parsing                                                      */
  /* ---------------------------------------------------------------- */

  const parseRdmFile = useCallback(async (f: File, isLayout: boolean) => {
    setLayoutValidationErrors([]);
    try {
      const buf = await f.arrayBuffer();
      const view = new DataView(buf);
      let offset = 16;
      const entryCount = view.getUint16(6, true);
      for (let i = 0; i < entryCount && offset < buf.byteLength; i++) {
        const type = view.getUint8(offset);
        const nameLen = view.getUint8(offset + 1);
        offset += 2 + nameLen;
        const dataLen = view.getUint32(offset, true);
        offset += 4;
        if (type === 0) {
          const json = new TextDecoder().decode(new Uint8Array(buf, offset, dataLen));
          const parsed = JSON.parse(json);

          // Schema validation — only for layout uploads. Splash files use
          // the same .rdm container but the inner JSON is splash metadata,
          // not a widget layout, so skip the widget-schema check.
          if (isLayout) {
            const v = validateLayout(parsed);
            if (!v.ok) {
              setLayoutValidationErrors(v.errors);
            }
          }

          // Detect night-mode capability: any widget with a non-empty `night`
          // block, OR a layout-level `night_mode` trigger binding.
          const hasNight =
            (Array.isArray(parsed.widgets) &&
              parsed.widgets.some(
                (w: { config?: { night?: Record<string, unknown> } }) =>
                  w?.config?.night && Object.keys(w.config.night).length > 0
              )) ||
            (parsed.night_mode &&
              typeof parsed.night_mode.signal_name === "string" &&
              parsed.night_mode.signal_name.length > 0);
          const result: ParsedRdm = {
            name: parsed.name || f.name.replace(/\.rdm$/i, ""),
            widgetCount: parsed.widgets?.length || 0,
            signalCount: parsed.signals?.length || 0,
            ecu: parsed.ecu || "",
            hasNightMode: !!hasNight,
          };
          setParsedRdm(result);
          setName(result.name);
          return;
        }
        offset += dataLen;
      }
      // Fallback if no layout JSON found
      setParsedRdm({
        name: f.name.replace(/\.rdm$/i, ""),
        widgetCount: 0,
        signalCount: 0,
        ecu: "",
        hasNightMode: false,
      });
      setName(f.name.replace(/\.rdm$/i, ""));
    } catch {
      setParsedRdm({
        name: f.name.replace(/\.rdm$/i, ""),
        widgetCount: 0,
        signalCount: 0,
        ecu: "",
        hasNightMode: false,
      });
      setName(f.name.replace(/\.rdm$/i, ""));
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  DBC parsing                                                      */
  /* ---------------------------------------------------------------- */

  const parseDbcFile = useCallback(async (f: File) => {
    try {
      const text = await f.text();
      const lines = text.split("\n");
      let signalCount = 0;
      let messageCount = 0;
      const canIds: string[] = [];

      for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("SG_ ")) {
          signalCount++;
        }
        if (trimmed.startsWith("BO_ ")) {
          messageCount++;
          const match = trimmed.match(/^BO_\s+(\d+)/);
          if (match) {
            const dec = parseInt(match[1], 10);
            canIds.push("0x" + dec.toString(16).toUpperCase());
          }
        }
      }

      setParsedDbc({ signalCount, messageCount, canIds });
      setName(f.name.replace(/\.dbc$/i, ""));
    } catch {
      setParsedDbc({ signalCount: 0, messageCount: 0, canIds: [] });
      setName(f.name.replace(/\.dbc$/i, ""));
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  File handling                                                     */
  /* ---------------------------------------------------------------- */

  const handleFileSelect = useCallback(
    (f: File) => {
      setFile(f);
      setError("");
      if (itemType === "dbc") {
        setParsedRdm(null);
        setLayoutValidationErrors([]);
        parseDbcFile(f);
      } else {
        // layout or splash — both use .rdm files. Only the layout flavour
        // is validated against the widget schema; splash JSON is a
        // different shape.
        setParsedDbc(null);
        parseRdmFile(f, itemType === "layout");
      }
    },
    [itemType, parseRdmFile, parseDbcFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  // Reset file when switching type
  const switchItemType = useCallback((t: "layout" | "dbc" | "splash") => {
    setItemType(t);
    setFile(null);
    setParsedRdm(null);
    setParsedDbc(null);
    setName("");
    setCustomScreenshot(null);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Preview screenshot URL                                           */
  /* ---------------------------------------------------------------- */

  const previewScreenshotUrl = customScreenshot
    ? URL.createObjectURL(customScreenshot)
    : null;

  /* ---------------------------------------------------------------- */
  /*  Price validation                                                 */
  /* ---------------------------------------------------------------- */

  const priceNum = parseFloat(price) || 0;
  const priceValid = price === "" || price === "0" || priceNum === 0 || priceNum >= 1;

  /* ---------------------------------------------------------------- */
  /*  Inline preview generation (pre-publish)                          */
  /* ---------------------------------------------------------------- */

  /* Kicks off generation by mounting the hidden Studio preview iframe; the
     postMessage handshake runs in the effect below. */
  const generatePreviewInline = () => {
    if (!file) return;
    setError("");
    setPreviewNonce(Date.now()); // fresh Studio load each attempt (cache-bust)
    setGeneratingPreview(true);
  };

  /**
   * Generate a preview WITHOUT publishing first, entirely in the background:
   * while `generatingPreview` is true a hidden Studio iframe is mounted; we hand
   * it the .rdm bytes over postMessage and it sends the captured image back. The
   * result becomes the (overridable) custom screenshot so the user reviews it on
   * the spot. No popup/tab — the iframe is offscreen-but-rendered so its WebGL
   * canvas still paints.
   */
  useEffect(() => {
    if (!generatingPreview || !file) return;
    const studioOrigin = new URL(studioBase()).origin;
    let settled = false;

    const onMessage = async (ev: MessageEvent) => {
      if (ev.origin !== studioOrigin) return;
      const data = (ev.data || {}) as { type?: string; image?: string; error?: string };

      if (data.type === "studio-preview-ready") {
        try {
          const bytes = await fileToBase64(file);
          previewIframeRef.current?.contentWindow?.postMessage(
            { type: "rdm-bytes", name: file.name, bytes },
            studioOrigin,
          );
        } catch {
          settled = true;
          setError("Couldn't read the layout file for preview.");
          setGeneratingPreview(false);
        }
      } else if (data.type === "studio-preview-result" && typeof data.image === "string") {
        settled = true;
        setCustomScreenshot(dataUrlToFile(data.image, "preview.png"));
        setGeneratingPreview(false);
      } else if (data.type === "studio-preview-error") {
        settled = true;
        setError("Preview generation failed: " + (data.error || "unknown error"));
        setGeneratingPreview(false);
      }
    };

    window.addEventListener("message", onMessage);
    const timeout = setTimeout(() => {
      if (!settled) {
        setError("Preview generation timed out — you can upload your own image instead.");
        setGeneratingPreview(false);
      }
    }, 45000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, [generatingPreview, file]);

  /* ---------------------------------------------------------------- */
  /*  Publish handler                                                  */
  /* ---------------------------------------------------------------- */

  const handlePublish = async () => {
    if (!file) return;
    setError("");
    setUploading(true);

    // Auto-generate a preview when the user didn't supply their own image (layout
    // /splash only — DBC files have no dashboard to render). Open the Studio tab
    // NOW, synchronously inside this click, so it isn't popup-blocked after the
    // awaits below; we navigate it to the capture URL once the row + token exist,
    // or close it if publishing fails. Null the opener for safety.
    const wantsAutoCapture = !customScreenshot && (itemType === "layout" || itemType === "splash");
    let captureWindow: Window | null = null;
    if (wantsAutoCapture) {
      captureWindow = window.open("about:blank", "_blank");
      if (captureWindow) captureWindow.opener = null;
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      /* CRITICAL — supabase.auth.refreshSession() returns the cached
       * access_token if it's not expired, even when storage server has
       * already revoked it (e.g. from a prior background refresh that
       * supabase-js didn't propagate). PostgREST still accepts the
       * cached token (no revocation check) but storage rejects it with
       * the cryptic "new row violates RLS policy" error.
       *
       * The reliable fix is to call /auth/v1/token?grant_type=refresh_token
       * directly via raw fetch — this guarantees the auth server issues
       * a fresh access_token that storage will accept. */
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.refresh_token) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { "apikey": anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: sessionData.session.refresh_token }),
      });
      if (!refreshRes.ok) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const refreshed = await refreshRes.json();
      if (!refreshed.access_token || !refreshed.user?.id) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const accessToken = refreshed.access_token as string;
      const authorId = refreshed.user.id as string;

      /* Persist the rotated token back into supabase-js so subsequent
       * PostgREST calls (profile upsert, layouts insert) use the new one. */
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshed.refresh_token,
        });
      } catch { /* best effort */ }

      /* Ensure the profile row exists. layouts.author_id has a FK to
       * profiles(id), so an OAuth sign-in that didn't trigger profile
       * creation would fail the insert with a foreign-key violation. */
      const userMeta = refreshed.user.user_metadata as Record<string, unknown> | undefined;
      const fallbackName =
        (userMeta?.full_name as string | undefined) ||
        (userMeta?.name as string | undefined) ||
        (refreshed.user.email as string | undefined)?.split("@")[0] ||
        "Anonymous";

      /* Raw fetch upload helper. Bypasses supabase-js storage subclient
       * which has been observed sending the wrong Authorization header
       * (anon key instead of user access_token), causing storage RLS to
       * reject the request as anonymous even though the user is signed in.
       * Using the user's freshly-refreshed access_token directly via fetch
       * is the only reliable way to get the JWT to propagate correctly to
       * the storage server's RLS evaluation. */
      const uploadToStorage = async (
        bucket: string,
        objectPath: string,
        body: File | Blob,
        contentType: string,
      ): Promise<{ error: { message: string } | null }> => {
        const url = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: anonKey,
            "Content-Type": contentType,
            // NB: do NOT send x-upsert: storage server runs an UPSERT
            // path that fails RLS even when INSERT alone would pass.
            // Paths are uniquely timestamped so duplicates won't happen.
          },
          body,
        });
        if (!res.ok) {
          const txt = await res.text();
          let parsed: { message?: string } = {};
          try { parsed = JSON.parse(txt); } catch {}
          return { error: { message: parsed.message || txt || `HTTP ${res.status}` } };
        }
        return { error: null };
      };

      const { error: profErr } = await supabase.from("profiles").upsert(
        { id: authorId, display_name: fallbackName },
        { onConflict: "id", ignoreDuplicates: true }
      );
      if (profErr) {
        console.error("[upload] profile upsert failed", profErr);
        throw new Error(`[step: profile] ${profErr.message || JSON.stringify(profErr)}`);
      }

      const timestamp = Date.now();

      // 1. Upload screenshot
      let screenshotUrl = "";
      if (customScreenshot) {
        const ext = customScreenshot.name.split(".").pop() || "png";
        const path = `${authorId}/${timestamp}.${ext}`;
        const { error: upErr } = await uploadToStorage(
          "screenshots",
          path,
          customScreenshot,
          customScreenshot.type || "image/png",
        );
        if (upErr) {
          console.error("[upload] screenshot upload failed", upErr);
          throw new Error(`[step: screenshot] ${upErr.message}`);
        }
        screenshotUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${path}`;
      }

      // 2. Upload file
      const bucket = "layouts";
      const filePath = `${authorId}/${timestamp}_${file.name}`;
      const { error: fileErr } = await uploadToStorage(
        bucket,
        filePath,
        file,
        "application/octet-stream",
      );
      if (fileErr) {
        console.error("[upload] file upload failed", fileErr);
        throw new Error(`[step: file] ${fileErr.message}`);
      }
      const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

      // 3. Build tags arrays
      const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const vehicleTags = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean);

      // 4. Insert record
      const { data: inserted, error: dbErr } = await supabase
        .from("layouts")
        .insert({
          author_id: authorId,
          item_type: itemType,
          name,
          description: description || null,
          ecu_type: null,
          tags: tagList,
          screenshot_url: screenshotUrl || null,
          rdm_url: fileUrl,
          file_size_bytes: file.size,
          widget_count: parsedRdm?.widgetCount || 0,
          signal_count: parsedRdm?.signalCount || 0,
          price: itemType === "splash" ? 0 : priceNum,
          is_published: true,
          version: 1,
          vehicle_tags: vehicleTags,
          can_speed: canSpeed || null,
          compatibility_notes: compatibilityNotes || null,
          dbc_signal_count: parsedDbc?.signalCount || 0,
          dbc_can_ids: parsedDbc ? parsedDbc.canIds.join(",") : null,
          has_night_mode: parsedRdm?.hasNightMode || false,
        })
        .select("id")
        .single();
      if (dbErr) throw new Error(dbErr.message || "Database insert failed");

      // 5. Insert v1 into layout_versions so the versioning system has a starting point
      if (inserted?.id && itemType === "layout") {
        await supabase.from("layout_versions").insert({
          layout_id: inserted.id,
          version: 1,
          rdm_url: fileUrl,
          file_size_bytes: file.size,
          widget_count: parsedRdm?.widgetCount || 0,
          signal_count: parsedRdm?.signalCount || 0,
          notes: null,
        });
      }

      // Auto-generate the preview: mint a capture token and send the pre-opened
      // Studio tab off to render + capture a "standard demo pose" frame, which it
      // POSTs back to /api/layout-screenshot. Best-effort — a failure here doesn't
      // fail the publish; the user can retry from the dashboard's Generate preview.
      if (wantsAutoCapture && inserted?.id && captureWindow) {
        try {
          const tokenRes = await fetch("/api/capture-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ layoutId: inserted.id }),
          });
          const tokenJson = await tokenRes.json();
          if (tokenJson.ok) {
            captureWindow.location.href = studioCaptureUrl(inserted.id, fileUrl, name, tokenJson.token);
          } else {
            captureWindow.close();
          }
        } catch {
          captureWindow.close();
        }
      } else if (captureWindow) {
        // wantsAutoCapture was true but we have no row/token to send it to.
        captureWindow.close();
      }

      showToast("Your listing has been published!", "success");
      onSuccess();
    } catch (err: unknown) {
      captureWindow?.close();
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : JSON.stringify(err);
      setError("Upload failed: " + msg);
    } finally {
      setUploading(false);
    }
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card p-6 mb-6">
      <h2 className="font-heading text-xl font-bold uppercase text-[var(--text)] mb-1">
        Upload New Listing
      </h2>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        Share your dashboard layout or DBC file with the community
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-card p-3 mb-4">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/*  File & Type                                                 */}
      {/* ============================================================ */}
      <div>
          {/* Type toggle cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => switchItemType("layout")}
              className={`flex items-center gap-3 p-4 rounded-card border-2 transition-all text-left ${
                itemType === "layout"
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text-muted)]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                  itemType === "layout" ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div>
                <div className="font-heading text-sm font-bold uppercase text-[var(--text)]">
                  Dashboard Layout
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">.rdm file</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => switchItemType("dbc")}
              className={`flex items-center gap-3 p-4 rounded-card border-2 transition-all text-left ${
                itemType === "dbc"
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text-muted)]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                  itemType === "dbc" ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="font-heading text-sm font-bold uppercase text-[var(--text)]">
                  DBC File
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">.dbc file</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => switchItemType("splash")}
              className={`flex items-center gap-3 p-4 rounded-card border-2 transition-all text-left ${
                itemType === "splash"
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text-muted)]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                  itemType === "splash" ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-heading text-sm font-bold uppercase text-[var(--text)]">
                  Splash Screen
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">.rdm file · free only</div>
              </div>
            </button>
          </div>

          {/* Drag and drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text-muted)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={itemType === "dbc" ? ".dbc" : ".rdm"}
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!file ? (
              <div>
                <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <p className="text-sm text-[var(--text-muted)] mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {itemType === "dbc" ? ".dbc files only" : ".rdm files only"}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-[var(--text)]">{file.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>

                {/* Parsed info badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {itemType === "layout" && parsedRdm && (
                    <>
                      {parsedRdm.widgetCount > 0 && (
                        <Badge color="#3b82f6">{parsedRdm.widgetCount} widgets</Badge>
                      )}
                      {parsedRdm.signalCount > 0 && (
                        <Badge color="#10b981">{parsedRdm.signalCount} signals</Badge>
                      )}
                    </>
                  )}
                  {itemType === "dbc" && parsedDbc && (
                    <>
                      {parsedDbc.signalCount > 0 && (
                        <Badge color="#3b82f6">{parsedDbc.signalCount} signals</Badge>
                      )}
                      {parsedDbc.messageCount > 0 && (
                        <Badge color="#10b981">{parsedDbc.messageCount} messages</Badge>
                      )}
                      {parsedDbc.canIds.slice(0, 8).map((id) => (
                        <Badge key={id} color="#6b7280">{id}</Badge>
                      ))}
                      {parsedDbc.canIds.length > 8 && (
                        <Badge color="#6b7280">+{parsedDbc.canIds.length - 8} more</Badge>
                      )}
                    </>
                  )}
                </div>

                <p className="text-[11px] text-[var(--text-muted)] mt-3">Click to choose a different file</p>
              </div>
            )}
          </div>

          {/* Layout validation errors — block advance until resolved. */}
          {layoutValidationErrors.length > 0 && (
            <div
              className="mt-4 p-4 border border-red-500/40 bg-red-500/10 rounded-card text-sm"
              role="alert"
            >
              <div className="flex items-center gap-2 mb-2 font-bold text-red-500 uppercase tracking-wide text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Layout Validation Failed
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mb-2">
                This .rdm file doesn&apos;t match the firmware widget schema. The
                listing can&apos;t be created until the issues below are fixed.
              </p>
              <ul className="text-[12px] list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
                {layoutValidationErrors.slice(0, 12).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {layoutValidationErrors.length > 12 && (
                  <li className="italic text-[var(--text-muted)]">
                    …and {layoutValidationErrors.length - 12} more
                  </li>
                )}
              </ul>
            </div>
          )}

      </div>

      {/* ============================================================ */}
      {/*  Details — revealed automatically once a file is selected     */}
      {/* ============================================================ */}
      {file && (
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          {/* Common fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            {itemType === "splash" ? (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Price</label>
                <div className="bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text-muted)]">
                  Free (splash screens are always free)
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0 = Free"
                    className={`w-full bg-[var(--bg)] border rounded-card pl-7 pr-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] ${
                      priceValid ? "border-[var(--border)]" : "border-red-500"
                    }`}
                  />
                </div>
                {!priceValid && (
                  <p className="text-[11px] text-red-500 mt-1">Minimum price is $1.00 (or free at $0)</p>
                )}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what makes this special..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="racing, street, minimal"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Layout/Splash-specific fields */}
          {(itemType === "layout" || itemType === "splash") && (
            <div className="border-t border-[var(--border)] pt-6 mb-6">
              <h3 className="font-heading text-sm font-bold uppercase text-[var(--text)] mb-4">
                {itemType === "splash" ? "Splash Details" : "Layout Details"}
              </h3>

              {/* Preview image section */}
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Preview Image <span className="text-[var(--text-muted)]">(auto-generated)</span>
                </label>

                {generatingPreview ? (
                  /* Background render: the Studio iframe is mounted but visually
                     covered by a spinner. It's kept on-screen (not display:none)
                     so its WebGL canvas actually paints; the overlay hides the
                     Studio UI while it works. */
                  <div className="relative mb-3 w-full max-w-md aspect-video rounded-card overflow-hidden border border-[var(--border)] bg-black">
                    <iframe
                      ref={previewIframeRef}
                      src={studioPreviewUrl(previewNonce)}
                      title="Generating preview"
                      className="absolute inset-0 w-full h-full border-0"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--bg)]/90 text-[var(--text-muted)]">
                      <svg className="w-6 h-6 animate-spin text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs font-medium">Generating preview…</span>
                    </div>
                  </div>
                ) : previewScreenshotUrl && (
                  <div className="mb-3 inline-block rounded-card overflow-hidden border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewScreenshotUrl}
                      alt="Layout preview"
                      className="block"
                      style={{ maxWidth: '100%', maxHeight: '280px' }}
                    />
                  </div>
                )}

                <input
                  ref={customScreenshotRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCustomScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  {itemType === "layout" && (
                    <button
                      type="button"
                      onClick={generatePreviewInline}
                      disabled={generatingPreview || !file}
                      className="inline-flex items-center gap-2 text-xs font-bold bg-[var(--accent)] text-white px-3 py-1.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingPreview && (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {generatingPreview
                        ? "Generating…"
                        : customScreenshot ? "Regenerate preview" : "Generate preview"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => customScreenshotRef.current?.click()}
                    className="text-xs font-bold text-[var(--accent)] hover:underline"
                  >
                    {customScreenshot ? "Change image" : "Upload your own"}
                  </button>
                  {customScreenshot && (
                    <button
                      type="button"
                      onClick={() => setCustomScreenshot(null)}
                      className="text-xs text-[var(--text-muted)] hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {!customScreenshot && !generatingPreview && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-2">
                    {itemType === "layout"
                      ? "Click Generate preview to render your layout now and review it here, or upload your own. If you skip this, a preview is generated automatically when you publish."
                      : "A preview is generated automatically when you publish. Upload your own image to override it."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* DBC-specific fields */}
          {itemType === "dbc" && (
            <div className="border-t border-[var(--border)] pt-6 mb-6">
              <h3 className="font-heading text-sm font-bold uppercase text-[var(--text)] mb-4">
                DBC Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Vehicle Make</label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="Toyota"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Supra"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Vehicle Year</label>
                  <input
                    type="text"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2024"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-1">CAN Speed</label>
                <select
                  value={canSpeed}
                  onChange={(e) => setCanSpeed(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Select CAN speed...</option>
                  {CAN_SPEEDS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Compatibility Notes</label>
                <textarea
                  value={compatibilityNotes}
                  onChange={(e) => setCompatibilityNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about compatibility, required hardware, etc."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] resize-none focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Parsed DBC info (read-only) */}
              {parsedDbc && (
                <div className="bg-[var(--bg)] rounded-card p-3 mb-4">
                  <p className="text-[11px] text-[var(--text-muted)] mb-2 font-medium uppercase tracking-wide">
                    Parsed from file
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge color="#3b82f6">{parsedDbc.signalCount} signals</Badge>
                    <Badge color="#10b981">{parsedDbc.messageCount} messages</Badge>
                    {parsedDbc.canIds.slice(0, 12).map((id) => (
                      <Badge key={id} color="#6b7280">{id}</Badge>
                    ))}
                    {parsedDbc.canIds.length > 12 && (
                      <Badge color="#6b7280">+{parsedDbc.canIds.length - 12} more</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Optional screenshot for DBC */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Screenshot (optional)</label>
                <input
                  ref={customScreenshotRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCustomScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => customScreenshotRef.current?.click()}
                  className="text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  {customScreenshot ? "Change screenshot" : "Upload screenshot"}
                </button>
                {customScreenshot && (
                  <>
                    <span className="text-xs text-[var(--text-muted)] mx-2">
                      {customScreenshot.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomScreenshot(null)}
                      className="text-xs text-[var(--text-muted)] hover:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Publish */}
          <div className="flex justify-end mt-6 pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={uploading || !name || !priceValid || layoutValidationErrors.length > 0}
              onClick={handlePublish}
              className="bg-[var(--accent)] text-white font-bold px-8 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Publishing...
                </>
              ) : (
                "Publish"
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
