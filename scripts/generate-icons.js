/**
 * Regenerates the site icons from public/rdm-logo.png.
 *
 *   node scripts/generate-icons.js
 *
 * Outputs:
 *   src/app/favicon.ico       16 / 32 / 48 px (PNG-in-ICO) — browser tabs
 *   src/app/apple-icon.png    180 px, opaque — iOS home screen
 *   public/rdm-icon-512.png   512 px — Open Graph / social share
 *
 * Uses sharp, which ships as a Next.js dependency — no extra install needed.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "src/app");
const RED = "#e01616"; // sampled from the logo's red field

(async () => {
  // 1. Trim the transparent padding off the wordmark.
  const trimmed = await sharp(path.join(ROOT, "public/rdm-logo.png"))
    .trim({ threshold: 10 })
    .toBuffer();
  const t = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const { width: tw, height: th, channels: tc } = t.info;

  // The logo is the RDM block stacked over a "REAL-TIME DATA MONITORING"
  // tagline, separated by a blank row. That tagline is illegible below ~48px
  // and shrinks the letters, so cut at the first fully-transparent row and
  // keep the block only.
  let cut = th;
  for (let y = 1; y < th; y++) {
    let opaque = 0;
    for (let x = 0; x < tw; x++) if (t.data[(y * tw + x) * tc + 3] >= 40) opaque++;
    if (opaque === 0) { cut = y; break; }
  }
  const mark = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: tw, height: cut })
    .toBuffer();
  const markMeta = await sharp(mark).metadata();
  console.log(`logo ${tw}x${th} -> block ${tw}x${cut}`);

  // 2. Master tile: red rounded square with the wordmark centred. The mark's
  //    own red field merges into the tile, leaving white RDM on solid red.
  const S = 512;
  const markW = Math.round(S * 0.86);
  const markH = Math.round((markMeta.height / markMeta.width) * markW);
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">` +
      `<rect width="${S}" height="${S}" rx="${Math.round(S * 0.18)}" ry="${Math.round(S * 0.18)}" fill="${RED}"/>` +
      `</svg>`
  );
  const master = await sharp(tile)
    .composite([
      { input: await sharp(mark).resize(markW, markH, { kernel: "lanczos3" }).toBuffer(), gravity: "centre" },
    ])
    .png()
    .toBuffer();

  // 3. Pack 16/32/48 into a PNG-in-ICO container.
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

  // 4. iOS home screen — flattened, since iOS does not honour transparency.
  await sharp(master)
    .resize(180, 180, { kernel: "lanczos3" })
    .flatten({ background: RED })
    .png({ compressionLevel: 9 })
    .toFile(path.join(APP, "apple-icon.png"));
  console.log("src/app/apple-icon.png (180px)");

  // 5. Social share image.
  await sharp(master)
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, "public/rdm-icon-512.png"));
  console.log("public/rdm-icon-512.png (512px)");
})();
