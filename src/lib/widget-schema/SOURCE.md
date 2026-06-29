# Vendored widget schema

`widgets.schema.json` and `widgets.schema.meta.json` are vendored from the
firmware repo (`RDM-7_Dash`).

| Source repo | `RDM-7_Dash` |
| Source path | `schema/widgets.schema.json`, `schema/widgets.schema.meta.json` |
| Source commit | `feature/widget-sys` HEAD `a0a210b3d0a4d7541fe0eb3bb361e1b7e8d67592` (schema last touched by `bbb60d2` — "pathbar number-positioning controls + VK Calais VFD cluster"). Adds the **`pathbar`** widget (16 total); new fields across existing widgets (`smoothing_ms`, `fill_dir`, meter/arc tick-image controls, `remember_state`, panel `peak_*`, warning `image_scale`, …); a per-field **`help`** tooltip key (meta-schema updated to allow it); richer `enabled_by` grammar (`field=a,b`, `&` AND). Still schema_version 1 / layout schema v14. |
| Vendored on | 2026-06-30 |

## Updating

When firmware ships schema changes:

1. `cp ../RDM-7_Dash/schema/widgets.schema.json     src/lib/widget-schema/widgets.schema.json`
2. `cp ../RDM-7_Dash/schema/widgets.schema.meta.json src/lib/widget-schema/widgets.schema.meta.json`
3. Update the **Source commit** above to the new firmware HEAD SHA.
4. Run `npm test` — the validator tests will catch any breaking shape changes.
5. If the firmware bumps `LAYOUT_SCHEMA_VERSION`, also bump
   `MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION` in `validate-layout.ts` if you intend
   to start rejecting older firmware-generated layouts. The default policy is
   permissive — accept anything `>= 1`.

The schema describes the **editor inspector** form fields, not the firmware
persistence format. The validator in `validate-layout.ts` uses the schema to
sanity-check fields stored under `widget.config.<field_name>`.

See `docs/LAYOUT_VALIDATION.md` for what's actually validated.
