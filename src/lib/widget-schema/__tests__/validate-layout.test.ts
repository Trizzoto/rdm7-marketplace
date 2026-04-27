/**
 * Vitest tests for validate-layout.ts.
 *
 * Coverage:
 *  - happy path
 *  - top-level shape errors
 *  - unknown widget type
 *  - oversized layout (32 KB cap)
 *  - numeric out-of-range
 *  - select option mismatch
 *  - slot bounds + duplicate slot detection
 *  - permissive on unknown extra keys
 */
import { describe, it, expect } from "vitest";
import {
  validateLayout,
  validateLayoutString,
  knownWidgetTypes,
  LAYOUT_MAX_FILE_BYTES,
} from "../validate-layout";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function basicValidLayout() {
  return {
    schema_version: 13,
    name: "test_layout",
    widgets: [
      {
        type: "panel",
        id: "panel_0",
        x: 0,
        y: 0,
        w: 155,
        h: 92,
        config: {
          slot: 0,
          decimals: 1,
          border_radius: 7,
        },
      },
      {
        type: "bar",
        id: "bar_0",
        x: -240,
        y: 209,
        w: 300,
        h: 30,
        config: {
          slot: 0,
          bar_min: 0,
          bar_max: 100,
        },
      },
    ],
    signals: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Happy path                                                         */
/* ------------------------------------------------------------------ */

describe("validateLayout — happy path", () => {
  it("accepts a basic well-formed layout", () => {
    const r = validateLayout(basicValidLayout());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stats.widget_count).toBe(2);
      expect(r.stats.signal_count).toBe(0);
      expect(r.stats.schema_version).toBe(13);
      expect(r.stats.serialised_bytes).toBeGreaterThan(0);
      expect(r.stats.serialised_bytes).toBeLessThan(LAYOUT_MAX_FILE_BYTES);
    }
  });

  it("accepts a layout with no widgets (empty array)", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [],
      signals: [],
    });
    expect(r.ok).toBe(true);
  });

  it("accepts older schema_version (>= 1) — backward compatible", () => {
    const r = validateLayout({
      schema_version: 1,
      widgets: [],
    });
    expect(r.ok).toBe(true);
  });

  it("tolerates unknown extra keys in widget.config", () => {
    const layout = basicValidLayout();
    layout.widgets[0].config = {
      ...layout.widgets[0].config,
      // @ts-expect-error — intentionally adding unknown key
      future_unknown_field: 42,
      legacy_dead_field: "still here",
    };
    const r = validateLayout(layout);
    expect(r.ok).toBe(true);
  });

  it("tolerates missing optional fields (firmware applies defaults)", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0 },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Top-level shape errors                                             */
/* ------------------------------------------------------------------ */

describe("validateLayout — top-level shape", () => {
  it("rejects non-object input", () => {
    const r = validateLayout("not a layout");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/JSON object/);
  });

  it("rejects null", () => {
    const r = validateLayout(null);
    expect(r.ok).toBe(false);
  });

  it("rejects array at top level", () => {
    const r = validateLayout([{ type: "panel" }]);
    expect(r.ok).toBe(false);
  });

  it("flags missing schema_version", () => {
    const r = validateLayout({ widgets: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => /schema_version/.test(e))).toBe(true);
    }
  });

  it("flags missing widgets array", () => {
    const r = validateLayout({ schema_version: 13 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => /widgets/.test(e))).toBe(true);
    }
  });

  it("flags signals as non-array if present", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [],
      signals: "not-an-array",
    });
    expect(r.ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Unknown widget type                                                */
/* ------------------------------------------------------------------ */

describe("validateLayout — unknown widget type", () => {
  it("rejects an unknown widget type with a clear message", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        { type: "hologram_3d", id: "h0", x: 0, y: 0, w: 100, h: 100, config: {} },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.find((e) => /unknown widget type/.test(e));
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/hologram_3d/);
      // Should list valid types as a hint.
      expect(msg).toMatch(/panel/);
    }
  });

  it("flags missing 'type' field on a widget", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [{ id: "x", config: {} }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => /missing.*type/.test(e))).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Oversized layout                                                   */
/* ------------------------------------------------------------------ */

describe("validateLayout — file size cap", () => {
  it("rejects a layout that exceeds 32 KB serialised", () => {
    // Stuff a giant signature into a tolerated extra key. Using 33 KB of
    // ASCII pads us cleanly past the cap.
    const big = "x".repeat(33 * 1024);
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          config: { slot: 0, label: big },
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.find((e) => /LAYOUT_MAX_FILE_BYTES|firmware limit/.test(e));
      expect(msg).toBeTruthy();
      expect(msg).toMatch(String(LAYOUT_MAX_FILE_BYTES));
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Numeric out-of-range                                               */
/* ------------------------------------------------------------------ */

describe("validateLayout — numeric bounds", () => {
  it("rejects a stepper field below min", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0, border_radius: -50 }, // schema min: 0
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.find((e) => /border_radius/.test(e));
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/min allowed is 0/);
    }
  });

  it("rejects a stepper field above max", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0, bg_opa: 9999 }, // schema max: 255
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.find((e) => /bg_opa/.test(e));
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/max allowed is 255/);
    }
  });

  it("accepts numeric values at the boundary", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0, bg_opa: 0, border_radius: 100 },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Select option mismatch                                             */
/* ------------------------------------------------------------------ */

describe("validateLayout — select options", () => {
  it("rejects a select value outside the schema's option set", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0, show_peak: 99 }, // valid: 0..3
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const msg = r.errors.find((e) => /show_peak/.test(e));
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/expected one of/);
    }
  });

  it("loose-matches numeric strings to numeric option values", () => {
    // Legacy layouts sometimes serialise selects as strings.
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 0, show_peak: "1" },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Slot bounds                                                        */
/* ------------------------------------------------------------------ */

describe("validateLayout — slot bounds", () => {
  it("rejects a panel with slot >= 16", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "panel",
          id: "p0",
          x: 0,
          y: 0,
          w: 155,
          h: 92,
          config: { slot: 16 },
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => /slot=16 out of range/.test(e))).toBe(true);
    }
  });

  it("rejects a bar with slot >= 2", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        {
          type: "bar",
          id: "b0",
          x: 0,
          y: 0,
          w: 300,
          h: 30,
          config: { slot: 5 },
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects duplicate slots within a single widget type", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        { type: "bar", id: "b0", x: 0, y: 0, w: 300, h: 30, config: { slot: 0 } },
        { type: "bar", id: "b1", x: 0, y: 0, w: 300, h: 30, config: { slot: 0 } },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => /duplicate slot/.test(e))).toBe(true);
    }
  });

  it("does NOT flag slot collisions across different widget types", () => {
    const r = validateLayout({
      schema_version: 13,
      widgets: [
        { type: "bar", id: "b0", x: 0, y: 0, w: 300, h: 30, config: { slot: 0 } },
        { type: "panel", id: "p0", x: 0, y: 0, w: 155, h: 92, config: { slot: 0 } },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  validateLayoutString                                               */
/* ------------------------------------------------------------------ */

describe("validateLayoutString", () => {
  it("returns a parse error for invalid JSON", () => {
    const r = validateLayoutString("{ not valid json");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]).toMatch(/not valid JSON/);
    }
  });

  it("validates a JSON-string layout", () => {
    const r = validateLayoutString(JSON.stringify(basicValidLayout()));
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  knownWidgetTypes                                                   */
/* ------------------------------------------------------------------ */

describe("knownWidgetTypes", () => {
  it("returns all 13 widget types from the schema", () => {
    const types = knownWidgetTypes();
    expect(types).toContain("panel");
    expect(types).toContain("rpm_bar");
    expect(types).toContain("bar");
    expect(types).toContain("indicator");
    expect(types).toContain("warning");
    expect(types).toContain("text");
    expect(types).toContain("meter");
    expect(types).toContain("image");
    expect(types).toContain("shape_panel");
    expect(types).toContain("arc");
    expect(types).toContain("toggle");
    expect(types).toContain("button");
    expect(types).toContain("shift_light");
    expect(types.length).toBe(13);
  });
});
