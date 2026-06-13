/**
 * Helpers for deep-linking into RDM Studio to auto-generate a layout preview.
 *
 * Studio (the separate web app with the WASM renderer) loads the layout, runs
 * the simulation to a fixed "demo pose", captures the canvas, and POSTs the
 * image back to /api/layout-screenshot using a capture token. These helpers
 * just build the URL; minting the token happens via /api/capture-token.
 */

const STUDIO_PROD = "https://studio.realtimedatamonitoring.com.au";

/**
 * Resolve which Studio to open. On localhost we target the local Studio dev
 * server (localhost:3002) so the capture round-trip stays within one
 * environment — a token minted by the local marketplace only verifies against
 * the local endpoint, so prod Studio → local marketplace would fail.
 */
export function studioBase(): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:3002";
  }
  return STUDIO_PROD;
}

/**
 * Build a Studio deep-link that opens the layout, runs the simulation, captures
 * a "demo pose" frame, and POSTs it back to /api/layout-screenshot.
 */
export function studioCaptureUrl(
  layoutId: string,
  rdmUrl: string,
  name: string,
  captureToken: string,
): string {
  const params = new URLSearchParams({
    import: rdmUrl,
    importName: name,
    source: "marketplace",
    layoutId,
    autoSim: "1",
    capture: "1",
    captureToken,
  });
  return `${studioBase()}?${params.toString()}`;
}

/**
 * URL for the pre-publish PREVIEW mode. Here Studio receives the .rdm bytes over
 * postMessage (no public URL exists yet), renders the demo pose, and posts the
 * captured image back to the opener — nothing touches the marketplace DB or
 * storage until the user actually publishes. Distinct from studioCaptureUrl,
 * which is for already-published layouts and POSTs to /api/layout-screenshot.
 */
export function studioPreviewUrl(cacheBust?: string | number): string {
  const params = new URLSearchParams({ capture: "preview", source: "marketplace" });
  // Bust the browser cache for Studio's index.html so the iframe always runs the
  // current build (its WASM/font assets keep their own cached URLs). Without this,
  // a previously-cached Studio can load and silently skip the preview flow.
  if (cacheBust !== undefined) params.set("cb", String(cacheBust));
  return `${studioBase()}?${params.toString()}`;
}
