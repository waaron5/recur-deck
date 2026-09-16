// PROTOTYPE (ticket 06): trial of logo discovery from a company's own site HTML.
// Mirrors what the sandbox can do: fetch the homepage, rank logo candidates, download, normalize to PNG.
// Usage: node discover-logos.js  -> writes logos/<key>.png and logos/report.json
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');

const companies = {
  usft: 'https://www.usfleettracking.com/',
  samsara: 'https://www.samsara.com/',
  geotab: 'https://www.geotab.com/',
  verizon: 'https://www.verizonconnect.com/',
  motive: 'https://gomotive.com/',
  azuga: 'https://www.azuga.com/',
  gpsinsight: 'https://www.gpsinsight.com/',
  teletrac: 'https://www.teletracnavman.com/',
  linxup: 'https://www.linxup.com/',
  forcebyrocket: 'https://www.forcebymojio.com/',
};
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const out = path.join(__dirname, 'logos');
fs.mkdirSync(out, { recursive: true });

function sniff(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1) return 'ico';
  if (/<svg/i.test(buf.subarray(0, 2000).toString('utf8'))) return 'svg';
  return 'unknown';
}

// Score candidates: an <img>/<svg> whose attributes mention "logo" and sits in a header scores highest.
function candidates(html, base) {
  const c = [];
  const abs = (u) => { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch { return null; } };
  // Rule 1 (strongest): the first <svg> or <img> inside the first link to the site's home page.
  const origin = new URL(base).origin.replace(/^https?:\/\/(www\.)?/, '');
  const homeRe = new RegExp(`<a\\b[^>]*href=["'](?:/|/[a-z]{2}(?:-[a-z]{2})?/?|https?://(?:www\\.)?${origin.replace(/\./g, '\\.')}/?)["'][^>]*>([\\s\\S]{0,40000}?)</a>`, 'i');
  const home = html.match(homeRe);
  if (home) {
    const inner = home[1];
    const svg = inner.match(/<svg\b[\s\S]*?<\/svg>/i);
    const img = inner.match(/<img\b[^>]*\s(?:data-src|src)=["']([^"']+)["']/i);
    if (svg && (!img || inner.indexOf(svg[0]) < inner.indexOf(img[0]))) c.push({ kind: 'home-link inline-svg', svg: svg[0], score: 20, at: home.index });
    else if (img && !img[1].startsWith('data:')) c.push({ kind: 'home-link img', url: abs(img[1]), score: 20, at: home.index });
  }
  const headerEnd = Math.max(html.search(/<\/header>/i), 0) || 20000;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = (tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i) || [])[1];
    if (!src || src.startsWith('data:')) continue;
    let score = 0;
    if (/logo/i.test(tag)) score += 5;
    if (/logo/i.test(src)) score += 3;
    if (m.index < headerEnd) score += 3;
    if (/\.svg(\?|$)/i.test(src)) score += 1;
    if (/partner|client|customer|award|badge|g2|capterra|footer/i.test(tag)) score -= 6;
    if (score > 0) c.push({ kind: 'img', url: abs(src), score, at: m.index });
  }
  // Inline <svg> in the header with a logo hint
  for (const m of html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi)) {
    const s = m[0];
    if (m.index > headerEnd + 5000) break;
    const open = s.slice(0, 400);
    if (/logo/i.test(open) || /aria-label=["'][^"']*(home|logo)/i.test(open)) c.push({ kind: 'inline-svg', svg: s, score: 6 + (m.index < headerEnd ? 2 : 0), at: m.index });
  }
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og) c.push({ kind: 'og:image', url: abs(og[1]), score: 1 });
  const touch = html.match(/<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
  if (touch) c.push({ kind: 'apple-touch-icon', url: abs(touch[1]), score: 0 });
  return c.filter((x) => x.url || x.svg).sort((a, b) => b.score - a.score || a.at - b.at);
}

async function toPng(buf, kind) {
  if (kind === 'svg') {
    const svg = buf.toString('utf8').replace(/currentColor/g, '#111111');
    const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, background: 'rgba(0,0,0,0)' });
    return r.render().asPng();
  }
  return sharp(buf).png().toBuffer();
}

async function main() {
  const report = {};
  for (const [key, url] of Object.entries(companies)) {
    const r = { url };
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      r.status = res.status;
      const html = await res.text();
      const cands = candidates(html, res.url);
      r.candidates = cands.slice(0, 4).map(({ svg, ...x }) => ({ ...x, svg: svg ? `${svg.length} chars` : undefined }));
      for (const cand of cands.slice(0, 4)) {
        try {
          let buf; let kind;
          if (cand.kind === 'inline-svg') { buf = Buffer.from(cand.svg.includes('xmlns') ? cand.svg : cand.svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')); kind = 'svg'; }
          else { const ir = await fetch(cand.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }); buf = Buffer.from(await ir.arrayBuffer()); kind = sniff(buf); }
          if (kind === 'unknown' || kind === 'ico') continue;
          const png = await sharp(await toPng(buf, kind)).trim().png().toBuffer();
          const meta = await sharp(png).metadata();
          fs.writeFileSync(path.join(out, `${key}.png`), png);
          r.chosen = { ...cand, svg: undefined, sourceFormat: kind, width: meta.width, height: meta.height };
          break;
        } catch (e) { cand.error = e.message; }
      }
    } catch (e) { r.error = e.message; }
    report[key] = r;
    console.log(key, r.status, r.chosen ? `${r.chosen.kind} ${r.chosen.sourceFormat} ${r.chosen.width}x${r.chosen.height} ${r.chosen.url || ''}` : `NONE ${r.error || ''}`);
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
}
main();
