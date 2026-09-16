// PROTOTYPE (ticket 10), throwaway. Two market-map chart treatments inside slide 3's decided frame
// (title + subtitle left, full-height navy callout sidebar right), each built on two datasets:
//   usft   - the US Fleet Tracking placements from ticket 06 (illustrative, unverified)
//   stress - 9 competitors, 5 crowded into the target's quadrant, one empty quadrant,
//            a synthetic ~10:1 wide logo ("Northwind Fleet", not a real company) and one text wordmark
// Treatments:
//   free   - L-shaped axes on a tinted band; the model gives each logo 0..1 coordinates; code nudges
//            overlaps apart inside the logo's quadrant and flags (red) whatever it cannot resolve
//   packed - four labelled cells; the model gives only each company's cell; code packs uniform slots
// Usage: node build.js  -> out/*.pptx (one slide each, plus all.pptx), then qlmanage renders ql/*.png
const fs = require('fs');
const path = require('path');
const P06 = path.join(__dirname, '../06-slide-prototype');
const sharp = require(path.join(P06, 'node_modules/sharp'));
const PptxGenJS = require(path.join(P06, 'node_modules/pptxgenjs'));

const W = 13.333; const H = 7.5; const FONT = 'Arial';
const C = { navy: '09142F', teal: '009384', grey: '6B7280', ink: '333F55', band: 'EEF3F9', cell: 'F3F6FA', red: 'E11D48' };
// Proposed fixed type scale for slide 3 (smaller than ticket 06's 30/17/15/12.5)
const T = { title: 24, subtitle: 13, axisCat: 10.5, axisName: 8, callout: 11.5, wordmark: 11 };
// Logo sizing: equal optical area, capped by the box, never past 150 px per placed inch, wordmark below MIN_H
const BOX_W = 1.45; const BOX_H = 0.42; const AREA = 0.25; const MIN_H = 0.14; const PPI = 150;
const SIDE_X = 9.45;
const LOGOS = path.join(P06, 'logos');
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'work'), { recursive: true });

const copy = {
  title: 'The opportunity for US Fleet Tracking',
  subtitle: 'Fleet telematics splits between enterprise platforms and simple trackers for small fleets',
  y: { name: 'Fleet segment focus', hi: 'SMB commercial fleets', lo: 'Enterprise and large fleets' },
  x: { name: 'Commitment model', lo: 'Contract-bundled platform', hi: 'No-contract live tracking' },
  take: 'US Fleet Tracking wins small fleets that want fast tracking without a contract',
  dynamics: ['Enterprise platforms bundle long contracts and features small fleets rarely use', 'AI-first entrants chase trucking compliance more than quick live tracking'],
  proposal: 'US Fleet Tracking can add AI scoring to the GPS and video it streams',
};
// qx/qy: 0..1 over the whole grid (0,0 = bottom-left). Packed cells use only which half each falls in.
const datasets = {
  usft: [
    { name: 'US Fleet Tracking', logo: 'usft.png', qx: 0.76, qy: 0.84, target: true },
    { name: 'Azuga', logo: 'azuga.png', qx: 0.1, qy: 0.86 },
    { name: 'GPS Insight', logo: 'gpsinsight.png', qx: 0.39, qy: 0.86 },
    { name: 'Force Fleet Tracking', logo: 'forcebyrocket.png', qx: 0.24, qy: 0.62 },
    { name: 'Linxup', logo: 'linxup.png', qx: 0.66, qy: 0.62 },
    { name: 'Samsara', logo: 'samsara.png', qx: 0.1, qy: 0.36 },
    { name: 'Verizon Connect', logo: 'verizon.png', qx: 0.39, qy: 0.36 },
    { name: 'Geotab', logo: 'geotab.png', qx: 0.1, qy: 0.13 },
    { name: 'Teletrac Navman', logo: 'teletrac.png', qx: 0.39, qy: 0.13 },
    { name: 'Motive', logo: 'motive.png', qx: 0.76, qy: 0.2 },
  ],
  // Coordinates clustered the way a model tends to cluster them
  stress: [
    { name: 'US Fleet Tracking', logo: 'usft.png', qx: 0.72, qy: 0.8, target: true },
    { name: 'Linxup', logo: 'linxup.png', qx: 0.62, qy: 0.72 },
    { name: 'Force Fleet Tracking', logo: 'forcebyrocket.png', qx: 0.8, qy: 0.7 },
    { name: 'GPS Insight', logo: 'gpsinsight.png', qx: 0.68, qy: 0.88 },
    { name: 'Northwind Fleet', logo: 'WIDE', qx: 0.85, qy: 0.85 },
    { name: 'Samsara', logo: 'samsara.png', qx: 0.15, qy: 0.3 },
    { name: 'Geotab', logo: 'geotab.png', qx: 0.3, qy: 0.15 },
    { name: 'Verizon Connect', logo: 'verizon.png', qx: 0.2, qy: 0.12 },
    { name: 'Motive', logo: 'motive.png', qx: 0.8, qy: 0.25 },
    { name: 'Fleetio', wordmark: true, qx: 0.7, qy: 0.3 },
  ],
};

// ---------- assets ----------
let WIDE_FILE;
async function makeWideLogo() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="160"><text x="10" y="120" font-family="Arial" font-weight="700" font-size="112" fill="#1F4E79">Northwind Fleet</text></svg>`;
  WIDE_FILE = path.join(__dirname, 'work', 'northwind-wide.png');
  await sharp(Buffer.from(svg)).trim().png().toFile(WIDE_FILE);
}
const meta = {};
async function dims(file) { if (!meta[file]) { const m = await sharp(file).metadata(); meta[file] = { w: m.width, h: m.height }; } return meta[file]; }
async function sizeFor(co) {
  const wordmark = () => ({ w: Math.min(BOX_W, 0.085 * co.name.length + 0.1), h: 0.24, file: null });
  if (co.wordmark) return wordmark();
  const file = co.logo === 'WIDE' ? WIDE_FILE : path.join(LOGOS, co.logo);
  const d = await dims(file); const ar = d.w / d.h;
  let w = Math.sqrt(AREA * ar); let h = w / ar;
  if (w > BOX_W) { w = BOX_W; h = w / ar; }
  if (h > BOX_H) { h = BOX_H; w = h * ar; }
  if (w > d.w / PPI) { w = d.w / PPI; h = w / ar; }
  return h < MIN_H ? wordmark() : { w, h, file };
}
function drawCo(slide, co, cx, cy, sz, flagged) {
  if (co.target) slide.addShape('roundRect', { x: cx - sz.w / 2 - 0.13, y: cy - sz.h / 2 - 0.1, w: sz.w + 0.26, h: sz.h + 0.2, fill: { color: 'FFFFFF' }, line: { color: C.teal, width: 1.25 }, rectRadius: 0.06 });
  if (sz.file) slide.addImage({ path: sz.file, x: cx - sz.w / 2, y: cy - sz.h / 2, w: sz.w, h: sz.h });
  else slide.addText(co.name, { x: cx - sz.w / 2, y: cy - sz.h / 2, w: sz.w, h: sz.h, fontFace: FONT, fontSize: T.wordmark, bold: true, color: C.navy, align: 'center', valign: 'middle', margin: 0 });
  if (flagged) slide.addShape('rect', { x: cx - sz.w / 2 - 0.03, y: cy - sz.h / 2 - 0.03, w: sz.w + 0.06, h: sz.h + 0.06, fill: { type: 'none' }, line: { color: C.red, width: 1.5, dashType: 'dash' } });
}

// ---------- shared frame (decided in ticket 06) ----------
function frame(slide) {
  slide.addText(copy.title, { x: 0.7, y: 0.5, w: SIDE_X - 1.1, h: 0.6, fontFace: FONT, fontSize: T.title, color: C.navy, valign: 'middle', margin: 0 });
  slide.addText(copy.subtitle, { x: 0.7, y: 1.12, w: SIDE_X - 1.1, h: 0.45, fontFace: FONT, fontSize: T.subtitle, color: C.grey, valign: 'top', margin: 0 });
  slide.addShape('rect', { x: SIDE_X, y: 0, w: W - SIDE_X, h: H, fill: { color: C.navy }, line: { type: 'none' } });
  const bullet = { code: '25AA', indent: 14 };
  slide.addText([
    { text: 'Our take: ', options: { bold: true } }, { text: copy.take, options: { breakLine: true } },
    ...copy.dynamics.map((d) => ({ text: d, options: { bullet, breakLine: true } })),
    { text: copy.proposal, options: { bullet, underline: { style: 'sng' } } },
  ], { x: SIDE_X + 0.45, y: 2.05, w: W - SIDE_X - 0.9, h: 4.4, fontFace: FONT, fontSize: T.callout, color: 'FFFFFF', valign: 'top', margin: 0, paraSpaceAfter: 10, lineSpacingMultiple: 1.15 });
}
const axisName = (slide, text, o) => slide.addText(text.toUpperCase(), { fontFace: FONT, fontSize: T.axisName, color: C.grey, charSpacing: 1, margin: 0, ...o });
const axisCat = (slide, text, o) => slide.addText(text, { fontFace: FONT, fontSize: T.axisCat, bold: true, color: C.navy, margin: 0, ...o });

// ---------- treatment: free placement ----------
async function free(slide, cos, opts = {}) {
  slide.addShape('rect', { x: 0, y: 1.95, w: SIDE_X, h: H - 1.95, fill: { color: C.band }, line: { type: 'none' } });
  const gx = 2.35; const gy = 2.4; const gw = SIDE_X - 0.45 - gx; const gh = 3.8;
  if (opts.dividers) { // faint midlines so the two categories per axis read unambiguously
    slide.addShape('line', { x: gx + gw / 2, y: gy, w: 0, h: gh, line: { color: 'FFFFFF', width: 2 } });
    slide.addShape('line', { x: gx, y: gy + gh / 2, w: gw, h: 0, line: { color: 'FFFFFF', width: 2 } });
  }
  slide.addShape('line', { x: gx, y: gy, w: 0, h: gh, line: { color: C.navy, width: 0.75 } });
  slide.addShape('line', { x: gx, y: gy + gh, w: gw, h: 0, line: { color: C.navy, width: 0.75 } });
  axisName(slide, copy.y.name, { x: 0.5, y: gy - 0.3, w: gx - 0.7, h: 0.2, align: 'right' });
  axisCat(slide, copy.y.hi, { x: 0.5, y: gy, w: gx - 0.7, h: gh / 2, align: 'right', valign: 'middle' });
  axisCat(slide, copy.y.lo, { x: 0.5, y: gy + gh / 2, w: gx - 0.7, h: gh / 2, align: 'right', valign: 'middle' });
  axisCat(slide, copy.x.lo, { x: gx, y: gy + gh + 0.14, w: gw / 2, h: 0.25, align: 'center' });
  axisCat(slide, copy.x.hi, { x: gx + gw / 2, y: gy + gh + 0.14, w: gw / 2, h: 0.25, align: 'center' });
  axisName(slide, copy.x.name, { x: gx, y: gy + gh + 0.5, w: gw, h: 0.2, align: 'center' });
  // inner plotting area and per-quadrant bounds
  const ix = gx + 0.2; const iy = gy + 0.12; const iw = gw - 0.3; const ih = gh - 0.24;
  const items = [];
  for (const co of cos) {
    const sz = await sizeFor(co); const pad = co.target ? 0.13 : 0;
    items.push({ co, sz, cx: ix + co.qx * iw, cy: iy + (1 - co.qy) * ih, w: sz.w + 2 * pad, h: sz.h + 2 * pad,
      q: { x0: co.qx >= 0.5 ? ix + iw / 2 : ix, x1: co.qx >= 0.5 ? ix + iw : ix + iw / 2, y0: co.qy >= 0.5 ? iy : iy + ih / 2, y1: co.qy >= 0.5 ? iy + ih / 2 : iy + ih } });
  }
  const GAP = 0.2;
  for (let it = 0; it < 400; it++) {
    let moved = false;
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i]; const b = items[j];
      const ox = (a.w + b.w) / 2 + GAP - Math.abs(a.cx - b.cx); const oy = (a.h + b.h) / 2 + GAP - Math.abs(a.cy - b.cy);
      if (ox > 0 && oy > 0) {
        moved = true;
        if (ox < oy) { const s = (a.cx < b.cx ? -1 : 1) * ox / 2; a.cx += s; b.cx -= s; } else { const s = (a.cy < b.cy ? -1 : 1) * oy / 2; a.cy += s; b.cy -= s; }
      }
    }
    for (const a of items) {
      a.cx = Math.min(Math.max(a.cx, a.q.x0 + a.w / 2), a.q.x1 - a.w / 2);
      a.cy = Math.min(Math.max(a.cy, a.q.y0 + a.h / 2), a.q.y1 - a.h / 2);
    }
    if (!moved) break;
  }
  const bad = new Set();
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i]; const b = items[j];
    if (Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 + 0.04 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 + 0.04) { bad.add(a); bad.add(b); }
  }
  for (const it of items) drawCo(slide, it.co, it.cx, it.cy, it.sz, bad.has(it));
  return bad.size ? `${bad.size} logos still touching after code nudging (red): render repair needed` : 'no collisions after code nudging';
}

// ---------- treatment: packed cells ----------
async function packed(slide, cos) {
  const gx = 2.35; const gy = 2.2; const cw = (SIDE_X - 0.45 - gx) / 2; const ch = 2.0;
  axisName(slide, copy.y.name, { x: 0.5, y: gy - 0.3, w: gx - 0.7, h: 0.2, align: 'right' });
  [copy.y.hi, copy.y.lo].forEach((t, r) => axisCat(slide, t, { x: 0.5, y: gy + r * ch, w: gx - 0.7, h: ch, align: 'right', valign: 'middle' }));
  [copy.x.lo, copy.x.hi].forEach((t, c) => axisCat(slide, t, { x: gx + c * cw, y: gy + 2 * ch + 0.14, w: cw, h: 0.25, align: 'center' }));
  axisName(slide, copy.x.name, { x: gx, y: gy + 2 * ch + 0.5, w: 2 * cw, h: 0.2, align: 'center' });
  const SW = BOX_W; const SH = BOX_H; const GX = 0.22; const GY = 0.2;
  let note = 'no collisions possible: uniform slots, max 6 per cell';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const x = gx + c * cw; const y = gy + r * ch;
    slide.addShape('rect', { x, y, w: cw, h: ch, fill: { color: C.cell }, line: { color: 'FFFFFF', width: 3 } });
    const inCell = cos.filter((co) => (co.qx >= 0.5 ? 1 : 0) === c && (co.qy >= 0.5 ? 0 : 1) === r)
      .sort((a, b) => (b.target ? 1 : 0) - (a.target ? 1 : 0));
    const n = inCell.length; if (!n) continue;
    if (n > 6) note = `cell over capacity (${n} > 6): validator would reject before render`;
    const cols = n === 1 ? 1 : 2; const rows = Math.ceil(n / cols);
    const th = rows * SH + (rows - 1) * GY;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols); const inRow = Math.min(cols, n - row * cols);
      const tw = inRow * SW + (inRow - 1) * GX;
      const cx = x + (cw - tw) / 2 + (i % cols) * (SW + GX) + SW / 2;
      const cy = y + (ch - th) / 2 + row * (SH + GY) + SH / 2;
      drawCo(slide, inCell[i], cx, cy, await sizeFor(inCell[i]));
    }
  }
  return note;
}

// ---------- build ----------
async function main() {
  await makeWideLogo();
  const wd = await dims(WIDE_FILE); console.log(`synthetic wide logo ${wd.w}x${wd.h} (${(wd.w / wd.h).toFixed(1)}:1)`);
  const treatments = { free, freegrid: (s, c) => free(s, c, { dividers: true }), packed };
  const all = new PptxGenJS(); all.layout = 'LAYOUT_WIDE';
  for (const [tName, fn] of Object.entries(treatments)) for (const [dName, cos] of Object.entries(datasets)) {
    const one = new PptxGenJS(); one.layout = 'LAYOUT_WIDE';
    for (const deck of [one, all]) {
      const s = deck.addSlide(); frame(s);
      const note = await fn(s, cos);
      s.addNotes(`PROTOTYPE ticket 10: ${tName} / ${dName}. Copy and placements are illustrative and unverified. ${note}.`);
      if (deck === one) console.log(`${tName}-${dName}: ${note}`);
    }
    await one.writeFile({ fileName: path.join(__dirname, 'out', `${tName}-${dName}.pptx`) });
  }
  await all.writeFile({ fileName: path.join(__dirname, 'out', 'all.pptx') });
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
