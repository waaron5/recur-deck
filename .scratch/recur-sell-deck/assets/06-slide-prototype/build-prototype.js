// PROTOTYPE (ticket 06), throwaway. Three structurally different variants of slides 1-3 of the
// Recur sell deck for US Fleet Tracking, each followed by the six fixed reference PNGs (slides 4-9).
// Copy is illustrative and unverified; it exists to judge density, legibility and layout only.
// Usage: node build-prototype.js  -> out/prototype-{A,B,C}.pptx and render/*.pptx (one slide each, for Quick Look)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PptxGenJS = require('pptxgenjs');

const W = 13.333; const H = 7.5;
const FONT = 'Arial'; // metric-compatible with Liberation Sans, which the sandbox renderer substitutes
const C = { navy: '09142F', blue: '0E7896', teal: '009384', cyan: 'D0F6FF', band: 'E2EEF8', grey: '6B7280', rule: 'C9CED6' };
const REF = path.join(__dirname, '../../../../Recur x US Fleet Tracking_vS');
const L = (f) => path.join(__dirname, 'logos', f);
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'render'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'work'), { recursive: true });

// ---------- content (illustrative, rule-shaped: headers <= 12 words, bullets <= 14 words) ----------
const target = { name: 'US Fleet Tracking', logo: 'usft.png' };
const thesis = [
  { label: "Why we're here", head: 'Small commercial fleets are still moving to live vehicle tracking',
    bullets: ['Many small fleets still dispatch with phone calls and spreadsheets', 'Enterprise telematics platforms price and configure for large fleets'] },
  { label: "Why we're excited", head: 'US Fleet Tracking sells live GPS tracking without long contracts',
    bullets: ['Customers see vehicle locations refresh on a live map every few seconds', 'Live GPS and in-vehicle video run in one app for dispatchers'] },
  { label: 'How we can help', head: 'Build the sales engine and AI plan for US Fleet Tracking',
    bullets: ['Build an outbound sales team to add to strong organic growth', 'Build AI features on the tracking and video data customers already share'] },
];
const map = {
  subtitle: 'Fleet telematics splits between enterprise platforms and simple trackers for small fleets',
  y: { name: 'Fleet segment focus', hi: 'SMB commercial fleets', lo: 'Enterprise and large fleets' },
  x: { name: 'Commitment model', lo: 'Contract-bundled platform', hi: 'No-contract live tracking' },
  // qx/qy: 0..1 across the whole grid, as the model would choose (0,0 = bottom-left)
  cos: [
    { name: 'Azuga', logo: 'azuga.png', qx: 0.1, qy: 0.86 },
    { name: 'GPS Insight', logo: 'gpsinsight.png', qx: 0.39, qy: 0.86 },
    { name: 'Force Fleet Tracking', logo: 'forcebyrocket.png', qx: 0.24, qy: 0.62 },
    { name: 'Linxup', logo: 'linxup.png', qx: 0.66, qy: 0.62 },
    { name: 'US Fleet Tracking', logo: 'usft.png', qx: 0.76, qy: 0.84, target: true },
    { name: 'Samsara', logo: 'samsara.png', qx: 0.1, qy: 0.36 },
    { name: 'Verizon Connect', logo: 'verizon.png', qx: 0.39, qy: 0.36 },
    { name: 'Geotab', logo: 'geotab.png', qx: 0.1, qy: 0.13 },
    { name: 'Teletrac Navman', logo: 'teletrac.png', qx: 0.39, qy: 0.13 },
    { name: 'Motive', logo: 'motive.png', qx: 0.76, qy: 0.2 },
  ],
  take: 'US Fleet Tracking wins small fleets that want fast tracking without a contract',
  dynamics: ['Enterprise platforms bundle long contracts and features small fleets rarely use', 'AI-first entrants chase trucking compliance more than quick live tracking'],
  proposal: 'US Fleet Tracking can add AI scoring to the GPS and video it streams',
};
const notes = {
  1: 'PROTOTYPE. Source record would go here: company identification, HQ (official site), landmark file + license + author, logo URLs.\nLandmark: Wikimedia Commons "Oklahoma city downtown.JPG", Urbanative, CC BY-SA 3.0.',
  2: 'PROTOTYPE. Each thesis bullet paired with its sources would go here. Copy on this slide is illustrative and unverified.',
  3: 'PROTOTYPE. Axis reasoning and each competitor\'s evidence and placement reasoning would go here. Placements are illustrative.',
};

// ---------- asset helpers ----------
const meta = {};
async function dims(file) { if (!meta[file]) { const m = await sharp(file).metadata(); meta[file] = { w: m.width, h: m.height }; } return meta[file]; }
function fit(d, maxW, maxH) { const r = Math.min(maxW / d.w, maxH / d.h); return { w: d.w * r, h: d.h * r }; }
// Place an image centred inside a box, preserving aspect ratio.
async function logoIn(slide, file, x, y, w, h) {
  const d = fit(await dims(file), w, h);
  slide.addImage({ path: file, x: x + (w - d.w) / 2, y: y + (h - d.h) / 2, w: d.w, h: d.h });
}
// White silhouette: keep the alpha channel, paint every pixel white.
async function whiteVersion(file) {
  const out = path.join(__dirname, 'work', `white-${path.basename(file)}`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  await sharp(data, { raw: info }).png().toFile(out);
  return out;
}
async function crop(file, aspect, name) {
  const out = path.join(__dirname, 'work', name);
  const d = await dims(file);
  let w = d.w; let h = Math.round(d.w / aspect);
  if (h > d.h) { h = d.h; w = Math.round(d.h * aspect); }
  await sharp(file).extract({ left: Math.round((d.w - w) / 2), top: Math.max(0, Math.round((d.h - h) * 0.35)), width: w, height: h }).jpeg({ quality: 88 }).toFile(out);
  return out;
}
function footer(slide, n) {
  slide.addText('Recur Software Highly Confidential - Not for Distribution', { x: 3.9, y: 7.05, w: 5.5, h: 0.25, fontFace: FONT, fontSize: 7, color: C.grey, align: 'center' });
  slide.addImage({ path: L('recur-navy.png'), ...{ x: 11.35, y: 6.95, w: 1.1, h: 1.1 * (meta[L('recur-navy.png')].h / meta[L('recur-navy.png')].w) } });
  slide.addText(String(n), { x: 12.55, y: 6.86, w: 0.4, h: 0.3, fontFace: FONT, fontSize: 11, color: C.navy });
}
const title = (slide, text, y = 0.55) => slide.addText(text, { x: 0.75, y, w: 11.5, h: 0.75, fontFace: FONT, fontSize: 30, color: C.navy, valign: 'middle', margin: 0 });

// ---------- cover variants ----------
const cover = {
  // A: reference look. Full-bleed landmark, dark scrim, white Recur | white silhouette of the target logo.
  async A(slide, a) {
    slide.addImage({ path: a.land169, x: 0, y: 0, w: W, h: H });
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: '000000', transparency: 55 }, line: { type: 'none' } });
    await logoIn(slide, L('recur-white.png'), 2.2, 3.2, 3.9, 0.7);
    slide.addShape('line', { x: W / 2 - 0.35, y: 2.95, w: 0, h: 1.25, line: { color: 'FFFFFF', width: 1 } });
    await logoIn(slide, a.targetWhite, W / 2 + 0.15, 3.05, 4.4, 0.95);
  },
  // B: genuine colours. Lighter full-bleed landmark with a white plate carrying navy Recur | colour logo.
  async B(slide, a) {
    slide.addImage({ path: a.land169, x: 0, y: 0, w: W, h: H });
    slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: '09142F', transparency: 80 }, line: { type: 'none' } });
    slide.addShape('roundRect', { x: 2.6, y: 2.85, w: 8.13, h: 1.8, fill: { color: 'FFFFFF' }, line: { type: 'none' }, rectRadius: 0.08, shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, opacity: 0.25, color: '000000' } });
    await logoIn(slide, L('recur-navy.png'), 3.1, 3.4, 3.2, 0.7);
    slide.addShape('line', { x: 6.67, y: 3.1, w: 0, h: 1.3, line: { color: C.rule, width: 1 } });
    await logoIn(slide, L(target.logo), 7.0, 3.15, 3.35, 1.2);
  },
  // C: split. White panel with stacked logos on the left, landmark photo on the right 60%.
  async C(slide, a) {
    const px = 5.2;
    slide.addImage({ path: a.landSplit, x: px, y: 0, w: W - px, h: H });
    slide.addShape('rect', { x: 0, y: 0, w: px, h: H, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
    slide.addShape('rect', { x: px, y: 0, w: 0.08, h: H, fill: { color: C.teal }, line: { type: 'none' } });
    await logoIn(slide, L('recur-navy.png'), 0.8, 2.35, 2.8, 0.6);
    slide.addShape('line', { x: 0.8, y: 3.35, w: 3.6, h: 0, line: { color: C.rule, width: 1 } });
    await logoIn(slide, L(target.logo), 0.8, 3.7, 3.6, 1.25);
    slide.addText('Oklahoma City, Oklahoma', { x: 0.8, y: 6.55, w: 4, h: 0.35, fontFace: FONT, fontSize: 11, color: C.grey, margin: 0 });
  },
};

// ---------- thesis variants ----------
const thesisV = {
  // A: reference look. Numbered circles, stacked rows, colour per section, bold label + header on one line.
  async A(slide) {
    title(slide, `What we see in ${target.name}`);
    const cols = [C.navy, C.blue, C.teal]; const fills = [C.navy, C.cyan, C.teal]; const numC = ['FFFFFF', C.navy, 'FFFFFF'];
    thesis.forEach((s, i) => {
      const y = 1.75 + i * 1.62;
      slide.addShape('ellipse', { x: 0.8, y: y + 0.02, w: 0.62, h: 0.62, fill: { color: fills[i] }, line: { type: 'none' } });
      slide.addText(String(i + 1), { x: 0.8, y: y + 0.02, w: 0.62, h: 0.62, fontFace: FONT, fontSize: 22, color: numC[i], align: 'center', valign: 'middle', margin: 0 });
      slide.addText([{ text: `${s.label}: `, options: { bold: true } }, { text: s.head }], { x: 1.75, y, w: 11, h: 0.5, fontFace: FONT, fontSize: 19, color: cols[i], valign: 'middle', margin: 0 });
      slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: { code: '25AA', indent: 15 }, breakLine: true } })), { x: 1.85, y: y + 0.52, w: 10.9, h: 0.8, fontFace: FONT, fontSize: 14, color: cols[i], valign: 'top', margin: 0, paraSpaceAfter: 4 });
    });
    footer(slide, 2);
  },
  // B: three columns, each a card with a coloured top bar, small label, header, bullets.
  async B(slide) {
    title(slide, `What we see in ${target.name}`);
    const cols = [C.navy, C.blue, C.teal];
    thesis.forEach((s, i) => {
      const x = 0.75 + i * 4.0; const w = 3.75;
      slide.addShape('rect', { x, y: 1.75, w, h: 0.09, fill: { color: cols[i] }, line: { type: 'none' } });
      slide.addText(s.label.toUpperCase(), { x, y: 1.98, w, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: cols[i], charSpacing: 1.5, margin: 0 });
      slide.addText(s.head, { x, y: 2.4, w, h: 1.25, fontFace: FONT, fontSize: 19, color: C.navy, valign: 'top', margin: 0 });
      slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: { code: '25AA', indent: 15 }, breakLine: true } })), { x, y: 3.85, w, h: 2.4, fontFace: FONT, fontSize: 14, color: '333F55', valign: 'top', margin: 0, paraSpaceAfter: 10 });
    });
    footer(slide, 2);
  },
  // C: label rail. Section label in a left rail, header and bullets to the right, hairlines between rows.
  async C(slide) {
    title(slide, `What we see in ${target.name}`);
    thesis.forEach((s, i) => {
      const y = 1.7 + i * 1.7;
      slide.addShape('line', { x: 0.75, y, w: 11.85, h: 0, line: { color: C.rule, width: 0.75 } });
      slide.addText(s.label, { x: 0.75, y: y + 0.22, w: 2.6, h: 0.45, fontFace: FONT, fontSize: 15, bold: true, color: C.teal, margin: 0 });
      slide.addText(s.head, { x: 3.55, y: y + 0.18, w: 9.05, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: C.navy, margin: 0 });
      slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: { indent: 15 }, breakLine: true } })), { x: 3.55, y: y + 0.72, w: 9.05, h: 0.85, fontFace: FONT, fontSize: 14, color: '333F55', valign: 'top', margin: 0, paraSpaceAfter: 3 });
    });
    footer(slide, 2);
  },
};

// ---------- market map variants ----------
function callout(slide, x, y, w, h, { dark = false, border = C.rule } = {}) {
  const fg = dark ? 'FFFFFF' : C.navy;
  slide.addText([
    { text: 'Our take: ', options: { bold: true } }, { text: map.take, options: { breakLine: true } },
    ...map.dynamics.map((d) => ({ text: d, options: { bullet: { code: '25AA', indent: 15 }, breakLine: true } })),
    { text: map.proposal, options: { bullet: { code: '25AA', indent: 15 }, underline: { style: 'sng' } } },
  ], { x: x + 0.2, y: y + 0.2, w: w - 0.4, h: h - 0.4, fontFace: FONT, fontSize: 12.5, color: fg, valign: 'top', margin: 0, paraSpaceAfter: 8 });
}
const LOGO_W = 1.55; const LOGO_H = 0.5;
async function placeFree(slide, gx, gy, gw, gh, opts = {}) {
  for (const co of map.cos) {
    const cx = gx + co.qx * gw; const cy = gy + (1 - co.qy) * gh;
    if (co.target && opts.ring) slide.addShape('roundRect', { x: cx - LOGO_W / 2 - 0.1, y: cy - LOGO_H / 2 - 0.1, w: LOGO_W + 0.2, h: LOGO_H + 0.2, fill: { color: 'FFFFFF' }, line: { color: C.teal, width: 1.5 }, rectRadius: 0.06 });
    await logoIn(slide, L(co.logo), cx - LOGO_W / 2, cy - LOGO_H / 2, LOGO_W, LOGO_H);
  }
}
const mapV = {
  // A: reference look. Tinted band, L-shaped axes, bold outside labels, free placement, rounded callout on right.
  async A(slide) {
    title(slide, `The opportunity for ${target.name}`, 0.45);
    slide.addText(map.subtitle, { x: 0.75, y: 1.2, w: 11.8, h: 0.5, fontFace: FONT, fontSize: 17, color: C.navy, margin: 0 });
    slide.addShape('rect', { x: 0, y: 2.0, w: W, h: H - 2.0, fill: { color: C.band }, line: { type: 'none' } });
    const gx = 2.95; const gy = 2.45; const gw = 6.7; const gh = 3.75;
    slide.addShape('line', { x: gx, y: gy, w: 0, h: gh, line: { color: C.navy, width: 1 } });
    slide.addShape('line', { x: gx, y: gy + gh, w: gw, h: 0, line: { color: C.navy, width: 1 } });
    slide.addText(map.y.name, { x: 0.3, y: 2.2, w: 2.45, h: 0.3, fontFace: FONT, fontSize: 10, color: C.navy, align: 'right', margin: 0 });
    slide.addText(map.y.hi, { x: 0.3, y: 2.7, w: 2.45, h: 0.8, fontFace: FONT, fontSize: 15, bold: true, color: C.navy, align: 'right', valign: 'middle', margin: 0 });
    slide.addText(map.y.lo, { x: 0.3, y: 4.75, w: 2.45, h: 0.8, fontFace: FONT, fontSize: 15, bold: true, color: C.navy, align: 'right', valign: 'middle', margin: 0 });
    slide.addText(map.x.lo, { x: gx, y: gy + gh + 0.12, w: gw / 2, h: 0.7, fontFace: FONT, fontSize: 15, bold: true, color: C.navy, align: 'center', valign: 'top', margin: 0 });
    slide.addText(map.x.hi, { x: gx + gw / 2, y: gy + gh + 0.12, w: gw / 2, h: 0.7, fontFace: FONT, fontSize: 15, bold: true, color: C.navy, align: 'center', valign: 'top', margin: 0 });
    slide.addText(map.x.name, { x: gx, y: 7.08, w: gw, h: 0.3, fontFace: FONT, fontSize: 10, color: C.navy, align: 'center', margin: 0 });
    await placeFree(slide, gx + 0.4, gy + 0.05, gw - 0.55, gh - 0.15);
    slide.addShape('roundRect', { x: 10.1, y: 2.25, w: 3.0, h: 4.15, fill: { color: 'FFFFFF' }, line: { color: '555555', width: 0.75 }, rectRadius: 0.25 });
    callout(slide, 10.1, 2.25, 3.0, 4.15);
  },
  // B: centred cross axes with arrow ends and quadrant labels at the ends; navy full-height callout sidebar.
  async B(slide) {
    const side = 9.35;
    slide.addShape('rect', { x: side, y: 0, w: W - side, h: H, fill: { color: C.navy }, line: { type: 'none' } });
    title(slide, `The opportunity for ${target.name}`, 0.45);
    slide.addText(map.subtitle, { x: 0.75, y: 1.2, w: 8.3, h: 0.6, fontFace: FONT, fontSize: 15, color: C.grey, margin: 0 });
    const gx = 1.15; const gy = 2.25; const gw = 7.6; const gh = 4.3;
    slide.addShape('line', { x: gx, y: gy + gh / 2, w: gw, h: 0, line: { color: C.navy, width: 1.25, beginArrowType: 'triangle', endArrowType: 'triangle' } });
    slide.addShape('line', { x: gx + gw / 2, y: gy, w: 0, h: gh, line: { color: C.navy, width: 1.25, beginArrowType: 'triangle', endArrowType: 'triangle' } });
    const lab = { fontFace: FONT, fontSize: 11, bold: true, color: C.teal, margin: 0 };
    slide.addText(map.y.hi, { ...lab, x: gx + gw / 2 - 1.5, y: gy - 0.4, w: 3, h: 0.3, align: 'center' });
    slide.addText(map.y.lo, { ...lab, x: gx + gw / 2 - 1.5, y: gy + gh + 0.08, w: 3, h: 0.3, align: 'center' });
    slide.addText(map.x.lo, { ...lab, x: 0.15, y: gy + gh / 2 - 0.62, w: 1.4, h: 0.55, align: 'left', valign: 'bottom' });
    slide.addText(map.x.hi, { ...lab, x: gx + gw - 1.25, y: gy + gh / 2 - 0.62, w: 1.4, h: 0.55, align: 'right', valign: 'bottom' });
    await placeFree(slide, gx + 0.2, gy + 0.1, gw - 0.4, gh - 0.2, { ring: true });
    callout(slide, side + 0.25, 1.2, W - side - 0.5, 5.8, { dark: true });
  },
  // C: explicit 2x2 cells with captions; logos auto-packed inside each cell (the model picks only the cell).
  async C(slide) {
    title(slide, `The opportunity for ${target.name}`, 0.45);
    slide.addText(map.subtitle, { x: 0.75, y: 1.2, w: 11.8, h: 0.5, fontFace: FONT, fontSize: 17, color: C.navy, margin: 0 });
    const gx = 2.35; const gy = 2.2; const cw = 3.55; const ch = 2.2;
    const rowLab = [map.y.hi, map.y.lo]; const colLab = [map.x.lo, map.x.hi];
    rowLab.forEach((t, r) => slide.addText(t, { x: 0.4, y: gy + r * ch, w: 1.8, h: ch, fontFace: FONT, fontSize: 13, bold: true, color: C.navy, align: 'right', valign: 'middle', margin: 0 }));
    colLab.forEach((t, c) => slide.addText(t, { x: gx + c * cw, y: gy + 2 * ch + 0.08, w: cw, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: C.navy, align: 'center', margin: 0 }));
    slide.addText(map.y.name.toUpperCase(), { x: 0.4, y: gy - 0.35, w: 1.8, h: 0.3, fontFace: FONT, fontSize: 8.5, color: C.grey, align: 'right', charSpacing: 1, margin: 0 });
    slide.addText(map.x.name.toUpperCase(), { x: gx, y: gy + 2 * ch + 0.42, w: 2 * cw, h: 0.3, fontFace: FONT, fontSize: 8.5, color: C.grey, align: 'center', charSpacing: 1, margin: 0 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x = gx + c * cw; const y = gy + r * ch;
      const inCell = map.cos.filter((co) => (co.qx >= 0.5 ? 1 : 0) === c && (co.qy >= 0.5 ? 0 : 1) === r);
      const mine = inCell.some((co) => co.target);
      slide.addShape('rect', { x, y, w: cw, h: ch, fill: { color: mine ? 'E6F6F4' : 'F4F7FB' }, line: { color: 'FFFFFF', width: 3 } });
      // pack: up to 2 columns x 3 rows of uniform logo boxes, centred
      const n = inCell.length; const cols = n > 2 ? 2 : n; const rows = Math.ceil(n / Math.max(cols, 1));
      const bw = 1.45; const bh = 0.46; const gapX = 0.2; const gapY = 0.18;
      const tw = cols * bw + (cols - 1) * gapX; const th = rows * bh + (rows - 1) * gapY;
      for (let i = 0; i < n; i++) {
        const co = inCell[i];
        const bx = x + (cw - tw) / 2 + (i % cols) * (bw + gapX); const by = y + (ch - th) / 2 + Math.floor(i / cols) * (bh + gapY);
        if (co.wordmark) slide.addText(co.name, { x: bx, y: by, w: bw, h: bh, fontFace: FONT, fontSize: 14, bold: true, color: C.navy, align: 'center', valign: 'middle', margin: 0 });
        else await logoIn(slide, L(co.logo), bx, by, bw, bh);
      }
    }
    slide.addShape('rect', { x: 9.75, y: 2.2, w: 0.07, h: 4.4, fill: { color: C.teal }, line: { type: 'none' } });
    slide.addShape('rect', { x: 9.82, y: 2.2, w: 3.2, h: 4.4, fill: { color: 'F4F7FB' }, line: { type: 'none' } });
    callout(slide, 9.82, 2.2, 3.2, 4.4);
  },
};

// ---------- build ----------
async function main() {
  for (const f of fs.readdirSync(path.join(__dirname, 'logos')).filter((f) => f.endsWith('.png'))) await dims(L(f));
  const landSrc = path.join(__dirname, 'landmark', 'c3.jpg');
  const a = {
    land169: await crop(landSrc, W / H, 'land-169.jpg'),
    landSplit: await crop(landSrc, (W - 5.2) / H, 'land-split.jpg'),
    // the site's own dark-background logo (usft-logo-white.webp), used as-is on the dark cover
    targetWhite: path.join(__dirname, 'work', 'usft-white.png'),
  };
  await dims(a.targetWhite);
  const builders = [cover, thesisV, mapV];
  for (const v of ['A', 'B', 'C']) {
    const deck = new PptxGenJS(); deck.layout = 'LAYOUT_WIDE';
    for (let i = 0; i < 3; i++) {
      const s = deck.addSlide(); await builders[i][v](s, a); s.addNotes(notes[i + 1]);
      const one = new PptxGenJS(); one.layout = 'LAYOUT_WIDE';
      const s1 = one.addSlide(); await builders[i][v](s1, a);
      await one.writeFile({ fileName: path.join(__dirname, 'render', `${v}-slide${i + 1}.pptx`) });
    }
    for (let n = 4; n <= 9; n++) deck.addSlide().addImage({ path: path.join(REF, `Slide${n}.png`), x: 0, y: 0, w: W, h: H });
    await deck.writeFile({ fileName: path.join(__dirname, 'out', `prototype-${v}.pptx`) });
    console.log(`variant ${v} written`);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
