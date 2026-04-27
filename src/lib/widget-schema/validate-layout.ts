/**
 * validate-layout.ts — server-side validation for marketplace .rdm uploads.
 *
 * Source of truth: `widgets.schema.json` (vendored from firmware — see
 * `SOURCE.md` next to it). The schema describes the *editor inspector* fields,
 * which we re-purpose as a sanity check on the firmware persistence format
 * stored under `widget.config.<field_name>`.
 *
 * Design goals:
 *  - **Permissive on optional fields, strict on top-level structure.** Older
 *    firmware-generated layouts that omit fields, store extra unknown keys,
 *    or use legacy enum values must still pass. The schema only flags genuine
 *    breakage (unknown widget type, wildly-out-of-range numeric, oversized
 *    file).
 *  - **Human-friendly errors.** Surface the widget index + slot + field name,
 *    not a JSONPath. Editors and end-users read these.
 *  - **Zero deps.** No ajv, no joi — just TypeScript over the vendored JSON.
 *
 * What's NOT validated (intentional):
 *  - `signal_name` references on widgets — signals are decoupled (registry
 *    resolves at firmware load), so a missing signal is a runtime warning, not
 *    a layout-format error.
 *  - Color string format — firmware accepts both `"#RRGGBB"` strings and
 *    raw `0xRRGGBB` numeric (legacy 565 encoding via `convertWidgetColors`).
 *    Either form is permitted; only obviously-invalid values flag.
 *  - Per-widget `to_json`/`from_json` quirks (e.g. `border_color_style` →
 *    `border_color` night key remap). The schema's `night_key` field handles
 *    those at codegen time; we don't try to chase them at validation time.
 */

import schemaJson from "./widgets.schema.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ValidateOk {
  ok: true;
  /** Counts and stats — useful for upload-form metadata reporting. */
  stats: {
    widget_count: number;
    signal_count: number;
    serialised_bytes: number;
    schema_version: number;
  };
}

export interface ValidateErr {
  ok: false;
  errors: string[];
}

export type ValidateResult = ValidateOk | ValidateErr;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/**
 * Firmware cap. Must match `LAYOUT_MAX_FILE_BYTES` in
 * `RDM-7_Dash/main/layout/layout_manager.h`. The marketplace rejects
 * uploads that wouldn't fit on the dash anyway.
 */
export const LAYOUT_MAX_FILE_BYTES = 32768;

/**
 * Lowest layout schema version we accept. Firmware is currently at v13;
 * we accept anything >= 1 to avoid rejecting older user-generated layouts
 * that still load fine on current firmware. Bump this only when firmware
 * starts hard-rejecting older formats.
 */
export const MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION = 1;

/**
 * Per-widget-type slot caps. Mirrors `widget_constraints` in firmware
 * (`main/widgets/widget_types.c`) and the slot-bounds checks scattered
 * across `widget_*.c`. Widgets without an entry are slot-less or have
 * no enforced cap (image, text, etc.).
 *
 * Source: CLAUDE.md "Slot-limited: panel(16), bar(2), indicator(2), warning(8)"
 * and direct reads of `widget_panel.c` (`slot < 8`), `widget_warning.c`
 * (`slot >= 8`), etc. The widget_meter / widget_rpm_bar slots are
 * single-instance (singleton in schema).
 */
const SLOT_CAPS: Record<string, number> = {
  panel: 16,
  bar: 2,
  indicator: 2,
  warning: 8,
};

/* ------------------------------------------------------------------ */
/*  Schema typing (just enough for the validator)                      */
/* ------------------------------------------------------------------ */

interface SchemaFieldOption {
  value: string | number | boolean;
  label: string;
}

interface SchemaField {
  name: string;
  label: string;
  type: string;
  default: unknown;
  category?: string;
  group?: string;
  enabled_by?: string;
  inline?: string;
  night_overridable?: boolean;
  night_key?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: SchemaFieldOption[];
  _doc?: string;
  _raw_options?: string;
  _raw_extra?: Record<string, string>;
}

interface SchemaWidget {
  name: string;
  display_name: string;
  singleton?: boolean;
  default_size: { w: number; h: number };
  default_position: null | { x?: number; y?: number };
  constraints: {
    min_w: number | string;
    min_h: number | string;
    max_w: number | string;
    max_h: number | string;
  };
  fields: SchemaField[];
  _doc?: string;
}

interface WidgetSchema {
  schema_version: number;
  comment?: string;
  widgets: SchemaWidget[];
}

const SCHEMA = schemaJson as unknown as WidgetSchema;

/* Lazy-built lookup for fast name → widget-def access. */
const WIDGET_BY_NAME: Record<string, SchemaWidget> = (() => {
  const out: Record<string, SchemaWidget> = {};
  for (const w of SCHEMA.widgets) out[w.name] = w;
  return out;
})();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function widgetLabel(idx: number, w: Record<string, unknown>): string {
  const type = typeof w.type === "string" ? w.type : "?";
  const cfg = isPlainObject(w.config) ? w.config : null;
  const slot =
    cfg && typeof cfg.slot === "number" ? `#${cfg.slot}` : "";
  return `Widget ${idx} (${type}${slot ? " " + slot : ""})`;
}

/**
 * Number-ish: firmware sometimes serialises booleans as 0/1, integers as
 * floats, and back. The schema's min/max are advisory bounds, not strict
 * type assertions, so we coerce loosely.
 */
function toNumberOrNull(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "boolean") return x ? 1 : 0;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Field-level validation                                             */
/* ------------------------------------------------------------------ */

/**
 * Apply numeric-bound and select-option checks to one field.
 * Returns 0..many error strings.
 *
 * Be lenient: if the value is missing entirely, that's fine — we only
 * complain about values that are present and clearly out of range.
 */
function validateField(
  fieldDef: SchemaField,
  value: unknown,
  who: string,
): string[] {
  const errors: string[] = [];

  switch (fieldDef.type) {
    case "stepper":
    case "stepper-auto":
    case "slider":
    case "number": {
      const num = toNumberOrNull(value);
      if (num === null) {
        // Not numeric — could be intentionally string-typed (e.g. enum-ish
        // select with string values). Don't flag here, let the editor
        // handle it.
        return errors;
      }
      const hasMin = typeof fieldDef.min === "number";
      const hasMax = typeof fieldDef.max === "number";
      if (hasMin && num < (fieldDef.min as number)) {
        errors.push(
          `${who}: field '${fieldDef.name}' = ${num}, min allowed is ${fieldDef.min}`,
        );
      }
      if (hasMax && num > (fieldDef.max as number)) {
        errors.push(
          `${who}: field '${fieldDef.name}' = ${num}, max allowed is ${fieldDef.max}`,
        );
      }
      break;
    }
    case "select": {
      // Only validate if the schema enumerates options statically. Fields
      // using `_raw_options` (e.g. tx_bit_start uses Array.from(...)) are
      // dynamic and out of our reach.
      if (Array.isArray(fieldDef.options) && fieldDef.options.length > 0) {
        const allowed = fieldDef.options.map((o) => o.value);
        // Loose match: 0 == false == "0" all pass. Firmware persists most
        // selects as numbers, but legacy layouts may store strings.
        const matches = allowed.some((a) => a === value || String(a) === String(value));
        if (!matches) {
          const allowedStr = allowed.map((a) => JSON.stringify(a)).join(", ");
          errors.push(
            `${who}: field '${fieldDef.name}' = ${JSON.stringify(value)}, expected one of [${allowedStr}]`,
          );
        }
      }
      break;
    }
    case "checkbox":
    case "color":
    case "text":
    case "textarea":
    case "font":
    case "image_picker":
    case "can_id":
    default:
      // No structural check — schema doesn't carry enough for these
      // (color formats vary 565↔888, font names are user-defined,
      // image picker references external storage).
      break;
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Top-level validator                                                */
/* ------------------------------------------------------------------ */

/**
 * Validate a parsed layout JSON object.
 *
 * Accepts: anything that quacks like a layout. Top-level structure is
 * required; per-widget config is sanity-checked but not strictly typed
 * (firmware tolerates extra keys, missing optional keys, and legacy values).
 */
export function validateLayout(layout: unknown): ValidateResult {
  const errors: string[] = [];

  // 1. Top-level shape
  if (!isPlainObject(layout)) {
    return { ok: false, errors: ["Layout must be a JSON object."] };
  }

  // 2. schema_version
  const sv = toNumberOrNull(layout.schema_version);
  if (sv === null) {
    errors.push(
      "Layout is missing top-level 'schema_version' (number). Firmware-generated layouts always include this.",
    );
  } else if (sv < MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION) {
    errors.push(
      `Layout schema_version = ${sv}, minimum supported is ${MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION}.`,
    );
  }

  // 3. widgets (array)
  const widgets = layout.widgets;
  if (!Array.isArray(widgets)) {
    errors.push("Layout must have a 'widgets' array.");
  }

  // 4. signals (array — may be empty)
  const signals = layout.signals;
  if (signals !== undefined && !Array.isArray(signals)) {
    errors.push("Layout 'signals' must be an array if present.");
  }

  // 5. Serialised size
  let serialisedBytes = 0;
  try {
    // Note: we encode UTF-8 to count bytes, not chars (firmware sees bytes).
    serialisedBytes = new TextEncoder().encode(JSON.stringify(layout)).length;
  } catch {
    errors.push("Layout is not JSON-serialisable (circular references?).");
  }
  if (serialisedBytes > LAYOUT_MAX_FILE_BYTES) {
    errors.push(
      `Layout JSON is ${serialisedBytes} bytes; firmware limit is ${LAYOUT_MAX_FILE_BYTES} bytes (LAYOUT_MAX_FILE_BYTES). Reduce the number of widgets or trim per-widget config.`,
    );
  }

  // Bail out before per-widget checks if the basic shape is broken.
  if (!Array.isArray(widgets)) {
    return { ok: false, errors };
  }

  // 6. Per-widget validation
  // Track slot occupancy for slot-capped widget types.
  const slotsSeen: Record<string, Set<number>> = {};

  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i];
    if (!isPlainObject(w)) {
      errors.push(`Widget ${i}: not an object.`);
      continue;
    }
    const who = widgetLabel(i, w);
    const type = w.type;
    if (typeof type !== "string") {
      errors.push(`${who}: missing or non-string 'type'.`);
      continue;
    }
    const def = WIDGET_BY_NAME[type];
    if (!def) {
      errors.push(
        `${who}: unknown widget type '${type}'. Known types: ${Object.keys(WIDGET_BY_NAME).join(", ")}.`,
      );
      continue;
    }

    const cfg = isPlainObject(w.config) ? w.config : {};

    // Slot bounds for slot-capped types.
    if (typeof SLOT_CAPS[type] === "number") {
      const slot = toNumberOrNull(cfg.slot);
      if (slot !== null) {
        const cap = SLOT_CAPS[type];
        if (slot < 0 || slot >= cap) {
          errors.push(
            `${who}: slot=${slot} out of range. '${type}' supports slots 0..${cap - 1}.`,
          );
        }
        // Duplicate-slot detection (within a type).
        if (!slotsSeen[type]) slotsSeen[type] = new Set();
        if (slotsSeen[type].has(slot)) {
          errors.push(
            `${who}: duplicate slot=${slot}. Each '${type}' slot must be unique.`,
          );
        }
        slotsSeen[type].add(slot);
      }
    }

    // Per-field range / option checks. Only validates fields that the
    // schema knows about; extra keys in cfg are tolerated.
    for (const fieldDef of def.fields) {
      // Skip if config doesn't carry this field (firmware default applies).
      if (!(fieldDef.name in cfg)) continue;
      const fieldErrors = validateField(fieldDef, cfg[fieldDef.name], who);
      errors.push(...fieldErrors);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    stats: {
      widget_count: widgets.length,
      signal_count: Array.isArray(signals) ? signals.length : 0,
      serialised_bytes: serialisedBytes,
      schema_version: sv ?? 0,
    },
  };
}

/**
 * Convenience: parse a JSON string and validate. Returns a single
 * "could not parse JSON" error if JSON.parse throws.
 */
export function validateLayoutString(jsonText: string): ValidateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return {
      ok: false,
      errors: [
        `Layout is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
  return validateLayout(parsed);
}

/**
 * Names of widget types the schema knows about. Useful for client-side
 * dropdowns / pre-flight checks.
 */
export function knownWidgetTypes(): string[] {
  return Object.keys(WIDGET_BY_NAME);
}
