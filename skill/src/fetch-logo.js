#!/usr/bin/env node
// Finds the target company's own logo on its own site, and normalises it into
// something the deck can place.
//
//   node <skill-dir>/scripts/fetch-logo.js --site https://www.acme.com/ --out work
//
// It stops one step short of using the logo. The candidates it ranks are found
// by pattern, and patterns pick the wrong company: in the trial the ranking
// alone chose a customer's logo on 3 of 10 sites and a product sub-brand on a
// fourth. So this writes the normalised mark out as a PNG and prints where it
// came from, and the model looks at the image and says whether it really is
// this company's logo. Nothing reaches a slide until it has.

const fs = require('node:fs');
const path = require('node:path');

const { pickLogoCandidates, normaliseLogo } = require('./logo.js');
const { CHROME_UA, download } = require('./http.js');

/** @typedef {import('./http.js').FetchLike} FetchLike */

// How many candidates are worth downloading before giving up on a site: the
// ladder puts the likeliest first, and each miss costs a request. The per-rung
// cap is what keeps the ladder a ladder - a header carrying six logo-ish images
// would otherwise use up every attempt before the stylesheet rung is reached.
const MAX_TRIED = 6;
const MAX_PER_RUNG = 2;

/** No usable logo could be found on the company's own site. */
class LogoNotFound extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'LogoNotFound';
  }
}

/**
 * Fetch a company's home page and normalise the best logo candidate on it.
 *
 * @param {object} options
 * @param {string} options.site
 * @param {string} options.assetsDir
 * @param {FetchLike} [options.fetchImpl]
 * @returns {Promise<{
 *   logo: import('./logo.js').NormalisedLogo,
 *   source: string,
 *   kind: string,
 *   rejected: {kind: string, url?: string, why: string}[],
 * }>}
 */
async function acquireLogo({
  site,
  assetsDir,
  fetchImpl = /** @type {FetchLike} */ (/** @type {unknown} */ (fetch)),
}) {
  // Ordinary sites answer the bare default user agent with a 403, which would
  // make a reachable company look like it has no website at all.
  const page = await fetchImpl(site, { headers: { 'User-Agent': CHROME_UA } });
  if (!page.ok || !page.text) throw new LogoNotFound(`${site} answered HTTP ${page.status}`);

  const html = await page.text();
  const candidates = pickLogoCandidates(html, page.url || site);

  /** @type {{kind: string, url?: string, why: string}[]} */
  const rejected = [];

  for (const candidate of worthTrying(candidates)) {
    try {
      // An inline mark is already in hand; the rasterizer gives it the
      // namespace and the colour the page would have supplied.
      const bytes = candidate.svg
        ? Buffer.from(candidate.svg)
        : await download(String(candidate.url), fetchImpl);

      if (!bytes) {
        rejected.push({ kind: candidate.kind, url: candidate.url, why: 'could not be downloaded' });
        continue;
      }

      const logo = await normaliseLogo(bytes, { assetsDir });
      return {
        logo,
        source: candidate.url ?? `${site} (inline in the page)`,
        kind: candidate.kind,
        rejected,
      };
    } catch (error) {
      rejected.push({
        kind: candidate.kind,
        url: candidate.url,
        why: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new LogoNotFound(`no usable logo on ${site}`);
}

/**
 * The candidates worth spending a request on, in the ladder's own order but
 * with no single rung allowed to crowd out the ones beneath it.
 *
 * @template {{kind: string}} T
 * @param {T[]} candidates
 * @returns {T[]}
 */
function worthTrying(candidates) {
  /** @type {Map<string, number>} */
  const perRung = new Map();

  return candidates
    .filter((candidate) => {
      const tried = (perRung.get(candidate.kind) ?? 0) + 1;
      perRung.set(candidate.kind, tried);
      return tried <= MAX_PER_RUNG;
    })
    .slice(0, MAX_TRIED);
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const value = argv[i + 1];
    args[argv[i].slice(2)] = value && !value.startsWith('--') ? value : '';
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.site) throw new Error('usage: fetch-logo.js --site <url> [--out <dir>]');

  const skillDir = path.resolve(__dirname, '..');
  const outDir = args.out || process.cwd();
  fs.mkdirSync(outDir, { recursive: true });

  const found = await acquireLogo({ site: args.site, assetsDir: path.join(skillDir, 'assets') });
  const file = path.join(outDir, 'logo.png');
  fs.writeFileSync(file, found.logo.png);

  console.log(
    JSON.stringify(
      {
        ok: true,
        file,
        source: found.source,
        foundBy: found.kind,
        sourceFormat: found.logo.sourceFormat,
        width: found.logo.width,
        height: found.logo.height,
        rejected: found.rejected,
        check:
          'Look at this image. Confirm it is this company’s own current logo, ' +
          'not a customer’s, a partner’s, or a product sub-brand’s, ' +
          'before putting it in the run file as verified.',
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { acquireLogo, LogoNotFound };
