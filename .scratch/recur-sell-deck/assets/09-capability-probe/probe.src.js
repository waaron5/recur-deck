#!/usr/bin/env node
// Throwaway capability probe for the Recur sell-deck host decision.
// Usage: node probe.js --logo <url> --landmark <url> --domain <company domain> [--out <dir>]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const args = {};
process.argv.slice(2).forEach((a, i, arr) => { if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1]; });

const t0 = Date.now();
const skillDir = path.resolve(__dirname, '..');
const outDir = args.out || (fs.existsSync('/mnt/user-data/outputs') ? '/mnt/user-data/outputs' : path.join(os.tmpdir(), 'probe-out'));
fs.mkdirSync(outDir, { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-'));
const report = { startedAt: new Date().toISOString(), outDir, work, checks: {} };
const rec = (k, ok, detail = {}) => { report.checks[k] = { ok, ...detail }; };

function sh(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', timeout: opts.timeout || 20000, ...opts });
  return { status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim().slice(0, 400), error: r.error && r.error.message };
}
const which = (bin) => { const r = sh('sh', ['-c', `command -v ${bin}`]); return r.status === 0 ? r.out : null; };
const writable = (dir) => { try { const f = path.join(dir, `.w${process.pid}`); fs.writeFileSync(f, 'x'); fs.unlinkSync(f); return true; } catch { return false; } };

function sniff(buf) {
  const h = buf.subarray(0, 16);
  if (h[0] === 0x89 && h[1] === 0x50) return 'png';
  if (h[0] === 0xff && h[1] === 0xd8) return 'jpg';
  if (h.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (h.toString('ascii', 0, 4) === 'RIFF' && h.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (h[0] === 0 && h[1] === 0 && h[2] === 1 && h[3] === 0) return 'ico';
  const s = buf.subarray(0, 512).toString('utf8');
  if (/<svg|<\?xml/i.test(s)) return 'svg';
  if (/<html|<!doctype/i.test(s)) return 'html';
  return 'unknown';
}

async function main() {
  // 1. Runtime and filesystem
  rec('runtime', true, {
    node: process.version, platform: `${process.platform}/${process.arch}`, user: os.userInfo().username,
    cwd: process.cwd(), skillDir, skillDirWritable: writable(skillDir), tmpWritable: writable(os.tmpdir()),
    outDirWritable: writable(outDir),
    proxyEnvVars: Object.keys(process.env).filter((k) => /proxy/i.test(k)),
  });

  // 2. Tools present in the sandbox
  const tools = {};
  for (const b of ['soffice', 'libreoffice', 'pdftoppm', 'convert', 'magick', 'rsvg-convert', 'python3', 'curl', 'fc-list', 'npm']) tools[b] = which(b);
  const py = {};
  if (tools.python3) for (const m of ['fitz', 'pptx', 'PIL', 'cairosvg']) py[m] = sh('python3', ['-c', `import ${m}`]).status === 0;
  const fonts = tools['fc-list'] ? sh('fc-list', [':', 'family']).out.split('\n').filter((f) => /arial|liberation|helvetica|dejavu|inter|calibri|carlito/i.test(f)).slice(0, 20) : [];
  rec('tools', true, { tools, pythonModules: py, fontsSample: fonts });

  // 3. PptxGenJS: preinstalled global vs vendored copy
  let PptxGenJS; let pptxSource = null;
  const globalRoot = tools.npm ? sh('npm', ['root', '-g']).out : null;
  if (globalRoot) {
    try { require(path.join(globalRoot, 'pptxgenjs')); report.checks.pptxgenjs_global = { ok: true }; } catch (e) { report.checks.pptxgenjs_global = { ok: false, error: e.message.slice(0, 200) }; }
  }
  try { PptxGenJS = require('pptxgenjs'); pptxSource = 'bundled single file'; } catch (e) { report.checks.pptxgenjs_bundled = { ok: false, error: e.message.slice(0, 200) }; }
  rec('pptxgenjs', !!PptxGenJS, { source: pptxSource, globalRoot });
  if (!PptxGenJS) return finish();

  // 4. Network egress: Node fetch and curl, target assets plus control hosts
  const ua = 'RecurCapabilityProbe/0.1 (throwaway capability check)';
  const domain = args.domain || 'usfleettracking.com';
  const targets = {
    logo: args.logo, landmark: args.landmark,
    companySite: `https://${domain}/`,
    googleFavicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    wikimediaApi: 'https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json',
    npmRegistry: 'https://registry.npmjs.org/pptxgenjs',
    pypi: 'https://pypi.org/simple/pptx/',
    github: 'https://raw.githubusercontent.com/gitbrent/PptxGenJS/master/README.md',
    example: 'https://example.com/',
  };
  const net = {}; const files = {};
  for (const [name, url] of Object.entries(targets)) {
    if (!url) { net[name] = { skipped: 'no url given' }; continue; }
    const r = { url };
    try {
      const res = await fetch(url, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(15000), redirect: 'follow' });
      const buf = Buffer.from(await res.arrayBuffer());
      r.fetch = { status: res.status, contentType: res.headers.get('content-type'), bytes: buf.length, sniff: sniff(buf) };
      if (res.ok && (name === 'logo' || name === 'landmark' || name === 'googleFavicon')) files[name] = buf;
    } catch (e) { r.fetch = { error: `${e.name}: ${e.message}`, cause: e.cause && (e.cause.code || e.cause.message) }; }
    if (tools.curl) {
      const f = path.join(work, `curl-${name}`);
      const c = sh('curl', ['-sSL', '-A', ua, '-m', '15', '-o', f, '-w', '%{http_code} %{content_type}', url]);
      r.curl = { exit: c.status, result: c.out, err: c.err || undefined };
      if (c.status === 0 && fs.existsSync(f)) {
        const buf = fs.readFileSync(f); r.curl.bytes = buf.length; r.curl.sniff = sniff(buf);
        if (!files[name] && /^2/.test(c.out) && ['logo', 'landmark', 'googleFavicon'].includes(name)) files[name] = buf;
      }
    }
    net[name] = r;
  }
  rec('network', true, net);

  // 5. Downloaded images usable by PptxGenJS (png/jpg/gif natively)
  const imageSize = require('image-size');
  const imgs = {};
  for (const [name, buf] of Object.entries(files)) {
    const kind = sniff(buf); const info = { kind, bytes: buf.length };
    try { const d = imageSize(buf); info.width = d.width; info.height = d.height; } catch (e) { info.sizeError = e.message; }
    info.usableDirectly = ['png', 'jpg', 'gif'].includes(kind);
    if (info.usableDirectly) { info.path = path.join(work, `${name}.${kind}`); fs.writeFileSync(info.path, buf); }
    imgs[name] = info;
  }
  rec('assetDownload', !!(imgs.logo && imgs.logo.usableDirectly && imgs.landmark && imgs.landmark.usableDirectly), imgs);

  // 6. Generate a tiny deck: cover, text, positioned map, fixed PNG; notes on every slide
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  const W = 13.333; const H = 7.5; const font = 'Arial';
  const fit = (info, maxW, maxH) => { const r = Math.min(maxW / info.width, maxH / info.height); return { w: info.width * r, h: info.height * r }; };

  const s1 = pres.addSlide();
  if (imgs.landmark && imgs.landmark.path) s1.addImage({ path: imgs.landmark.path, x: 0, y: 0, w: W, h: H, sizing: { type: 'cover', w: W, h: H } });
  else s1.background = { color: '1F2A44' };
  s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 2.6, w: W, h: 2.3, fill: { color: '000000', transparency: 45 }, line: { type: 'none' } });
  s1.addText('Recur  |', { x: 1, y: 3.1, w: 4.5, h: 1.3, fontFace: font, fontSize: 48, bold: true, color: 'FFFFFF', align: 'right', valign: 'middle' });
  const logo = imgs.logo && imgs.logo.path ? imgs.logo : (imgs.googleFavicon && imgs.googleFavicon.path ? imgs.googleFavicon : null);
  if (logo && logo.width) { const d = fit(logo, 4.5, 1.3); s1.addImage({ path: logo.path, x: 5.8, y: 3.1 + (1.3 - d.h) / 2, w: d.w, h: d.h }); }
  else s1.addText(domain, { x: 5.8, y: 3.1, w: 6, h: 1.3, fontFace: font, fontSize: 40, color: 'FFFFFF', valign: 'middle' });
  s1.addNotes(`Probe cover. Landmark: ${args.landmark || 'none'}. Logo: ${args.logo || 'none'}.`);

  const s2 = pres.addSlide();
  s2.addText('Probe thesis layout', { x: 0.6, y: 0.4, w: 12, h: 0.8, fontFace: font, fontSize: 28, bold: true, color: '1F2A44' });
  ['Why we\'re here', 'Why we\'re excited', 'How we can help'].forEach((h, i) => {
    const x = 0.6 + i * 4.1;
    s2.addText(h, { x, y: 1.6, w: 3.8, h: 0.6, fontFace: font, fontSize: 18, bold: true, color: '2E6BE6' });
    s2.addText([{ text: 'A fourteen word bullet used to check wrapping and readable density on the slide', options: { bullet: true } },
      { text: 'Second bullet of similar length to confirm spacing between two lines of text', options: { bullet: true } }],
    { x, y: 2.3, w: 3.8, h: 2.5, fontFace: font, fontSize: 14, color: '333333', valign: 'top', paraSpaceAfter: 8 });
  });
  s2.addNotes('Probe thesis notes: source record would live here.');

  const s3 = pres.addSlide();
  s3.addText('Probe market map', { x: 0.6, y: 0.3, w: 9, h: 0.7, fontFace: font, fontSize: 26, bold: true, color: '1F2A44' });
  const gx = 0.9; const gy = 1.3; const gw = 8.2; const gh = 5.4;
  s3.addShape(pres.shapes.LINE, { x: gx, y: gy + gh / 2, w: gw, h: 0, line: { color: '999999', width: 1.25 } });
  s3.addShape(pres.shapes.LINE, { x: gx + gw / 2, y: gy, w: 0, h: gh, line: { color: '999999', width: 1.25 } });
  s3.addText('Horizontal axis', { x: gx, y: gy + gh + 0.05, w: gw, h: 0.4, fontFace: font, fontSize: 12, align: 'center', color: '666666' });
  s3.addText('Vertical axis', { x: gx - 0.85, y: gy + gh / 2 - 0.2, w: 1.6, h: 0.4, fontFace: font, fontSize: 12, rotate: 270, color: '666666' });
  [[0.2, 0.2], [0.7, 0.3], [0.3, 0.75], [0.8, 0.8]].forEach(([px, py], i) => {
    const bx = gx + px * gw - 0.7; const by = gy + py * gh - 0.3;
    if (logo && logo.width) { const d = fit(logo, 1.4, 0.6); s3.addImage({ path: logo.path, x: bx, y: by, w: d.w, h: d.h }); }
    else s3.addText(`Co ${i + 1}`, { x: bx, y: by, w: 1.4, h: 0.6, fontFace: font, fontSize: 12, align: 'center', fill: { color: 'EEEEEE' } });
  });
  s3.addShape(pres.shapes.RECTANGLE, { x: 9.5, y: 1.3, w: 3.3, h: 5.4, fill: { color: 'F3F6FC' }, line: { color: '2E6BE6', width: 1 } });
  s3.addText([{ text: 'Our take', options: { bold: true, fontSize: 16, breakLine: true } },
    { text: 'Market dynamic bullet one', options: { bullet: true, breakLine: true } },
    { text: 'Market dynamic bullet two', options: { bullet: true, breakLine: true } },
    { text: 'Underlined proposal bullet', options: { bullet: true, underline: { style: 'sng' } } }],
  { x: 9.7, y: 1.5, w: 2.9, h: 5, fontFace: font, fontSize: 13, color: '1F2A44', valign: 'top' });
  s3.addNotes('Probe map notes: competitor sources and placement reasoning would live here.');

  const s4 = pres.addSlide();
  s4.addImage({ path: path.join(skillDir, 'assets', 'fixed-slide-4.png'), x: 0, y: 0, w: W, h: H });
  s4.addNotes('Bundled fixed slide PNG.');

  const pptxPath = path.join(outDir, 'recur-capability-probe.pptx');
  try {
    await pres.writeFile({ fileName: pptxPath });
    rec('pptxWrite', true, { path: pptxPath, bytes: fs.statSync(pptxPath).size });
  } catch (e) { rec('pptxWrite', false, { error: e.message }); return finish(); }

  // 7. Structural re-open
  try {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
    const names = Object.keys(zip.files);
    const count = (re) => names.filter((n) => re.test(n)).length;
    rec('pptxReopen', true, { slides: count(/^ppt\/slides\/slide\d+\.xml$/), notes: count(/^ppt\/notesSlides\/notesSlide\d+\.xml$/), media: count(/^ppt\/media\//) });
  } catch (e) { rec('pptxReopen', false, { error: e.message }); }

  // 8. Rendering: PPTX -> PDF (LibreOffice) -> PNG (pdftoppm or PyMuPDF)
  const soffice = tools.soffice || tools.libreoffice;
  if (!soffice) { rec('render', false, { reason: 'no soffice/libreoffice on PATH' }); return finish(); }
  const r0 = Date.now();
  const lo = sh(soffice, ['--headless', `-env:UserInstallation=file://${work}/lo-profile`, '--convert-to', 'pdf', '--outdir', work, pptxPath], { timeout: 180000 });
  const pdf = path.join(work, 'recur-capability-probe.pdf');
  if (!fs.existsSync(pdf)) { rec('render', false, { stage: 'pdf', lo }); return finish(); }
  const renderDir = path.join(outDir, 'probe-render');
  fs.mkdirSync(renderDir, { recursive: true });
  let raster;
  if (tools.pdftoppm) raster = sh('pdftoppm', ['-png', '-r', '60', pdf, path.join(renderDir, 'slide')], { timeout: 60000 });
  else if (py.fitz) raster = sh('python3', ['-c', `import fitz,sys\nd=fitz.open(sys.argv[1])\nfor i,p in enumerate(d): p.get_pixmap(dpi=60).save(f"{sys.argv[2]}/slide-{i+1}.png")`, pdf, renderDir], { timeout: 60000 });
  const pngs = fs.readdirSync(renderDir).filter((f) => f.endsWith('.png')).map((f) => path.join(renderDir, f));
  rec('render', pngs.length > 0, { seconds: (Date.now() - r0) / 1000, pdfBytes: fs.statSync(pdf).size, pngs, raster: raster && { status: raster.status, err: raster.err } });
  finish();
}

function finish() {
  report.seconds = (Date.now() - t0) / 1000;
  const p = path.join(outDir, 'probe-report.json');
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${p}`);
}

main().catch((e) => { rec('fatal', false, { error: e.stack }); finish(); process.exitCode = 1; });
