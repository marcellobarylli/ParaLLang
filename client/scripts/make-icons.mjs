// Round 114: writes the web app's icons into client/public/ (an archway, gold on night blue): the SVG favicon and the
// PNGs the manifest and iOS ask for. Pure Node (zlib), no image library. Run: node client/scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/', import.meta.url);
const BG = [13, 13, 26];
const GOLD = [228, 184, 71];
const GLOW = [192, 140, 255];

// Shapes in unit coordinates (y down), scaled about the centre by `scale` (the maskable icon keeps a safe margin).
function colourAt(x0, y0, scale) {
  const x = 0.5 + (x0 - 0.5) / scale;
  const y = 0.5 + (y0 - 0.5) / scale;
  const inArch = (left, right, cy, r, bottom) => x >= left && x <= right && y <= bottom && (y >= cy || Math.hypot(x - 0.5, y - cy) <= r);
  if (Math.hypot(x - 0.5, y - 0.13) <= 0.04) return GLOW;
  if (y >= 0.84 && y <= 0.89 && x >= 0.16 && x <= 0.84) return GOLD;
  if (inArch(0.22, 0.78, 0.5, 0.28, 0.84) && !inArch(0.34, 0.66, 0.54, 0.16, 0.85)) return GOLD;
  return BG;
}

function png(size, scale) {
  const samples = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colourAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size, scale);
          for (let k = 0; k < 3; k++) sum[k] += c[k];
        }
      }
      for (let k = 0; k < 3; k++) row[1 + px * 3 + k] = Math.round(sum[k] / samples ** 2);
    }
    rows.push(row);
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${hex(BG)}"/>
  <path fill="${hex(GOLD)}" fill-rule="evenodd" d="M22 84V50A28 28 0 0 1 78 50V84ZM34 85V54A16 16 0 0 1 66 54V85Z"/>
  <rect x="16" y="84" width="68" height="5" fill="${hex(GOLD)}"/>
  <circle cx="50" cy="13" r="4" fill="${hex(GLOW)}"/>
</svg>
`;

writeFileSync(new URL('parallang-icon.svg', OUT), svg);
writeFileSync(new URL('parallang-icon-192.png', OUT), png(192, 1));
writeFileSync(new URL('parallang-icon-512.png', OUT), png(512, 1));
writeFileSync(new URL('parallang-icon-maskable-512.png', OUT), png(512, 0.72));
writeFileSync(new URL('parallang-icon-apple-touch.png', OUT), png(180, 0.86));
console.log('wrote client/public/parallang-icon*.{svg,png}');
