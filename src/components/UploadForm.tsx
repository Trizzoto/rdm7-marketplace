"use client";

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/Toast";

const ECU_TYPES = ["MaxxECU", "Haltech", "Link", "AEM", "MoTeC", "Ecumaster", "Custom"];
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

const STEP_LABELS = ["File", "Details", "Publish"];

function StepIndicator({
  current,
  onGoTo,
}: {
  current: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        const canClick = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`w-8 h-px ${
                  isDone ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
              />
            )}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onGoTo(step)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : isDone
                  ? "bg-[var(--accent)]/20 text-[var(--accent)] cursor-pointer hover:bg-[var(--accent)]/30"
                  : "bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] cursor-default"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? "bg-white text-[var(--accent)]"
                    : isDone
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {isDone ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </span>
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
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
  // Wizard step
  const [step, setStep] = useState(1);

  // Step 1 state
  const [itemType, setItemType] = useState<"layout" | "dbc" | "splash">("layout");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRdm, setParsedRdm] = useState<ParsedRdm | null>(null);
  const [parsedDbc, setParsedDbc] = useState<ParsedDbc | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [ecuType, setEcuType] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [canSpeed, setCanSpeed] = useState("");
  const [compatibilityNotes, setCompatibilityNotes] = useState("");
  const [customScreenshot, setCustomScreenshot] = useState<File | null>(null);
  const customScreenshotRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------------------------------------------------------- */
  /*  RDM parsing                                                      */
  /* ---------------------------------------------------------------- */

  const parseRdmFile = useCallback(async (f: File) => {
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
          if (result.ecu) setEcuType(result.ecu);
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
        parseDbcFile(f);
      } else {
        // layout or splash — both use .rdm files
        setParsedDbc(null);
        parseRdmFile(f);
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
    setEcuType("");
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
  /*  Publish handler                                                  */
  /* ---------------------------------------------------------------- */

  const handlePublish = async () => {
    if (!file) return;
    setError("");
    setUploading(true);

    try {
      /* Force a fresh session before the insert. `getUser()` alone validates
       * against the auth server but doesn't reliably push a new access token
       * into the supabase client's headers — so subsequent PostgREST calls
       * can still go out with a stale/expired JWT, hitting RLS with NULL
       * auth.uid() and failing "author_id = auth.uid()" as the cryptic
       * "new row violates row-level security policy" error.
       *
       * refreshSession() forces a token rotation and updates the in-memory
       * client headers synchronously, so the insert below uses a fresh JWT. */
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session) {
        throw new Error("Your session expired — please sign in again and retry.");
      }
      const authorId = refreshed.session.user.id;

      /* Ensure the profile row exists. layouts.author_id has a FK to
       * profiles(id), so an OAuth sign-in that didn't trigger profile
       * creation would fail the insert with a foreign-key violation
       * (which Supabase sometimes surfaces as a generic RLS error). */
      const userMeta = refreshed.session.user.user_metadata as Record<string, unknown> | undefined;
      const fallbackName =
        (userMeta?.full_name as string | undefined) ||
        (userMeta?.name as string | undefined) ||
        refreshed.session.user.email?.split("@")[0] ||
        "Anonymous";
      console.log("[upload] session token present:", !!refreshed.session.access_token, "uid:", authorId);

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
        const { error: upErr } = await supabase.storage
          .from("screenshots")
          .upload(path, customScreenshot, { contentType: customScreenshot.type, upsert: true });
        if (upErr) {
          console.error("[upload] screenshot upload failed", upErr);
          throw new Error(`[step: screenshot] ${upErr.message || JSON.stringify(upErr)}`);
        }
        const { data: urlData } = supabase.storage.from("screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      // 2. Upload file
      const bucket = "layouts";
      const filePath = `${authorId}/${timestamp}_${file.name}`;
      const { error: fileErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { contentType: "application/octet-stream", upsert: true });
      if (fileErr) {
        console.error("[upload] file upload failed", fileErr);
        throw new Error(`[step: file] ${fileErr.message || JSON.stringify(fileErr)}`);
      }
      const { data: fileUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

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
          ecu_type: ecuType || null,
          tags: tagList,
          screenshot_url: screenshotUrl || null,
          rdm_url: fileUrlData.publicUrl,
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
          rdm_url: fileUrlData.publicUrl,
          file_size_bytes: file.size,
          widget_count: parsedRdm?.widgetCount || 0,
          signal_count: parsedRdm?.signalCount || 0,
          notes: null,
        });
      }

      showToast("Your listing has been published!", "success");
      onSuccess();
    } catch (err: unknown) {
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

      <StepIndicator current={step} onGoTo={setStep} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-card p-3 mb-4">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 1: File & Type                                         */}
      {/* ============================================================ */}
      {step === 1 && (
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
                      {parsedRdm.ecu && (
                        <Badge color="#f59e0b">{parsedRdm.ecu}</Badge>
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

          {/* Next button */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!file}
              onClick={() => setStep(2)}
              className="bg-[var(--accent)] text-white font-bold px-6 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2: Details                                              */}
      {/* ============================================================ */}
      {step === 2 && (
        <div>
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

              {itemType === "layout" && (
                <div className="mb-4">
                  <label className="block text-xs text-[var(--text-muted)] mb-1">ECU Type</label>
                  <select
                    value={ecuType}
                    onChange={(e) => setEcuType(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-card px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Select ECU...</option>
                    {ECU_TYPES.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Screenshot section */}
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Screenshot <span className="text-red-400">*</span>
                </label>

                {previewScreenshotUrl && (
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
                <button
                  type="button"
                  onClick={() => customScreenshotRef.current?.click()}
                  className="text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  {customScreenshot ? "Change screenshot" : "Upload screenshot"}
                </button>
                {customScreenshot && (
                  <button
                    type="button"
                    onClick={() => setCustomScreenshot(null)}
                    className="text-xs text-[var(--text-muted)] hover:underline ml-3"
                  >
                    Remove
                  </button>
                )}
                {!customScreenshot && (
                  <p className="text-[11px] text-red-400 mt-1">
                    A screenshot is required
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

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="border border-[var(--border)] text-[var(--text)] font-bold px-6 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--bg)] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!name || !priceValid || ((itemType === "layout" || itemType === "splash") && !customScreenshot)}
              onClick={() => setStep(3)}
              className="bg-[var(--accent)] text-white font-bold px-6 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3: Preview & Publish                                    */}
      {/* ============================================================ */}
      {step === 3 && (
        <div>
          <h3 className="font-heading text-lg font-bold uppercase text-[var(--text)] mb-4">
            Preview Your Listing
          </h3>

          {/* Mock LayoutCard-style preview */}
          <div className="max-w-sm mx-auto mb-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-card overflow-hidden">
              <div className={`${itemType === "dbc" ? "aspect-[3/1]" : "aspect-[16/9]"} bg-[#0a0a0c] relative overflow-hidden`}>
                {previewScreenshotUrl && (itemType === "layout" || itemType === "splash") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewScreenshotUrl} alt={name} className="w-full h-full object-contain" />
                ) : itemType === "dbc" ? (
                  <div className="w-full h-full flex items-center justify-center gap-3">
                    <span className="font-heading text-3xl font-bold text-gray-600 uppercase">.dbc</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    No Preview
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    itemType === "dbc" ? "bg-blue-500 text-white"
                    : itemType === "splash" ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-white"
                  }`}>
                    {itemType === "dbc" ? "DBC" : itemType === "splash" ? "SPLASH" : "LAYOUT"}
                  </span>
                </div>
                {priceNum === 0 ? (
                  <span className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    FREE
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    ${priceNum.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-bold uppercase text-[var(--text)] truncate">
                  {name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">by You</p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-muted)]">
                  {ecuType && (
                    <span className="bg-[var(--bg)] px-1.5 py-0.5 rounded font-medium">{ecuType}</span>
                  )}
                  {itemType === "layout" && parsedRdm && parsedRdm.widgetCount > 0 && (
                    <span>{parsedRdm.widgetCount}w</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-[var(--bg)] rounded-card p-4 mb-6">
            <h4 className="font-heading text-xs font-bold uppercase text-[var(--text-muted)] mb-3 tracking-wide">
              Listing Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <SummaryRow label="Type" value={itemType === "layout" ? "Dashboard Layout" : itemType === "splash" ? "Splash Screen" : "DBC File"} />
              <SummaryRow label="File" value={file?.name || "—"} />
              <SummaryRow label="File Size" value={file ? `${(file.size / 1024).toFixed(1)} KB` : "—"} />
              <SummaryRow label="Name" value={name} />
              <SummaryRow label="Price" value={priceNum === 0 ? "Free" : `$${priceNum.toFixed(2)}`} />
              {description && <SummaryRow label="Description" value={description} span />}
              {tags && <SummaryRow label="Tags" value={tags} />}

              {itemType === "layout" && (
                <>
                  {ecuType && <SummaryRow label="ECU Type" value={ecuType} />}
                  {parsedRdm && parsedRdm.widgetCount > 0 && (
                    <SummaryRow label="Widgets" value={String(parsedRdm.widgetCount)} />
                  )}
                  {parsedRdm && parsedRdm.signalCount > 0 && (
                    <SummaryRow label="Signals" value={String(parsedRdm.signalCount)} />
                  )}
                  <SummaryRow
                    label="Screenshot"
                    value={customScreenshot ? customScreenshot.name : "None"}
                  />
                </>
              )}

              {itemType === "dbc" && (
                <>
                  {vehicleMake && <SummaryRow label="Vehicle" value={[vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ")} />}
                  {canSpeed && <SummaryRow label="CAN Speed" value={canSpeed} />}
                  {parsedDbc && <SummaryRow label="Signals" value={String(parsedDbc.signalCount)} />}
                  {parsedDbc && <SummaryRow label="Messages" value={String(parsedDbc.messageCount)} />}
                  {parsedDbc && parsedDbc.canIds.length > 0 && (
                    <SummaryRow label="CAN IDs" value={parsedDbc.canIds.slice(0, 10).join(", ") + (parsedDbc.canIds.length > 10 ? ` (+${parsedDbc.canIds.length - 10})` : "")} span />
                  )}
                  {compatibilityNotes && <SummaryRow label="Compatibility" value={compatibilityNotes} span />}
                </>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="border border-[var(--border)] text-[var(--text)] font-bold px-6 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--bg)] transition-colors"
            >
              Go Back
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={handlePublish}
              className="bg-[var(--accent)] text-white font-bold px-8 py-2.5 rounded-card text-sm uppercase tracking-wide hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
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

/* ------------------------------------------------------------------ */
/*  Summary row helper                                                 */
/* ------------------------------------------------------------------ */

function SummaryRow({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <span className="text-[var(--text-muted)] text-xs">{label}: </span>
      <span className="text-[var(--text)] text-xs font-medium">{value}</span>
    </div>
  );
}
