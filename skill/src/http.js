// The sandbox's outgoing HTTP, in one place.
//
// Both the landmark search and the logo search fetch from ordinary websites
// under the same constraint, and they used to carry their own copies of it.

/**
 * A response shaped like the part of fetch() this package uses, so tests can
 * answer from a recorded reply instead of the network.
 *
 * @typedef {{
 *   ok: boolean,
 *   status: number,
 *   url?: string,
 *   json?: () => Promise<any>,
 *   text?: () => Promise<string>,
 *   arrayBuffer?: () => Promise<ArrayBuffer>,
 * }} FetchReply
 * @typedef {(url: string, init?: {headers?: Record<string, string>}) => Promise<FetchReply>} FetchLike
 */

// Every sandbox fetch sends a full Chrome user-agent string. Cloudflare answers
// the bare Mozilla/5.0 default with a 403 on ordinary sites, which would make a
// reachable company look unreachable.
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetch bytes, or null if they cannot be had. A candidate that will not come
 * down is passed over rather than failing the run.
 *
 * @param {string} url
 * @param {FetchLike} fetchImpl
 * @returns {Promise<Buffer | null>}
 */
async function download(url, fetchImpl) {
  try {
    const reply = await fetchImpl(url, { headers: { 'User-Agent': CHROME_UA } });
    if (!reply.ok || !reply.arrayBuffer) return null;
    const bytes = Buffer.from(await reply.arrayBuffer());
    return bytes.byteLength > 0 ? bytes : null;
  } catch {
    return null;
  }
}

module.exports = { CHROME_UA, download };
