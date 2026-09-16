#!/usr/bin/env node
// The skill's one generation entry point. Bundled to <skill>/scripts/build-deck.js,
// so it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/build-deck.js --company "US Fleet Tracking"

const fs = require('node:fs');
const path = require('node:path');
const { buildDeck } = require('./deck.js');

const SANDBOX_OUTPUTS = '/mnt/user-data/outputs';

function parseArgs(argv) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.company) throw new Error('usage: build-deck.js --company "<company name>" [--out <dir>]');

  // The bundle sits at <skill>/scripts/, so its assets are one level up.
  const skillDir = path.resolve(__dirname, '..');
  const outDir = args.out || (fs.existsSync(SANDBOX_OUTPUTS) ? SANDBOX_OUTPUTS : process.cwd());

  const file = await buildDeck({
    company: args.company,
    assetsDir: path.join(skillDir, 'assets'),
    outDir,
  });

  console.log(JSON.stringify({ ok: true, file, slides: 9 }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
