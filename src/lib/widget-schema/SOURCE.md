# Vendored widget schema

`widgets.schema.json` and `widgets.schema.meta.json` are vendored from the
firmware repo (`RDM-7_Dash`).

| Source repo | `RDM-7_Dash` |
| Source path | `schema/widgets.schema.json`, `schema/widgets.schema.meta.json` |
| Source commit | **`b44e9d3220341e210dba633cd20f03c3bbc6462b`** (file commit; HEAD at vendor time `95ae13cb26c5f3d255e913ec7808cfeb9cfa1ec1`, branch `feature/widget-sys`) |
| Vendored on | 2026-04-27 |

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
