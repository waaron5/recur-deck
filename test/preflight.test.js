// Preflight: stage 0 of the unattended run.
//
// Decision 07 puts one test download from a non-package host at the very front
// of a run, because the sandbox ships with its domain allowlist set to "Package
// managers only". Under that setting every fetch a run makes fails, and it fails
// late - after the model has identified the company and written a thesis - which
// spends most of a fifteen-minute budget to arrive at nothing. Preflight spends
// seconds to find that out first.
//
// The probe goes to Wikimedia Commons rather than to a generic canary host,
// because Commons is what the cover photo actually comes from: a probe of the
// real dependency answers the question a run has, and a probe of example.com
// only answers a question like it.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const fs = require('node:fs');
const path = require('node:path');

const { preflight } = require('../skill/src/preflight.js');
const { tempDir } = require('./helpers.js');

// Every file the installed skill has to have before a run starts. These are the
// names the package actually ships, asserted literally here and in
// package.test.js, rather than read out of the module being tested.
const SHIPPED_ASSETS = [
  'recur-wordmark-white.png',
  'recur-wordmark-navy.png',
  'resvg.wasm',
  'webp-dec.wasm',
  'fixed-slide-4.png',
  'fixed-slide-5.png',
  'fixed-slide-6.png',
  'fixed-slide-7.png',
  'fixed-slide-8.png',
  'fixed-slide-9.png',
];

/** A skill directory, with every shipped asset present unless one is named. */
function installedSkill({ without = '' } = {}) {
  const skillDir = tempDir('recur-skill-');
  fs.mkdirSync(path.join(skillDir, 'assets'), { recursive: true });

  for (const asset of SHIPPED_ASSETS) {
    if (asset === without) continue;
    fs.writeFileSync(path.join(skillDir, 'assets', asset), Buffer.from('assets are not read here'));
  }

  return skillDir;
}

/** A network that answers, so an install test is only testing the install. */
const reachable = async () => ({ ok: true, status: 200 });

test('a blocked domain is told apart from a host having a bad day', async () => {
  // These are the two failures that look alike from inside a run and need
  // opposite responses. A domain the allowlist refuses never opens a socket, so
  // fetch rejects; a host that is reachable but unhappy answers with a status.
  // Sending someone to change a setting that was never wrong is its own kind of
  // wrong answer, so the distinction is the first thing this module owes.
  const blocked = await preflight({
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.blocked, true);
  assert.match(
    String(blocked.fix),
    /Settings > Capabilities > Domain allowlist to All domains/,
    'a blocked run has exactly one fix, and it has to name the setting to change',
  );

  const unhappy = await preflight({
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });

  assert.equal(unhappy.ok, false);
  assert.equal(
    unhappy.blocked,
    false,
    'a 503 means the network is fine, so the allowlist is not what to change',
  );
});

test('a half-installed skill is caught before the run spends anything on research', async () => {
  // Decision 07 gives preflight a second job beside the probe: check the skill's
  // own files are there. A ZIP that unpacked short is not a network problem and
  // must not be reported as one, or someone changes an allowlist setting that
  // was never wrong and runs again into the same wall.
  const short = await preflight({
    fetchImpl: reachable,
    now: () => 1234,
    skillDir: installedSkill({ without: 'fixed-slide-7.png' }),
  });

  assert.equal(short.ok, false);
  assert.equal(short.blocked, false, 'the network answered; this is an install problem');
  assert.match(String(short.reason), /fixed-slide-7\.png/, 'and it names the file that is missing');
  assert.equal(short.startedAt, 1234, 'the run is timed from preflight either way');

  const whole = await preflight({
    fetchImpl: reachable,
    now: () => 1234,
    skillDir: installedSkill(),
  });

  assert.equal(whole.ok, true, 'a complete install over a reachable network is a run that can start');
});

test('a probe that never answers is abandoned, rather than eating the run', async () => {
  // Decision 07 says a blocked run stops within seconds, and the whole point of
  // preflight is that it is cheap. A refused domain usually fails fast, but a
  // connection that hangs is the same problem wearing a different coat - and
  // node's fetch has no timeout of its own, so nothing gives up unless this
  // does. Without it the cheapest stage in the run becomes the longest.
  const started = Date.now();

  const stalled = await preflight({
    fetchImpl: () => new Promise(() => {}),
    timeoutMs: 50,
  });

  assert.equal(stalled.ok, false);
  assert.equal(stalled.blocked, true, 'nothing got through, whatever the reason');
  assert.match(String(stalled.fix), /Domain allowlist/);
  assert.ok(Date.now() - started < 2000, 'and it gave up long before the run would have');
});
