// Stage 0 of the unattended run: can this sandbox reach the web at all?
//
// Decision 07 puts one test download in front of everything else. The sandbox's
// domain allowlist defaults to "Package managers only", and under that setting
// every fetch a run makes fails - the company's site, Commons, every logo. A run
// that discovers this at the landmark download has already spent the model's
// effort on identifying the company and writing a thesis, and it arrives at
// nothing. This spends seconds instead, and fails the run as an evidence failure
// with the one setting that fixes it.
//
// Nothing here judges anything. It answers one question with one request, which
// is what lets it sit in front of a stage that costs real time.

const fs = require('node:fs');
const path = require('node:path');

const { CHROME_UA } = require('./http.js');
const { PREFLIGHT, FIXED_SLIDE_NUMBERS, RASTERIZER_ASSETS } = require('./design.js');

// Every file the skill cannot build a deck without. A ZIP that unpacked short
// produces a run that gets all the way to the build before failing on a missing
// wordmark, having spent the model's effort and most of the clock to find out.
const SHIPPED_ASSETS = [
  'recur-wordmark-white.png',
  'recur-wordmark-navy.png',
  RASTERIZER_ASSETS.svg,
  RASTERIZER_ASSETS.webp,
  ...FIXED_SLIDE_NUMBERS.map((slide) => `fixed-slide-${slide}.png`),
];

/**
 * @typedef {import('./http.js').FetchLike} FetchLike
 * @typedef {{
 *   ok: boolean,
 *   blocked: boolean,
 *   startedAt: number,
 *   reason?: string,
 *   fix?: string,
 * }} Preflight
 */

// The one thing a person has to change, worded as decision 07 words it. It is
// exported because the run's reply says the same sentence, and a fix a run
// states two slightly different ways is one a reader has to reconcile.
const ALLOWLIST_FIX =
  'Set Settings > Capabilities > Domain allowlist to All domains, then resend.';

/**
 * Probe the network, and record when the run started.
 *
 * The start time comes from here because this is the first thing a run does:
 * the twelve-minute repair cutoff is measured from it, and a cutoff measured
 * from anywhere later would quietly hand the run extra time.
 *
 * @param {object} [options]
 * @param {FetchLike} [options.fetchImpl]
 * @param {() => number} [options.now]
 * @param {string} [options.probe]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.skillDir]  The installed skill, to check it unpacked whole.
 * @returns {Promise<Preflight>}
 */
async function preflight({
  fetchImpl = /** @type {FetchLike} */ (/** @type {unknown} */ (fetch)),
  now = Date.now,
  probe = PREFLIGHT.probe,
  timeoutMs = PREFLIGHT.timeoutMs,
  skillDir,
} = {}) {
  const startedAt = now();

  // The install is checked first because it is free: reading a directory costs
  // nothing next to a network round trip, and a skill that unpacked short is not
  // going to build a deck however well the network answers.
  if (skillDir) {
    const missing = SHIPPED_ASSETS.filter(
      (asset) => !fs.existsSync(path.join(skillDir, 'assets', asset)),
    );

    if (missing.length > 0) {
      // Deliberately not blocked: this is an install that came up short, and
      // reporting it as a network problem sends someone to change an allowlist
      // setting that was already right, only to hit the same wall again.
      return {
        ok: false,
        blocked: false,
        startedAt,
        reason: `the installed skill is missing ${missing.join(', ')}`,
        fix: 'Reinstall the skill from its ZIP, then resend.',
      };
    }
  }

  try {
    const reply = await answerWithin(
      timeoutMs,
      (signal) => fetchImpl(probe, { headers: { 'User-Agent': CHROME_UA }, signal }),
    );

    if (reply.ok) return { ok: true, blocked: false, startedAt };

    // Reachable, and unhappy. The socket opened, so the allowlist is not what
    // is wrong and telling someone to change it would send them after a setting
    // that was already right. Commons being down is a real possibility and a
    // different problem, so it is reported as itself.
    return {
      ok: false,
      blocked: false,
      startedAt,
      reason: `the photo source answered with HTTP ${reply.status}`,
    };
  } catch (error) {
    // A domain the allowlist refuses never opens a socket, so fetch rejects
    // rather than answering. That is the signature this is looking for.
    return {
      ok: false,
      blocked: true,
      startedAt,
      reason: `the sandbox could not reach the web: ${
        error instanceof Error ? error.message : String(error)
      }`,
      fix: ALLOWLIST_FIX,
    };
  }
}

/**
 * Give the probe a deadline, and treat missing it as not getting through.
 *
 * Two things are needed rather than one. The signal is what closes a real
 * socket, so a stalled connection cannot keep the process alive after the run
 * has already decided it cannot start. The race is what bounds the wait at all,
 * because honouring a signal is the caller's choice and a fetch that ignores it
 * would otherwise be waited on forever.
 *
 * @template T
 * @param {number} timeoutMs
 * @param {(signal: AbortSignal) => Promise<T>} attempt
 * @returns {Promise<T>}
 */
async function answerWithin(timeoutMs, attempt) {
  const controller = new AbortController();
  /** @type {NodeJS.Timeout | undefined} */
  let timer;

  try {
    return await Promise.race([
      attempt(controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`no answer within ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    // Cleared whichever way the race went, so a probe that answered promptly
    // does not leave a timer holding the event loop open behind it.
    clearTimeout(timer);
  }
}

module.exports = { ALLOWLIST_FIX, preflight };
