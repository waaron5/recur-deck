#!/usr/bin/env node
// The skill's one generation entry point. Bundled to <skill>/scripts/build-deck.js,
// so it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/build-deck.js --input run.json [--flagged]
//
// --flagged writes the deck as "Recur x <Company> - NOT READY.pptx". It is asked
// for by the stage that found a critical defect its repair rounds could not fix,
// and it changes the file's name and nothing on its slides.
//
// The run file is what the model established about the company, as JSON:
//
//   {
//     "company": "US Fleet Tracking",
//     "writtenForm": "USFleetTracking",        // optional, see below
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
// logo of its own, the target included - slide 3 is the only slide that places
// one, so there is no top-level logo block any more.
//
// The written form is the company's name as it writes it on its own masthead,
// which is what the cover sets. It is optional because a masthead is sometimes an
// image with no readable letters in it; left out, the cover sets the name the
// run was given.
//
// The landmark is normally found here, from the headquarters city. Passing one
// in skips the search, which is what a rebuild after a repair wants: the photo
// has already been downloaded and paid for once.

const fs = require('node:fs');
const path = require('node:path');
const { buildDeck } = require('./deck.js');
const { findLandmarkOnLadder } = require('./ladder.js');
const { openRunState, runStateFile, stageTimer } = require('./run-state.js');
const { normaliseLogo } = require('./logo.js');
const { checkRun } = require('./content-gate.js');
const { parseArgs } = require('./args.js');

const SANDBOX_OUTPUTS = '/mnt/user-data/outputs';

/** Times this stage: a Commons search, a download, a duotone and nine slides. */
const mark = stageTimer();

/**
 * The run's inputs: what the model established about the company.
 *
 * @param {Record<string, string>} args
 */
const USAGE = 'usage: build-deck.js --input run.json [--out <dir>] [--flagged]';

function readRun(args) {
  if (!args.input) throw new Error(USAGE);
  return JSON.parse(fs.readFileSync(args.input, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = readRun(args);

  if (!run.company) {
    throw new Error(USAGE);
  }

  // Asked for by name rather than inferred. This deck is being delivered with
  // something known to be wrong with it, and that is a decision a stage makes
  // deliberately, never one the generator arrives at on its own.
  const flagged = Object.prototype.hasOwnProperty.call(args, 'flagged');
  const city = run.headquarters?.city;
  if (!city) {
    throw new Error(
      `no headquarters city for ${run.company}, so the cover has no landmark to show`,
    );
  }

  // The bundle sits at <skill>/scripts/, so its assets are one level up.
  const skillDir = path.resolve(__dirname, '..');
  const outDir = args.out || (fs.existsSync(SANDBOX_OUTPUTS) ? SANDBOX_OUTPUTS : process.cwd());

  // The content gate runs first: before the photo is fetched, and long before
  // the deck is written. Copy that breaks a rule is repaired with words, and a
  // run that skipped check-content.js should not spend a download - or get a
  // deck - on copy that would have failed it.
  // A flagged build is the exception, and the only one. It is asked for after
  // the repair budget ran out with something still wrong, so refusing it here
  // would refuse the deck decision 07 says to hand over - and the findings are
  // not lost, they are printed below for the reply to list by slide.
  const findings = checkRun(run);
  if (findings.length > 0 && !flagged) {
    throw new Error(
      `the copy did not pass the content gate:\n${findings
        .map((finding) => `  slide ${finding.slide} ${finding.field}: ${finding.message}`)
        .join('\n')}`,
    );
  }

  // The run's state lives beside its run file, so every stage of the run finds
  // the same one.
  const stateFile = runStateFile(path.dirname(path.resolve(args.input)));

  const landmark = run.landmark?.file
    ? {
        photo: fs.readFileSync(run.landmark.file),
        credit: run.landmark.credit,
        width: run.landmark.width,
        // Carried in the run file so a rebuild after a repair still records
        // which rung the photo it is reusing came from.
        fallback: run.landmark.fallback,
      }
    : await findLandmark(run.headquarters, stateFile);

  // Keep the photo beside the run file once it has been found. A render round
  // repairs copy and builds again, and searching Commons a second time would
  // spend a download to arrive at the same picture - or at a different one,
  // which would make the rebuilt cover a new thing to inspect rather than the
  // same one with shorter text on it.
  const landmarkFile = run.landmark?.file ?? saveLandmark(args.input, landmark);

  const assetsDir = path.join(skillDir, 'assets');

  const file = await buildDeck({
    company: run.company,
    assetsDir,
    outDir,
    landmark,
    thesis: run.thesis,
    marketMap: await readMapLogos(run.marketMap, assetsDir),
    writtenForm: run.writtenForm,
    headquarters: run.headquarters,
    identification: run.identification,
    rejected: run.rejected,
    landmarkFallback: landmark.fallback,
    flagged,
  });

  // The run's most expensive stage, so how long it took is the first thing a
  // slow run gets read against.
  mark(path.dirname(path.resolve(args.input)), 'build-deck');

  console.log(
    JSON.stringify(
      {
        ok: true,
        file,
        slides: 9,
        flagged,
        // What is still wrong with it, so the reply can list it by slide
        // instead of the model reconstructing it from memory.
        ...(flagged && findings.length > 0 ? { findings } : {}),
        landmark: landmark.credit?.fileName,
        // Where the photo was kept, so a rebuild after a render repair can pass
        // it back in and leave the cover's picture alone.
        landmarkFile,
      },
      null,
      2,
    ),
  );
}

/**
 * Keep the downloaded cover photo next to the run file it was found for.
 *
 * A photo that cannot be saved is not worth failing a built deck over: the run
 * simply pays for the download again if it rebuilds.
 *
 * @param {string} input  The run file's path.
 * @param {{photo: Buffer}} landmark
 * @returns {string | undefined}
 */
function saveLandmark(input, landmark) {
  try {
    const file = path.join(path.dirname(path.resolve(input)), 'landmark.jpg');
    fs.writeFileSync(file, landmark.photo);
    return file;
  } catch {
    return undefined;
  }
}

/**
 * The logo the model looked at, normalised the way the market map needs it.
 *
 * `verified` has to be said explicitly: a run that never showed the logo to the
 * model has not confirmed anything, and the map sets that company as type.
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
      // Kept, not swallowed. The map records why a company fell back to type:
      // a competitor set as a wordmark for no stated reason reads as something
      // that went wrong rather than as a decision.
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

/**
 * The cover photo, found by walking decision 07's ladder rather than by making
 * one search and giving up.
 *
 * A rung below the headquarters city is a quality note, and it is recorded in
 * the run's state so the reply can name it. The run supplies the metro and the
 * region, because which city is nearest is a judgment about a map.
 *
 * @param {{city: string, metro?: string, region?: string}} headquarters
 * @param {string} stateFile
 */
async function findLandmark(headquarters, stateFile) {
  const found = await findLandmarkOnLadder({ headquarters });

  // Recorded here, by the stage that actually settled for it. A reply that
  // worked out afterwards which rung the photo came from would be guessing at
  // something this already knows.
  if (found.fallback) openRunState({ file: stateFile }).noteFallback(found.fallback);

  return {
    photo: found.photo,
    credit: found.credit,
    width: found.width,
    fallback: found.fallback,
  };
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
