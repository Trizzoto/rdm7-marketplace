/**
 * Regenerates the site icons from public/rdm-logo-hires.png.
 *
 *   node scripts/generate-icons.js
 *
 * Outputs:
 *   src/app/favicon.ico       16 / 32 / 48 px (PNG-in-ICO) — browser tabs
 *   src/app/apple-icon.png    180 px — iOS home screen
 *   public/rdm-icon-512.png   512 px — Open Graph / social share
 *
 * The full RDM lockup (red block + "REALTIME DATA MONITORING") on a black
 * square. The tagline is white on transparent, so black is what makes it
 * readable — on the old red tile it was invisible.
 *
 * Uses sharp, which ships as a Next.js dependency — no extra install needed.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "src/app");
const BG = "#000000";
const FILL = 0.96; // share of the tile width the logo occupies

(async () => {
  // Trim the transparent surround so the lockup itself drives the fit.
  const mark = await sharp(path.join(ROOT, "public/rdm-logo-hires.png"))
    .trim({ threshold: 10 })
    .toBuffer();
  const { width: mw, height: mh } = await sharp(mark).metadata();
  console.log(`lockup ${mw}x${mh}`);

  // Master tile: black square, logo centred at FILL of the width.
  const S = 512;
  const w = Math.round(S * FILL);
  const h = Math.round((mh / mw) * w);
  const master = await sharp({
    create: { width: S, height: S, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(mark).resize(w, h, { kernel: "lanczos3" }).toBuffer(),
        gravity: "centre",
      },
    ])
    .png()
    .toBuffer();

  // Pack 16/32/48 into a PNG-in-ICO container.
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((s) =>
      sharp(master).resize(s, s, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer()
    )
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + pngs.length * 16;
  const entries = pngs.map((png, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i], 0); // width
    e.writeUInt8(sizes[i], 1); // height
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  fs.writeFileSync(path.join(APP, "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));
  console.log(`src/app/favicon.ico (${sizes.join("/")}px, ${offset} bytes)`);

  await sharp(master)
    .resize(180, 180, { kernel: "lanczos3" })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toFile(path.join(APP, "apple-icon.png"));
  console.log("src/app/apple-icon.png (180px)");

  await sharp(master)
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, "public/rdm-icon-512.png"));
  console.log("public/rdm-icon-512.png (512px)");

  // Zoomed strip for eyeballing the small sizes.
  if (process.env.ICON_PREVIEW) {
    const z = 8;
    const gap = 16;
    const blown = await Promise.all(
      sizes.map((s, i) => sharp(pngs[i]).resize(s * z, s * z, { kernel: "nearest" }).toBuffer())
    );
    const totalW = sizes.reduce((a, s) => a + s * z + gap, gap);
    const totalH = 48 * z + gap * 2;
    let x = gap;
    const comps = blown.map((b, i) => {
      const c = { input: b, left: x, top: Math.round((totalH - sizes[i] * z) / 2) };
      x += sizes[i] * z + gap;
      return c;
    });
    await sharp({ create: { width: totalW, height: totalH, channels: 4, background: "#3a3a3a" } })
      .composite(comps)
      .png()
      .toFile(process.env.ICON_PREVIEW);
    console.log(`preview -> ${process.env.ICON_PREVIEW}`);
  }
})();
