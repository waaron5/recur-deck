#!/usr/bin/env node
// Stage 0's entry point. Bundled to <skill>/scripts/start-run.js, so it runs
// from the bundle alone with no package installs at run time.
//
//   node <skill-dir>/scripts/start-run.js --work work
//
// It answers one question before a run spends anything on research: can this
// sandbox do the job at all? It probes the network, checks the skill unpacked
// whole, and writes down the moment the run began.
//
//   {"ok": true, "startedAt": 1758067200000, "state": "work/run-state.json"}
//
// A run that cannot start says why, and what to change:
//
//   {"ok": false, "blocked": true,
//    "reason": "the sandbox could not reach the web: fetch failed",
//    "fix": "Set Settings > Capabilities > Domain allowlist to All domains, then resend."}
//
// It exits non-zero in that case, so a run cannot read past it by accident. The
// reply that follows is an evidence failure: no deck is built, because every
// fact one would carry would have to be invented.
//
// The start time is written here rather than inferred later because the repair
// budget's twelve-minute cutoff is measured from it. A run that recorded its
// start at the build would measure the cutoff from a point most of the way
// through itself, and the cutoff would never once fire.

const path = require('node:path');
const { parseArgs } = require('./args.js');
const { preflight } = require('./preflight.js');
const { openRunState, runStateFile } = require('./run-state.js');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workDir = args.work || process.cwd();

  // The bundle sits at <skill>/scripts/, so the assets it checks are one level
  // up - the same place build-deck.js looks for them.
  const skillDir = path.resolve(__dirname, '..');

  const checked = await preflight({ skillDir });

  if (!checked.ok) {
    console.error(
      JSON.stringify(
        { ok: false, blocked: checked.blocked, reason: checked.reason, fix: checked.fix },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  // The run's clock starts at the moment preflight recorded, not at the moment
  // this line runs, so every later stage measures the cutoff from the same
  // origin. Freezing the clock is safe here only because this process never
  // spends a round; the stages that do pass a real one.
  const stateFile = runStateFile(workDir);
  const state = openRunState({ file: stateFile, now: () => checked.startedAt });

  console.log(
    JSON.stringify({ ok: true, startedAt: state.startedAt, state: stateFile }, null, 2),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
