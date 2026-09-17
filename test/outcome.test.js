// What a run delivers: the file name it writes under, and the fixed reply that
// goes with each of the three outcomes.
//
// Decision 07 fixes both. The reply templates are about six lines and the run
// does not narrate progress, so these tests hold the shape rather than the
// prose: a template that grew a paragraph would still read fine and would still
// be the wrong thing to send.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { deckFileName } = require('../skill/src/design.js');
const { outcomeReply } = require('../skill/src/outcome.js');
const { tempDir } = require('./helpers.js');

const REPLY = path.join(__dirname, '..', 'skill', 'src', 'reply.js');

/**
 * A run that has already recorded what it fell back to and what is wrong.
 *
 * @param {{fallbacks?: string[], defects?: {slide: number, message: string}[]}} recorded
 */
function runThatEnded({ fallbacks = [], defects = [] }) {
  const work = tempDir('recur-reply-');
  fs.writeFileSync(
    path.join(work, 'run-state.json'),
    JSON.stringify({ startedAt: Date.now(), rounds: {}, fallbacks, defects }),
  );
  return work;
}

test('a flagged deck carries NOT READY in its name, so nobody mails it by accident', () => {
  // Decision 07: a deck with a critical defect that survived the repair budget
  // is still delivered, because a founder's deck that is nearly right is worth
  // more than nothing - but it says so in the one place a person cannot miss.
  assert.equal(deckFileName('US Fleet Tracking'), 'Recur x US Fleet Tracking.pptx');
  assert.equal(
    deckFileName('US Fleet Tracking', { flagged: true }),
    'Recur x US Fleet Tracking - NOT READY.pptx',
  );
});

test('a clean run says what it delivered, and nothing about how it got there', () => {
  const reply = outcomeReply({
    outcome: 'clean',
    company: 'US Fleet Tracking',
    headquarters: 'Oklahoma City, Oklahoma',
  });

  const lines = reply.split('\n').filter(Boolean);
  assert.ok(lines.length <= 6, `decision 07 fixes this at about six lines, not ${lines.length}`);
  assert.match(reply, /Company: US Fleet Tracking, Oklahoma City, Oklahoma/);

  // Lines that are conditional on something having happened. A run that states
  // an assumption it never made, or a fallback it never took, reads as though
  // something went wrong when nothing did.
  assert.doesNotMatch(reply, /Assumed:/);
  assert.doesNotMatch(reply, /Fallbacks:/);

  // Decision 07: the model does not narrate progress during the run, and the
  // reply is not where the narration goes instead.
  assert.doesNotMatch(
    reply,
    /searched|rendered|repair|round|checked|looked at/i,
    'the reply says what was delivered, not what the run did to deliver it',
  );
});

test('a flagged run leads with what is wrong, by slide', () => {
  // Decision 07 puts the defects above the download rather than below it. The
  // file is about to be forwarded to someone who did not read this reply, so
  // the warning has to be the thing that is hardest to scroll past.
  const reply = outcomeReply({
    outcome: 'flagged',
    company: 'Acme',
    headquarters: 'Austin, Texas',
    defects: [
      { slide: 3, message: 'only four competitors are placed' },
      { slide: 1, message: 'the cover has no photo' },
    ],
  });

  assert.match(reply.split('\n')[0], /^⚠ Not ready to mail\. 2 issues remain:/);
  assert.match(reply, /slide 3.*only four competitors/);
  assert.match(reply, /slide 1.*the cover has no photo/);
  assert.match(reply, /Company: Acme, Austin, Texas/, 'a flagged deck is still delivered');

  const one = outcomeReply({
    outcome: 'flagged',
    company: 'Acme',
    defects: [{ slide: 2, message: 'a bullet overflows its box' }],
  });
  assert.match(
    one.split('\n')[0],
    /^⚠ Not ready to mail\. 1 issue remains:/,
    'one defect reads as one defect, not as "1 issue(s)"',
  );
});

test('the reply names what the run recorded, without being told it again', () => {
  // The ladder recorded its fallback during the build, and the gate recorded
  // what it could not repair. Both happened in processes that have since
  // exited. Asking the model to carry them to the reply by memory is exactly
  // how a fixed template stops being fixed, so the reply reads them back.
  const work = runThatEnded({
    fallbacks: ['metro landmark (Dallas, Texas)', '2 competitor wordmarks'],
  });

  const reply = execFileSync(
    process.execPath,
    [REPLY, '--work', work, '--outcome', 'clean', '--company', 'Acme', '--headquarters', 'Austin, Texas'],
    { encoding: 'utf8' },
  );

  assert.match(reply, /Company: Acme, Austin, Texas/);
  assert.match(reply, /Fallbacks: metro landmark \(Dallas, Texas\), 2 competitor wordmarks/);
});

test('a flagged reply lists the defects the run could not repair', () => {
  const work = runThatEnded({
    defects: [{ slide: 3, message: 'only four competitors could be evidenced' }],
  });

  const reply = execFileSync(
    process.execPath,
    [REPLY, '--work', work, '--outcome', 'flagged', '--company', 'Acme'],
    { encoding: 'utf8' },
  );

  assert.match(reply.split('\n')[0], /^⚠ Not ready to mail\. 1 issue remains:/);
  assert.match(reply, /slide 3: only four competitors could be evidenced/);
});

test('the flagged reply lists every defect, handed to it or already recorded', () => {
  // Two sources, because the defects come from two places: what a stage wrote
  // down as it went, and what the model was still holding when the budget ran
  // out. A reply that carried only one of them would under-report, which on
  // this template is the failure that matters.
  const work = runThatEnded({
    defects: [{ slide: 1, message: 'no usable cover photo was found' }],
  });

  const reply = execFileSync(
    process.execPath,
    [
      REPLY,
      '--work',
      work,
      '--outcome',
      'flagged',
      '--company',
      'Acme',
      '--defects',
      '3:only four competitors could be evidenced',
    ],
    { encoding: 'utf8' },
  );

  assert.match(reply.split('\n')[0], /^⚠ Not ready to mail\. 2 issues remain:/);
  assert.match(reply, /slide 1: no usable cover photo was found/);
  assert.match(reply, /slide 3: only four competitors could be evidenced/);
});

test('a best-effort target says so, in the one line decision 07 gives it', () => {
  // The one template that was left to be remembered, in a file whose whole
  // argument is that remembered templates drift.
  const reply = execFileSync(
    process.execPath,
    [
      REPLY,
      '--work',
      runThatEnded({}),
      '--outcome',
      'clean',
      '--company',
      'Acme',
      '--headquarters',
      'Austin, Texas',
      '--best-effort',
      'a public company, not a private software business',
    ],
    { encoding: 'utf8' },
  );

  assert.match(
    reply,
    /Outside the covered scope \(a public company, not a private software business\); treat as best-effort\./,
  );
  const lines = reply.split('\n').filter(Boolean);
  assert.ok(lines.length <= 6, `still about six lines, not ${lines.length}`);
});

test('an evidence failure hands over no deck, and says what to try instead', () => {
  const reply = outcomeReply({
    outcome: 'evidence-failure',
    company: 'Acme',
    couldNotEstablish: 'what Acme sells and who buys it',
    tried: 'acme.example and two industry directories',
    fix: 'Resend with the website, e.g. Create a Recur sell deck for Acme (acme.com)',
  });

  assert.match(reply, /what Acme sells and who buys it/);
  assert.match(reply, /acme\.example/, 'what was tried, so nobody repeats it by hand');
  assert.match(reply, /acme\.com/, 'and the fix, spelled out as something to send');

  // No deck was built. Nothing in the reply may read as though one was, because
  // a "Company:" line beside no download is a person hunting for a file.
  assert.doesNotMatch(reply, /Company: Acme,/);
  assert.doesNotMatch(reply, /Fallbacks:/);

  const lines = reply.split('\n').filter(Boolean);
  assert.ok(lines.length <= 6, `decision 07 fixes this at about six lines, not ${lines.length}`);
});
