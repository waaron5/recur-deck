#!/usr/bin/env node
// The skill's one generation entry point. Bundled to <skill>/scripts/build-deck.js,
// so it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/build-deck.js --input run.json
//
// The run file is what the model established about the company, as JSON:
//
//   {
//     "company": "US Fleet Tracking",
//     "headquarters": { "city": "Oklahoma City, Oklahoma", "source": "https://..." },
//     "identification": "Matched the prompt to usfleettracking.com.",
//     "thesis": { "here": {...}, "excited": {...}, "help": {...} },   // see thesis.js
//     "marketMap": { "axes": {...}, "companies": [...], "callout": {...} },  // market-map.js
//     "landmark": { "file": "...", "credit": { ... } }    // optional, see below
//   }
//
// The thesis is three sections, each a header and exactly two bullets, and
// every bullet carries the sources that slide 2's speaker notes pair with it.
//
// The market map is two categorical axes, six to nine competitors plus the
// target with 0-1 coordinates each, and the callout. Every company may carry a
// logo of its own, checked by the model the same way the target's is.
//
// The landmark is normally found here, from the headquarters city. Passing one
// in skips the search, which is what a rebuild after a repair wants: the photo
// has already been downloaded and paid for once.

const fs = require('node:fs');
const path = require('node:path');
const { buildDeck } = require('./deck.js');
const { findLandmarkPhoto, cityLandmarkSearch } = require('./landmark.js');
const { normaliseLogo } = require('./logo.js');

const SANDBOX_OUTPUTS = '/mnt/user-data/outputs';

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    // A following flag is not this flag's value: "--company --out dir" is a
    // mistake to report, not a company called "--out".
    const value = argv[i + 1];
    args[argv[i].slice(2)] = value && !value.startsWith('--') ? value : '';
  }
  return args;
}

/**
 * The run's inputs: what the model established about the company.
 *
 * @param {Record<string, string>} args
 */
function readRun(args) {
  if (!args.input) throw new Error('usage: build-deck.js --input run.json [--out <dir>]');
  return JSON.parse(fs.readFileSync(args.input, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = readRun(args);

  if (!run.company) {
    throw new Error('usage: build-deck.js --input run.json [--out <dir>]');
  }
  const city = run.headquarters?.city;
  if (!city) {
    throw new Error(
      `no headquarters city for ${run.company}, so the cover has no landmark to show`,
    );
  }

  // The bundle sits at <skill>/scripts/, so its assets are one level up.
  const skillDir = path.resolve(__dirname, '..');
  const outDir = args.out || (fs.existsSync(SANDBOX_OUTPUTS) ? SANDBOX_OUTPUTS : process.cwd());

  const landmark = run.landmark?.file
    ? {
        photo: fs.readFileSync(run.landmark.file),
        credit: run.landmark.credit,
        width: run.landmark.width,
      }
    : await findLandmark(city);

  const assetsDir = path.join(skillDir, 'assets');

  // A logo that cannot be converted costs the deck its logo, never its deck.
  // The cover falls back to a text wordmark and slide 1 records why.
  let logo;
  let logoNote;
  if (run.logo?.file) {
    try {
      logo = await readLogo(run.logo, assetsDir);
    } catch (error) {
      logoNote = `the logo could not be used: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  const file = await buildDeck({
    company: run.company,
    assetsDir,
    outDir,
    landmark,
    thesis: run.thesis,
    marketMap: await readMapLogos(run.marketMap, assetsDir),
    logo,
    logoNote,
    headquarters: run.headquarters,
    identification: run.identification,
  });

  console.log(
    JSON.stringify({ ok: true, file, slides: 9, landmark: landmark.credit?.fileName }, null, 2),
  );
}

/**
 * The logo the model looked at, normalised the way the cover needs it.
 *
 * `verified` has to be said explicitly: a run that never showed the logo to the
 * model has not confirmed anything, and the cover falls back to type.
 *
 * @param {{file: string, source?: string, verified?: boolean}} entry
 * @param {string} assetsDir
 */
async function readLogo(entry, assetsDir) {
  const logo = await normaliseLogo(fs.readFileSync(entry.file), { assetsDir });
  return { ...logo, source: entry.source, verified: entry.verified === true };
}

/**
 * The market map with every company's logo normalised the way the map places
 * one.
 *
 * A logo that cannot be read costs that company its mark and never the deck:
 * the map sets the name as type instead, which is a designed outcome rather
 * than a defect. The map itself is passed through untouched, so a run that
 * wrote no market map fails in buildDeck, where the reason is reported.
 *
 * @param {any} map
 * @param {string} assetsDir
 */
async function readMapLogos(map, assetsDir) {
  if (!map || !Array.isArray(map.companies)) return map;

  const companies = [];
  for (const company of map.companies) {
    if (!company?.logo?.file) {
      companies.push(company);
      continue;
    }
    try {
      companies.push({ ...company, logo: await readLogo(company.logo, assetsDir) });
    } catch (error) {
      // Kept, not swallowed. The cover records why it fell back to type and so
      // does the map: a competitor set as a wordmark for no stated reason reads
      // as something that went wrong rather than as a decision.
      companies.push({
        ...company,
        logo: undefined,
        logoNote: `the logo could not be used: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }

  return { ...map, companies };
}

/** @param {string} city */
async function findLandmark(city) {
  const found = await findLandmarkPhoto({ search: cityLandmarkSearch(city) });
  return { photo: found.photo, credit: found.credit, width: found.width };
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
