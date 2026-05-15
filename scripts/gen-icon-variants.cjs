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
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, cr]);
}

function makePNG(size, drawFn) {
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(size * rowBytes);
  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < size; x++) {
      const off = y * rowBytes + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, size);
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a ?? 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG   = [10, 10, 15];
const GOLD = [201, 147, 58];
const GOLD2= [240, 195, 100];
const RED  = [230, 57, 70];
const BLUE = [69, 123, 157];
const WHITE= [245, 240, 232];
const DARK = [20, 18, 28];

function blend(fg, bg, t) {
  return fg.map((v,i) => Math.round(bg[i] + (v - bg[i]) * t));
}
function aa(d, width=1.2) {
  return Math.max(0, Math.min(1, -d / width + 0.5));
}

function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.sqrt(Math.max(0, qx) ** 2 + Math.max(0, qy) ** 2) +
    Math.min(0, Math.max(qx, qy)) - r;
}

function icon1(x, y, S) {
  const cx = S/2, cy = S/2;
  const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
  const r = S * 0.44;
  const bgSDF = sdRoundRect(x, y, cx, cy, S*0.44, S*0.44, S*0.12);
  const bgA = aa(bgSDF);
  if (bgA <= 0) return [...BG, 0];
  const t = d / r;
  let color;
  if      (t < 0.18)  color = GOLD2;
  else if (t < 0.30)  color = DARK;
  else if (t < 0.52)  color = GOLD;
  else if (t < 0.64)  color = DARK;
  else if (t < 0.85)  color = [...GOLD.map(v=>Math.round(v*0.8))];
  else if (t < 0.95)  color = DARK;
  else                color = DARK;
  const c = blend(color, BG, bgA);
  return [...c, 255];
}

function icon2(x, y, S) {
  const cx = S/2, cy = S/2;
  const hw = S*0.38, r = S*0.12;
  const dieSDF = sdRoundRect(x, y, cx, cy, hw, hw, r);
  const dieA = aa(dieSDF, 1.5);
  const borderA = aa(dieSDF + S*0.035, 1.5);
  if (dieA <= 0 && borderA <= 0) return [...BG, 0];
  const dotR = S * 0.072;
  const off  = S * 0.22;
  const dots = [
    [cx - off, cy - off], [cx + off, cy - off],
    [cx - off, cy],       [cx + off, cy],
    [cx - off, cy + off], [cx + off, cy + off],
  ];
  for (const [dx, dy] of dots) {
    const dd = Math.sqrt((x-dx)**2 + (y-dy)**2);
    if (dd < dotR) {
      const a2 = aa(dd - dotR + 1);
      if (a2 > 0) {
        const c = blend(DARK, WHITE, a2);
        return [...c, 255];
      }
    }
  }
  if (borderA > 0 && dieA <= 0) {
    const ringT = 1 - (dieSDF + S*0.035) / (S*0.035);
    const c = blend(GOLD, BG, Math.min(1, Math.max(0, ringT)) * borderA);
    return [...c, 255];
  }
  const face = blend(WHITE, BG, dieA);
  return [...face, 255];
}

function icon3(x, y, S) {
  const cx = S/2, cy = S/2;
  const bgSDF = sdRoundRect(x, y, cx, cy, S*0.44, S*0.44, S*0.12);
  const bgA = aa(bgSDF);
  if (bgA <= 0) return [...BG, 0];
  const nx = (x - cx) / S + 0.5;
  const ny = (y - cy) / S + 0.5;
  const baseTop = 0.57, baseBot = 0.69;
  const sideL = 0.13, sideR = 0.87;
  const inBase = nx >= sideL && nx <= sideR && ny >= baseTop && ny <= baseBot;
  const peaks = [
    [0.50, 0.26],
    [0.26, 0.38],
    [0.74, 0.38],
    [0.13, 0.57],
    [0.87, 0.57],
  ];
  const peakBaseY = baseTop;
  const peakHalfW = [0.12, 0.10, 0.10, 0.10, 0.10];
  let inPeak = false;
  for (let i = 0; i < peaks.length; i++) {
    const [px, ptip] = peaks[i];
    const hw = peakHalfW[i];
    const pbase = peakBaseY;
    if (ny >= ptip && ny <= pbase) {
      const t = (ny - ptip) / (pbase - ptip);
      const halfW = hw * t;
      if (nx >= px - halfW && nx <= px + halfW) {
        inPeak = true; break;
      }
    }
  }
  if (inBase || inPeak) {
    const brightness = inPeak ? 1.1 : 0.9;
    const g = GOLD.map(v => Math.min(255, Math.round(v * brightness)));
    const c = blend(g, BG, bgA);
    return [...c, 255];
  }
  return [...blend(BG, BG, 1), Math.round(bgA * 255)];
}

function icon4(x, y, S) {
  const cx = S/2, cy = S/2;
  const bgSDF = sdRoundRect(x, y, cx, cy, S*0.44, S*0.44, S*0.12);
  const bgA = aa(bgSDF);
  if (bgA <= 0) return [...BG, 0];
  const nx = (x - cx) / S + 0.5;
  const ny = (y - cy) / S + 0.5;
  const cupTop = 0.16, cupBot = 0.56;
  const cupTopW = 0.33, cupBotW = 0.18;
  let inCup = false;
  if (ny >= cupTop && ny <= cupBot) {
    const t = (ny - cupTop) / (cupBot - cupTop);
    const halfW = cupTopW - (cupTopW - cupBotW) * t;
    if (nx >= 0.5 - halfW && nx <= 0.5 + halfW) inCup = true;
  }
  const handleTop = 0.24, handleBot = 0.46;
  const handleInnerX = [0.5 - cupTopW + 0.02, 0.5 + cupTopW - 0.02];
  const handleOuterX = [0.5 - cupTopW - 0.12, 0.5 + cupTopW + 0.12];
  const handleW = 0.06;
  let inHandle = false;
  if (ny >= handleTop && ny <= handleBot) {
    const lInner = handleInnerX[0], lOuter = handleOuterX[0];
    if (nx >= lOuter && nx <= lInner + handleW) inHandle = true;
    const rInner = handleInnerX[1], rOuter = handleOuterX[1];
    if (nx >= rInner - handleW && nx <= rOuter) inHandle = true;
  }
  const stemTop = 0.56, stemBot = 0.70, stemHW = 0.06;
  const inStem = ny >= stemTop && ny <= stemBot &&
    nx >= 0.5 - stemHW && nx <= 0.5 + stemHW;
  const baseTop = 0.70, baseBot = 0.78, baseHW = 0.28;
  const inBaseEl = ny >= baseTop && ny <= baseBot &&
    nx >= 0.5 - baseHW && nx <= 0.5 + baseHW;
  const sny = ny - 0.36, snx = nx - 0.5;
  const angle = Math.atan2(sny, snx);
  const r = Math.sqrt(snx**2 + sny**2);
  const starR = 0.09 + 0.05 * Math.cos(5 * angle);
  const inStar = r < starR && ny >= cupTop && ny <= cupBot;
  if (inStar) {
    const c = blend(GOLD2, BG, bgA);
    return [...c, 255];
  }
  if (inCup || inHandle || inStem || inBaseEl) {
    const c = blend(GOLD, BG, bgA);
    return [...c, 255];
  }
  return [...BG, Math.round(bgA * 255)];
}

function icon5(x, y, S) {
  const cx = S/2, cy = S/2;
  const bgSDF = sdRoundRect(x, y, cx, cy, S*0.44, S*0.44, S*0.12);
  const bgA = aa(bgSDF);
  if (bgA <= 0) return [...BG, 0];
  const dx = (x - cx) / S, dy = (y - cy) / S;
  const r   = Math.sqrt(dx**2 + dy**2);
  const ang = Math.atan2(dy, dx) + Math.PI/2;
  const innerR = 0.17, outerR = 0.38;
  const n = 5;
  const sector = (((ang % (2*Math.PI / n)) + 2*Math.PI) % (2*Math.PI / n));
  const halfSector = Math.PI / n;
  const localAng = Math.abs(sector - halfSector);
  const starR = innerR * outerR / Math.sqrt(
    (innerR * Math.sin(localAng))**2 + (outerR * Math.cos(localAng))**2
  );
  const inside = r < starR;
  const border = r < starR + 0.025;
  if (inside) {
    const t = 1 - r / starR;
    const g = blend(GOLD2, GOLD, t);
    const c = blend(g, BG, bgA);
    return [...c, 255];
  }
  if (border) {
    const a2 = (starR + 0.025 - r) / 0.025;
    const g = blend(GOLD, BG, a2 * bgA);
    return [...g, 255];
  }
  if (r < 0.46 && r > 0.38) {
    const glow = Math.max(0, 1 - (r - 0.38) / 0.08) * 0.3;
    const g = blend(GOLD, BG, glow * bgA);
    return [...g, 255];
  }
  return [...BG, Math.round(bgA * 255)];
}

const outDir = path.join(__dirname, '..', 'public');
const SIZE = 192;

[icon1, icon2, icon3, icon4, icon5].forEach((fn, i) => {
  const file = path.join(outDir, `icon-preview-${i+1}.png`);
  fs.writeFileSync(file, makePNG(SIZE, fn));
  console.log(`icon-preview-${i+1}.png ✓`);
});
