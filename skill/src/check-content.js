#!/usr/bin/env node
// The content gate's entry point. Bundled to <skill>/scripts/check-content.js,
// so it runs from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/check-content.js --input run.json
//
// It reads the same run file build-deck.js does and reports what the countable
// writing rules find, without building anything:
//
//   {"ok": true, "findings": []}
//
//   {"ok": false, "findings": [
//     {"slide": 2, "field": "thesis.here.header", "rule": "word-count",
//      "message": "15 words, and a header stays within 12 words: shorten it"}
//   ]}
//
// The point of running it before the build is that a run repairs the fields it
// names and runs it again, rather than building a deck and discovering the copy
// was wrong afterwards. Each finding names one field, so a repair rewrites only
// what failed.
//
// It exits non-zero when there is anything to fix, so a run cannot read past a
// failure by accident.

const fs = require('node:fs');
const { parseArgs } = require('./args.js');
const { checkRun } = require('./content-gate.js');

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error('usage: check-content.js --input run.json');

  const findings = checkRun(JSON.parse(fs.readFileSync(args.input, 'utf8')));
  console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
  if (findings.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
