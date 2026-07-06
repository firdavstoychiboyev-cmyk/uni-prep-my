import sharp from "sharp";
import { writeFileSync } from "fs";

const SRC = "scripts/logo-source.jpg";

// Circular crop with a transparent background. The source has a white margin +
// white corners; we zoom ~6% so the sesame crust reaches the edge, then mask to
// a circle so nothing white remains around the round kulcha.
async function circle(size) {
  const zoom = Math.round(size * 1.06);
  const off = Math.round((zoom - size) / 2);
  const base = await sharp(SRC)
    .resize(zoom, zoom, { fit: "cover", position: "center" })
    .extract({ left: off, top: off, width: size, height: size })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff"/></svg>`
  );
  return sharp(base)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// Web/app assets
writeFileSync("public/logo-mark.png", await circle(512));
writeFileSync("src/app/icon.png", await circle(512));
writeFileSync("src/app/apple-icon.png", await circle(180));

// favicon.ico — wrap a 64px circular PNG in a minimal ICO container (ICO can
// hold PNG data). sharp can't emit .ico directly, so we build the header.
const png = await circle(64);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);          // reserved
header.writeUInt16LE(1, 2);          // type: icon
header.writeUInt16LE(1, 4);          // image count
header.writeUInt8(64, 6);            // width
header.writeUInt8(64, 7);            // height
header.writeUInt8(0, 8);             // palette
header.writeUInt8(0, 9);             // reserved
header.writeUInt16LE(1, 10);         // color planes
header.writeUInt16LE(32, 12);        // bits per pixel
header.writeUInt32LE(png.length, 14);// image size
header.writeUInt32LE(22, 18);        // offset
writeFileSync("src/app/favicon.ico", Buffer.concat([header, png]));

console.log("logo assets generated");
