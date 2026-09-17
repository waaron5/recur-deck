// Acquiring a company's own logo and deciding whether the deck may use it.
//
// Every path through here ends in something placeable: either the company's own
// mark, or a text wordmark. A missing or broken image is never an outcome.

const { sniffFormat, toPng, encodePng, decodePng } = require('./raster.js');
const { LOGO } = require('./design.js');

/**
 * @typedef {{data: Buffer, width: number, height: number}} Raster
 * @typedef {{
 *   png: Buffer,
 *   width: number,
 *   height: number,
 *   sourceFormat: string,
 *   raster: Raster,
 * }} NormalisedLogo
 * @typedef {{kind: 'logo', png: Buffer, width: number, height: number}
 *   | {kind: 'wordmark', reason: string}} PlacedMark
 */

/**
 * Turn a downloaded logo into a trimmed PNG the deck can place, whatever it
 * arrived as.
 *
 * @param {Buffer} bytes
 * @param {{assetsDir: string}} options
 * @returns {Promise<NormalisedLogo>}
 */
async function normaliseLogo(bytes, { assetsDir }) {
  const sourceFormat = sniffFormat(bytes);
  const { png, width, height } = await toPng(bytes, sourceFormat, assetsDir);

  const raster = decodePng(png);
  const bounds = inkBounds(raster);
  // Nothing to measure and nothing to trim. What becomes of such a logo is the
  // caller's decision, which is the same one it makes for a logo it cannot use.
  const untrimmed = !bounds || (bounds.width === width && bounds.height === height);
  if (untrimmed) return { png, width, height, sourceFormat, raster };

  const trimmed = crop(raster, bounds);
  return {
    png: encodePng(trimmed),
    width: trimmed.width,
    height: trimmed.height,
    sourceFormat,
    raster: trimmed,
  };
}

/**
 * The mark's own bounds inside its image: the smallest box holding every pixel
 * that is not fully transparent.
 *
 * Sites pad logos with empty space, and the resolution rule divides pixels by
 * placed inches. Padding counted as resolution would overstate how large a mark
 * can be set before it goes soft.
 *
 * @param {Raster} raster
 * @returns {{left: number, top: number, width: number, height: number} | null}
 */
function inkBounds({ data, width, height }) {
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }

  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * @param {Raster} raster
 * @param {{left: number, top: number, width: number, height: number}} box
 * @returns {Raster}
 */
function crop(raster, box) {
  const out = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y += 1) {
    const from = ((y + box.top) * raster.width + box.left) * 4;
    raster.data.copy(out, y * box.width * 4, from, from + box.width * 4);
  }
  return { data: out, width: box.width, height: box.height };
}

/**
 * How large a logo may be placed in a slot, or why it may not be placed at all.
 *
 * Two rules meet here. A logo is never enlarged past the width at which it
 * still looks sharp, and it is never set smaller than its slot can legibly
 * carry. A mark that cannot satisfy both becomes a text wordmark, which is a
 * deliberate design rather than a failure: the prototype's upscaled logo read
 * as carelessness, and a clean wordmark does not.
 *
 * @param {object} options
 * @param {{width: number, height: number}} options.logo  A normalised mark.
 * @param {{
 *   maxWidth: number,
 *   maxHeight: number,
 *   minHeight: number,
 *   area?: number,
 * }} options.slot
 * @returns {{kind: 'logo', width: number, height: number}
 *   | {kind: 'wordmark', reason: string}}
 */
function logoPlacement({ logo, slot }) {
  const aspect = logo.width / logo.height;

  // The cover fills its slot's width. The market map sizes to a fixed optical
  // area instead, so a wide wordmark and a square mark carry equal weight.
  const wanted = slot.area ? Math.sqrt(slot.area * aspect) : slot.maxWidth;
  const sharpMax = logo.width / LOGO.sharpPixelsPerInch;

  // Whichever bound binds first wins, and the shape is never distorted to fit.
  const width = Math.min(wanted, slot.maxWidth, slot.maxHeight * aspect, sharpMax);
  const height = width / aspect;

  if (height < slot.minHeight) {
    return {
      kind: 'wordmark',
      reason:
        `${logo.width}x${logo.height}px places ${height.toFixed(3)}in tall, under the slot's ` +
        `${slot.minHeight}in minimum; it stays sharp only to ${sharpMax.toFixed(2)}in wide`,
    };
  }

  return { kind: 'logo', width, height };
}

// Antialiasing varies a pixel's alpha rather than its ink, so only the fully
// opaque core says what colours a mark is actually drawn in.
const OPAQUE = 250;

/**
 * Whether a mark may sit on a ground of this colour, and how.
 *
 * The rule is to use the version the company drew for that background and never
 * to repaint one that was not. A whole-logo recolour is what ruined US Fleet
 * Tracking's multicolour mark in the prototype.
 *
 * @param {object} options
 * @param {{raster: Raster}} options.logo
 * @param {'dark'|'light'} options.background
 * @returns {{treatment: 'as-is'|'whiten'}|{treatment: 'wordmark', reason: string}}
 */
function backgroundFit({ logo, background }) {
  const ink = inkSummary(logo.raster);

  if (background === 'dark') {
    if (ink.luminance > LOGO.lightMarkLuminance) return { treatment: 'as-is' };
    if (ink.singleInkShare >= LOGO.singleInkShare) return { treatment: 'whiten' };
    return {
      treatment: 'wordmark',
      reason:
        `the mark is drawn in more than one colour, with ${Math.round(ink.singleInkShare * 100)}% ` +
        'of its ink one shade, and recolouring a multicolour logo ruins it',
    };
  }

  // The market map's pale band is the light ground. Decision 06 sets no rule
  // for one, and nothing is invented here: the company's own version is used as
  // it is, which is what all but a near-white mark is drawn for.
  return { treatment: 'as-is' };
}

/**
 * What ink a mark is drawn in: how light it is, and how much of it is one
 * shade.
 *
 * @param {Raster} raster
 */
function inkSummary(raster) {
  // A mark that is semi-transparent everywhere has no opaque core to read. It
  // still has one honest ink, so the reading falls back to every visible pixel
  // rather than reporting a mark with no colour at all, which would refuse it
  // for a reason that is not true.
  const opaque = sampleInk(raster, OPAQUE);
  return opaque.core ? opaque : sampleInk(raster, 1);
}

/**
 * Read a mark's ink from every pixel at or above an alpha.
 *
 * @param {Raster} raster
 * @param {number} minAlpha
 */
function sampleInk({ data, width, height }, minAlpha) {
  /** @type {Map<number, {n: number, r: number, g: number, b: number}>} */
  const buckets = new Map();
  let core = 0;
  let luma = 0;

  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    if (data[at + 3] < minAlpha) continue;
    const r = data[at];
    const g = data[at + 1];
    const b = data[at + 2];
    core += 1;
    luma += 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
    const seen = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    seen.n += 1;
    seen.r += r;
    seen.g += g;
    seen.b += b;
    buckets.set(key, seen);
  }

  if (!core) return { core: 0, luminance: 0, singleInkShare: 0 };

  // The commonest shade, then how much of the mark sits close to it.
  let top = { n: 0, r: 0, g: 0, b: 0 };
  for (const bucket of buckets.values()) if (bucket.n > top.n) top = bucket;
  const cr = top.r / top.n;
  const cg = top.g / top.n;
  const cb = top.b / top.n;

  let sameInk = 0;
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    if (data[at + 3] < minAlpha) continue;
    const dr = data[at] - cr;
    const dg = data[at + 1] - cg;
    const db = data[at + 2] - cb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) < LOGO.singleInkDistance) sameInk += 1;
  }

  return { core, luminance: luma / core, singleInkShare: sameInk / core };
}

// A company that sells to enterprises fills its home page with its customers'
// logos, and those outnumber its own mark many times over. Two signals mark
// them: words in the image's own tag, and the block it sits in. The trial's
// first heuristic read only the tag, which is how a DHL customer logo labelled
// nothing more than "DHL logo" was picked as Samsara's own.
const OTHER_COMPANIES =
  /partner|client|customer|award|badge|g2|capterra|testimonial|trusted|review|footer/i;

/**
 * The logo candidates on a company's home page, best first.
 *
 * The order is the decided ladder: the mark inside the link home, then images
 * that call themselves a logo ranked by how near the header they sit, and the
 * social image only as a last resort. Nothing here decides which is really the
 * company's logo; the model looks at the winner and says.
 *
 * @param {string} html      The page as the sandbox fetched it.
 * @param {string} baseUrl   Where it was fetched from, for relative URLs.
 * @returns {{kind: 'home-link'|'logo-img'|'css'|'social', url?: string, svg?: string}[]}
 */
function pickLogoCandidates(html, baseUrl) {
  /** @type {{kind: 'home-link'|'logo-img'|'css'|'social', url?: string, svg?: string}[]} */
  const candidates = [];
  /** @param {string} url */
  const absolute = (url) => {
    try {
      return new URL(String(url).replace(/&amp;/g, '&'), baseUrl).href;
    } catch {
      return null;
    }
  };

  const home = homeLink(html, baseUrl);
  if (home) {
    const svg = home.match(/<svg\b[\s\S]*?<\/svg>/i);
    const img = home.match(/<img\b[^>]*\s(?:data-src|src)=["']([^"']+)["']/i);
    // Whichever comes first inside the link is the mark it wraps.
    if (svg && (!img || home.indexOf(svg[0]) < home.indexOf(img[0]))) {
      candidates.push({ kind: 'home-link', svg: svg[0] });
    } else if (img && !img[1].startsWith('data:')) {
      const url = absolute(img[1]);
      if (url) candidates.push({ kind: 'home-link', url });
    }
  }

  // The header is where a company puts its own mark, so images above its close
  // rank ahead of any further down the page.
  const headerEnd = html.search(/<\/header>/i);
  const marks = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const at = match.index ?? 0;
    const src = (tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i) ?? [])[1];
    if (!src || src.startsWith('data:')) continue;
    if (!/logo/i.test(tag)) continue;
    if (OTHER_COMPANIES.test(tag) || inOtherCompaniesBlock(html, at)) continue;

    const url = absolute(src);
    if (url) marks.push({ url, inHeader: headerEnd < 0 || at < headerEnd, at });
  }
  marks
    .sort((a, b) => Number(b.inHeader) - Number(a.inHeader) || a.at - b.at)
    .forEach(({ url }) => candidates.push({ kind: 'logo-img', url }));

  // Some sites never put the mark in an <img> at all: the header element is
  // empty and the logo arrives from the stylesheet as a background image.
  const already = new Set(candidates.map((candidate) => candidate.url));
  for (const match of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const value = match[1];
    if (!/logo/i.test(value) || value.startsWith('data:')) continue;
    if (OTHER_COMPANIES.test(value)) continue;

    const url = absolute(value);
    if (url && !already.has(url)) {
      already.add(url);
      candidates.push({ kind: 'css', url });
    }
  }

  // Last, and only because an empty slot is never acceptable: the image the
  // site hands to social networks, and the icon it hands to phones.
  const social =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
  if (social) {
    const url = absolute(social[1]);
    if (url) candidates.push({ kind: 'social', url });
  }

  return candidates;
}

/**
 * The contents of the first link back to the site's own home page.
 *
 * @param {string} html
 * @param {string} baseUrl
 * @returns {string | null}
 */
function homeLink(html, baseUrl) {
  let host;
  try {
    host = new URL(baseUrl).host.replace(/^www\./, '');
  } catch {
    return null;
  }
  const pattern = new RegExp(
    `<a\\b[^>]*href=["'](?:/|https?://(?:www\\.)?${host.replace(/\./g, '\\.')}/?)["'][^>]*>` +
      `([\\s\\S]{0,40000}?)</a>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? match[1] : null;
}

/**
 * Whether an image sits inside a block given over to other companies' logos.
 *
 * The nearest enclosing block is approximated by the last one opened before the
 * image, which is enough to tell a customer wall from a header without parsing
 * the page.
 *
 * @param {string} html
 * @param {number} at
 */
function inOtherCompaniesBlock(html, at) {
  const opened = [...html.slice(0, at).matchAll(/<(?:section|div|ul|aside)\b[^>]*>/gi)].pop();
  return opened ? OTHER_COMPANIES.test(opened[0]) : false;
}

/**
 * Repaint a single-ink mark white, through its alpha channel.
 *
 * Only the colour changes; every pixel keeps the alpha it had, so the mark's
 * antialiased edges stay soft instead of turning into a hard cutout. This is
 * the one recolouring the rules allow, and only for a mark drawn in one ink.
 *
 * @param {NormalisedLogo} logo
 * @returns {NormalisedLogo}
 */
function whitenMark(logo) {
  const { data, width, height } = logo.raster;
  const painted = Buffer.from(data);

  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    if (painted[at + 3] === 0) continue;
    painted[at] = 0xff;
    painted[at + 1] = 0xff;
    painted[at + 2] = 0xff;
  }

  const raster = { data: painted, width, height };
  return { ...logo, png: encodePng(raster), raster };
}

/**
 * Which mark a slot carries: the company's own logo, or its name set as type.
 *
 * Three gates, in order, and any of them sends the run to a text wordmark with
 * a reason worth reading. The model must have confirmed the logo is this
 * company's; the mark must suit its ground without being repainted; and it must
 * stay sharp at a size the slot can carry. A wordmark is a deliberate design
 * here, not a failure - an upscaled or recoloured logo reads as carelessness,
 * and a clean wordmark does not.
 *
 * @param {object} options
 * @param {(NormalisedLogo & {verified?: boolean}) | undefined} options.logo
 * @param {{maxWidth: number, maxHeight: number, minHeight: number, area?: number}} options.slot
 * @param {'dark'|'light'} options.background
 * @param {string} [options.reason]  Why there is no logo, when there is none.
 * @returns {PlacedMark}
 */
function chooseMark({ logo, slot, background, reason }) {
  if (!logo) return { kind: 'wordmark', reason: reason ?? 'no logo was acquired' };
  if (!logo.verified) {
    return { kind: 'wordmark', reason: 'the logo was not confirmed as this company’s own' };
  }

  const fit = backgroundFit({ logo, background });
  if (fit.treatment === 'wordmark') return { kind: 'wordmark', reason: fit.reason };

  const placed = logoPlacement({ logo, slot });
  if (placed.kind === 'wordmark') return { kind: 'wordmark', reason: placed.reason };

  const mark = fit.treatment === 'whiten' ? whitenMark(logo) : logo;
  return { kind: 'logo', png: mark.png, width: placed.width, height: placed.height };
}

module.exports = {
  normaliseLogo,
  logoPlacement,
  backgroundFit,
  pickLogoCandidates,
  whitenMark,
  chooseMark,
};
