// Generates pwa-192.png and pwa-512.png using only built-in Node modules.
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4);   l.writeUInt32BE(data.length, 0);
  const cr = Buffer.alloc(4);  cr.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, cr]);
}

function createIcon(size) {
  const cx = size / 2, cy = size / 2;
  const outerRing = size * 0.44;
  const innerDark  = size * 0.34;
  const cornerR   = size * 0.22;
  const rowBytes  = 1 + size * 3;
  const raw = Buffer.alloc(size * rowBytes);
  const lineH  = Math.round(size * 0.24);
  const lineW  = Math.round(size * 0.04);
  const lineGap = Math.round(size * 0.10);
  const lineY0 = Math.round(cy - lineH / 2);
  const lines = [
    { x: Math.round(cx - lineGap), y0: lineY0, y1: lineY0 + lineH },
    { x: Math.round(cx),           y0: lineY0, y1: lineY0 + lineH },
    { x: Math.round(cx + lineGap), y0: lineY0, y1: lineY0 + lineH },
  ];
  const inLine = (x, y) =>
    lines.some(l => x >= l.x - lineW && x <= l.x + lineW && y >= l.y0 && y <= l.y1);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const inBg = (() => {
        const ex = Math.max(0, Math.abs(dx) - (size / 2 - cornerR));
        const ey = Math.max(0, Math.abs(dy) - (size / 2 - cornerR));
        return Math.sqrt(ex * ex + ey * ey) <= cornerR;
      })();
      const off = y * rowBytes + 1 + x * 3;
      if (!inBg) {
        raw[off] = 10; raw[off+1] = 10; raw[off+2] = 15;
      } else if (d >= innerDark && d <= outerRing) {
        const t = 1 - Math.abs(d - (outerRing + innerDark) / 2) / ((outerRing - innerDark) / 2);
        const brightness = 0.7 + 0.3 * Math.max(0, t);
        raw[off]   = Math.round(201 * brightness);
        raw[off+1] = Math.round(147 * brightness);
        raw[off+2] = Math.round(58  * brightness);
      } else if (d < innerDark && inLine(x, y)) {
        raw[off] = 201; raw[off+1] = 147; raw[off+2] = 58;
      } else {
        raw[off] = 14; raw[off+1] = 12; raw[off+2] = 18;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'pwa-192.png'), createIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512.png'), createIcon(512));
console.log('Icons created: pwa-192.png pwa-512.png');
