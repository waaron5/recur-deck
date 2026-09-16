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
//     "landmark": { "file": "...", "credit": { ... } }    // optional, see below
//   }
//
// The landmark is normally found here, from the headquarters city. Passing one
// in skips the search, which is what a rebuild after a repair wants: the photo
// has already been downloaded and paid for once.

const fs = require('node:fs');
const path = require('node:path');
const { buildDeck } = require('./deck.js');
const { findLandmarkPhoto, cityLandmarkSearch } = require('./landmark.js');

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

  const file = await buildDeck({
    company: run.company,
    assetsDir: path.join(skillDir, 'assets'),
    outDir,
    landmark,
    headquarters: run.headquarters,
    identification: run.identification,
  });

  console.log(
    JSON.stringify({ ok: true, file, slides: 9, landmark: landmark.credit?.fileName }, null, 2),
  );
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
