// Finds the cover photo: a landmark or skyline in the target company's
// headquarters city, from Wikimedia Commons.
//
// Only the search and the download live here. Choosing what to search for when
// the first phrase finds nothing - the city, then its metro, then the region -
// is the landmark ladder, which belongs to the unattended run (ticket 08).

/**
 * A response shaped like the part of fetch() this module uses, so tests can
 * answer from a recorded reply instead of the network.
 *
 * @typedef {{
 *   ok: boolean,
 *   status: number,
 *   json?: () => Promise<any>,
 *   arrayBuffer?: () => Promise<ArrayBuffer>,
 * }} FetchReply
 * @typedef {(url: string, init?: {headers?: Record<string, string>}) => Promise<FetchReply>} FetchLike
 */

const { CHROME_UA, download } = require('./http.js');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Commons serves thumbnails at standard widths only: a request for 1600 comes
// back as HTTP 400. 1920 is the size the cover wants; 1280 is the retry when a
// 1920 thumbnail will not come down.
const THUMB_WIDTHS = [1920, 1280];

// The cover fills a 10in slide, so anything narrower than this looks soft in
// print. It also filters the search itself, through fileres.
const MIN_PHOTO_WIDTH = 1600;

// JPEG only, deliberately: the deck's image processing is a bundled JPEG codec,
// chosen because the sandbox has no image library the bundle could call. A PNG
// or WebP candidate would arrive undecodable, so it never becomes a candidate.
const WANTED_MIME = 'image/jpeg';

// How many candidates one search considers before giving up on a phrase.
const SEARCH_LIMIT = 8;

/** No photo of this place could be found or downloaded. */
class LandmarkNotFound extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'LandmarkNotFound';
  }
}

/**
 * What Commons was asked for, for a headquarters city: the skyline rung.
 *
 * Asking for landmarks in the same phrase was tried and measured worse for the
 * cities this one already serves. Ticket 02's comments carry the numbers, for
 * the ladder in ticket 08 to build on.
 */
function cityLandmarkSearch(city) {
  // "Oklahoma City, Oklahoma" searches better as plain words, and the state
  // keeps same-named cities in other states out of the results.
  return `${String(city).replace(/,/g, ' ').replace(/\s+/g, ' ').trim()} downtown skyline`;
}

/**
 * Find a usable photo for a place, and the credit that belongs in the notes.
 *
 * @param {object} options
 * @param {string} options.search        What to look for, e.g. "Austin skyline".
 * @param {FetchLike} [options.fetchImpl]
 * @returns {Promise<{photo: Buffer, width: number, height: number, credit: {
 *   fileName: string, artist: string, licence: string, descriptionUrl: string,
 * }}>}
 */
async function findLandmarkPhoto({
  search,
  fetchImpl = /** @type {FetchLike} */ (/** @type {unknown} */ (fetch)),
}) {
  if (!String(search ?? '').trim()) throw new Error('findLandmarkPhoto needs something to search for');

  for (const width of THUMB_WIDTHS) {
    const reply = await searchCommons({ search, width, fetchImpl });
    for (const candidate of usableCandidates(reply, width)) {
      const photo = await download(candidate.thumbUrl, fetchImpl);
      if (photo) {
        return {
          photo,
          width: candidate.width,
          height: candidate.height,
          credit: candidate.credit,
        };
      }
    }
  }

  throw new LandmarkNotFound(`no usable Commons photo for "${search}"`);
}

/**
 * @param {{search: string, width: number, fetchImpl: FetchLike}} options
 * @returns {Promise<any>}
 */
async function searchCommons({ search, width, fetchImpl }) {
  // fileres and filemime do the first pass of filtering inside the search, so
  // the results come back as photographs rather than PDFs, maps and diagrams.
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${search} filemime:${WANTED_MIME} fileres:>${MIN_PHOTO_WIDTH}`,
    gsrnamespace: '6',
    gsrlimit: String(SEARCH_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: String(width),
  });

  const reply = await fetchImpl(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': CHROME_UA } });
  if (!reply.ok) throw new LandmarkNotFound(`Commons search failed with HTTP ${reply.status}`);
  return reply.json ? reply.json() : {};
}

/**
 * The candidates worth trying, in the order Commons ranked them.
 *
 * @param {any} reply
 * @param {number} requestedWidth
 */
function usableCandidates(reply, requestedWidth) {
  const pages = Object.values(reply?.query?.pages ?? {});
  // A thumbnail is never upscaled, so a file only a little over the search's
  // resolution floor comes back smaller than asked for.
  const floor = Math.min(requestedWidth, MIN_PHOTO_WIDTH);

  return pages
    .map((page) => /** @type {any} */ (page))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({ title: String(page.title ?? ''), info: page.imageinfo?.[0] }))
    .filter(({ info }) => info?.mime === WANTED_MIME && (info?.thumbwidth ?? 0) >= floor)
    .map(({ title, info }) => ({
      thumbUrl: String(info.thumburl),
      width: Number(info.thumbwidth),
      height: Number(info.thumbheight),
      credit: creditFrom(title, info),
    }));
}

/**
 * The photo's credit, as a person would read it in the speaker notes.
 *
 * @param {string} title
 * @param {any} info
 */
function creditFrom(title, info) {
  const meta = info.extmetadata ?? {};
  /** @param {string} key */
  const value = (key) => plainText(meta[key]?.value ?? '');

  return {
    fileName: title.replace(/^File:/, ''),
    artist: value('Artist'),
    licence: value('LicenseShortName'),
    descriptionUrl: String(info.descriptionurl ?? ''),
  };
}

/** Commons returns credit fields as HTML. Speaker notes want the words. */
function plainText(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { findLandmarkPhoto, cityLandmarkSearch, LandmarkNotFound };
