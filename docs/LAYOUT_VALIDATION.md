# Layout Validation

## Why

The marketplace stores `.rdm` (layout JSON) files in Supabase Storage and
serves them to RDM-7 Dash devices. Before this feature, layouts were
**opaque blobs** — the marketplace had no idea whether a file would even
load on a real dashboard. A user could upload junk and the firmware would
silently bail at parse time.

This module rejects malformed layouts at upload time and returns
human-friendly error messages.

## Where

```
src/lib/widget-schema/
├── widgets.schema.json          # vendored from RDM-7_Dash/schema/
├── widgets.schema.meta.json     # JSON-Schema meta-validator (vendored, unused at runtime)
├── validate-layout.ts           # the validator
├── index.ts                     # public surface
├── SOURCE.md                    # provenance + how to update
└── __tests__/
    └── validate-layout.test.ts  # vitest, 26 cases

src/app/api/validate-layout/
└── route.ts                     # stateless POST endpoint (optional caller)

src/components/UploadForm.tsx    # wired: blocks Step 1→2 on validation failure
```

## What's validated

| Check | Source of truth | Failure example |
|---|---|---|
| Top-level is a JSON object | inherent | `"hello world"` |
| `schema_version` present and `>= 1` | `MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION` | missing field |
| `widgets` is an array | inherent | `widgets: "panel"` |
| `signals` is an array if present | inherent | `signals: 42` |
| Serialised JSON `<= 32768` bytes | firmware `LAYOUT_MAX_FILE_BYTES` | 100 KB layout |
| Every widget has a known `type` | `widgets.schema.json` | `type: "hologram_3d"` |
| Slot in bounds for slot-capped types | firmware `widget_*.c` | panel `slot: 99` |
| No duplicate slots within a type | firmware (silent overwrite at load) | two panels both `slot: 0` |
| Numeric fields within `min`/`max` | schema field metadata | `bg_opa: 9999` (max 255) |
| Select fields match an option | schema field `options[]` | `show_peak: 99` (valid 0..3) |

## What's NOT validated (intentional)

- **`signal_name` references** — signals are decoupled (the firmware signal
  registry resolves names at load time). A layout that references a missing
  signal is a runtime warning, not a layout-format error.
- **Color string format** — firmware accepts both `"#RRGGBB"` strings and raw
  numeric `0xRRGGBB` (legacy 565 encoding via `convertWidgetColors`). Either
  form is permitted.
- **Per-widget `to_json`/`from_json` quirks** — e.g. warning's
  `border_color_style` field is stored as `border_color` under `night.`
  overrides. The schema's `night_key` carries this remap for codegen, but
  the validator doesn't chase per-widget irregularities.
- **Select fields with `_raw_options`** — fields like `tx_bit_start` use
  dynamic `Array.from(...)` options. We only check selects with static
  `options: [{value, label}, ...]`.
- **Field types other than numeric/select** — color, font, image_picker,
  text, textarea, can_id, checkbox: no structural check (formats vary too
  much, and firmware tolerates legacy values).

## Permissive vs strict

The validator is **permissive on optional fields** and **strict on top-level
structure**. Older firmware-generated layouts that omit fields, store extra
unknown keys, or use legacy enum values still pass. Only genuine breakage
flags an error. This is by design — the marketplace shouldn't reject layouts
that real firmware will happily load.

## Slot caps

Hardcoded in `validate-layout.ts` (mirrors firmware's `widget_*.c`):

```ts
const SLOT_CAPS = {
  panel: 16,
  bar: 2,
  indicator: 2,
  warning: 8,
};
```

If firmware changes a cap, update this constant. Other widget types are
either singletons (`rpm_bar`, `meter`) or have no enforced cap (`image`,
`text`, `shape_panel`, `arc`, `toggle`, `button`, `shift_light`).

## Integration

### Client-side (today, Wave 2)

`src/components/UploadForm.tsx` parses the inner `.rdm` JSON and runs
`validateLayout()` synchronously. Validation errors render a red banner
under the file picker on Step 1 and disable the **Next** button until the
user picks a different file. Splash uploads (also `.rdm` files but with
different inner JSON) and DBC uploads bypass this check.

This is **client-side only** — a determined user could bypass it by
calling Supabase Storage directly with a service-role key. Acceptable for
an honesty-system marketplace; if the security model tightens later, see
"Server-side options" below.

### Server-side options (future)

The marketplace currently writes layouts to Supabase Storage from the
browser (RLS-gated). There is no server-side hook on the upload path. Three
ways to add real enforcement:

1. **Next.js API route + server-side upload.** Move the layout upload from
   the browser to `POST /api/upload-layout`. The route validates with
   `validateLayout()` and only then forwards to Supabase Storage with the
   service-role key. Costs: doubles upload bandwidth, adds latency.
2. **Supabase Edge Function trigger.** Configure a Storage trigger on the
   `layouts` bucket that runs the validator and quarantines / deletes the
   object on failure. Edge Functions are Deno; the validator is portable
   TypeScript with no Node-only deps, so it ports cleanly.
3. **Database trigger** on `layouts` row insert that calls a PostgreSQL
   function. Doesn't work for this — the validator needs the actual layout
   JSON, not just the row. Skip.

The stateless `POST /api/validate-layout` route already exists for any
caller that can't run TypeScript locally (CI checker, desktop studio,
future Edge Function). It returns the same `ValidateResult` shape.

## Updating the vendored schema

When firmware ships schema changes:

```bash
cd ~/workspace/rdm7-marketplace
cp ../RDM-7_Dash/schema/widgets.schema.json     src/lib/widget-schema/
cp ../RDM-7_Dash/schema/widgets.schema.meta.json src/lib/widget-schema/
# update the SHA in src/lib/widget-schema/SOURCE.md
npm test
```

Tests will fail loudly if the shape of the schema changed in a way that
breaks the validator's assumptions (e.g. a new top-level key in a widget
def, a new field `type`).

If firmware bumps `LAYOUT_SCHEMA_VERSION` and you want to start rejecting
older formats, bump `MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION` in
`validate-layout.ts`. The default policy is permissive — accept anything
`>= 1`.

If firmware adds a new slot-capped widget or changes a cap, update
`SLOT_CAPS` in `validate-layout.ts`.

## Running the tests

```bash
npm test         # one shot
npm run test:watch
```

Vitest was chosen because:
- No transpiler config needed (handles TS + ESM out of the box).
- Reads the vendored schema via `resolveJsonModule: true` (already
  enabled in `tsconfig.json`).
- Single dev dependency — no Babel, no ts-jest config sprawl.
