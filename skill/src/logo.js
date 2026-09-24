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
 * Which mark a slot carries: the company's own logo, or its name set as type.
 *
 * Two gates, in order, and either of them sends the run to a text wordmark with
 * a reason worth reading. The model must have confirmed the logo is this
 * company's, and the mark must stay sharp at a size the slot can carry. A
 * wordmark is a deliberate design here, not a failure - an upscaled logo reads
 * as carelessness, and a clean wordmark does not.
 *
 * There was a third gate: whether a mark suited the ground it was landing on,
 * which mattered because the cover's ground was a dark photograph. Decision 01
 * of the tightening map took the logo off the cover, leaving the market map's
 * pale band as the only ground a logo lands on - and the rule there was always
 * to use the company's own version exactly as it is. So the gate is gone, along
 * with the ink reading and the whitening that served it.
 *
 * @param {object} options
 * @param {(NormalisedLogo & {verified?: boolean}) | undefined} options.logo
 * @param {{maxWidth: number, maxHeight: number, minHeight: number, area?: number}} options.slot
 * @param {string} [options.reason]  Why there is no logo, when there is none.
 * @returns {PlacedMark}
 */
function chooseMark({ logo, slot, reason }) {
  if (!logo) return { kind: 'wordmark', reason: reason ?? 'no logo was acquired' };
  if (!logo.verified) {
    return { kind: 'wordmark', reason: 'the logo was not confirmed as this company’s own' };
  }

  const placed = logoPlacement({ logo, slot });
  if (placed.kind === 'wordmark') return { kind: 'wordmark', reason: placed.reason };

  return { kind: 'logo', png: logo.png, width: placed.width, height: placed.height };
}

module.exports = {
  normaliseLogo,
  logoPlacement,
  pickLogoCandidates,
  chooseMark,
};
