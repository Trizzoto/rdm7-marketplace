/**
 * Public surface for the widget-schema layout validator.
 *
 * Consumers should import from `@/lib/widget-schema` rather than reaching
 * into individual files.
 */

export {
  validateLayout,
  validateLayoutString,
  knownWidgetTypes,
  LAYOUT_MAX_FILE_BYTES,
  MIN_SUPPORTED_LAYOUT_SCHEMA_VERSION,
} from "./validate-layout";

export type {
  ValidateResult,
  ValidateOk,
  ValidateErr,
} from "./validate-layout";
