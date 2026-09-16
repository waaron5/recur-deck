// The thesis page's content model: the structured research object the model
// fills in and the deck consumes.
//
// These tests are at the module seam rather than the .pptx, because ticket 05
// extends this object with the market map and ticket 06 validates its copy.
// Both need the object's shape and its rejections to be a stated contract.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { thesisSections, thesisNotes, SECTION_KEYS } = require('../skill/src/thesis.js');
const { COLORS } = require('../skill/src/design.js');
const { TEST_THESIS, thesisWith } = require('./helpers.js');

test('the three sections keep their fixed roles, in order', () => {
  // The roles cannot drift between sections: "why we're here" is a category
  // observation, "why we're excited" is company facts, "how we can help" is
  // Recur proposals. Keying by role rather than ordering a list is what stops
  // a run from quietly swapping them.
  assert.deepEqual(SECTION_KEYS, ['here', 'excited', 'help']);

  const sections = thesisSections(TEST_THESIS);
  assert.deepEqual(
    sections.map((s) => s.label),
    ["Why we're here", "Why we're excited", 'How we can help'],
  );
});

test('each section carries its header and exactly two bullets', () => {
  const sections = thesisSections(TEST_THESIS);
  assert.equal(sections.length, 3);
  for (const section of sections) {
    assert.ok(section.header.length > 0, `${section.key} should carry a header`);
    assert.equal(section.bullets.length, 2, `${section.key} should carry two bullets`);
    for (const bullet of section.bullets) assert.ok(bullet.text.length > 0);
  }
});

test('each section carries the colours the reference sets for it', () => {
  // Measured off the reference Slide2.png: navy, pale cyan and teal circles,
  // and a navy numeral inside both the cyan and the teal one.
  const [here, excited, help] = thesisSections(TEST_THESIS);
  assert.deepEqual(
    [here.circle, excited.circle, help.circle],
    [COLORS.navy, COLORS.cyan, COLORS.teal],
  );
  assert.deepEqual(
    [here.numeral, excited.numeral, help.numeral],
    [COLORS.white, COLORS.navy, COLORS.navy],
  );
});

test('a section with the wrong number of bullets is rejected, by name', () => {
  // All six bullets stay required even when evidence is sparse: the answer to
  // thin sources is to say less, not to drop a bullet.
  const one = thesisWith('excited', {
    header: TEST_THESIS.excited.header,
    bullets: [TEST_THESIS.excited.bullets[0]],
  });
  assert.throws(() => thesisSections(one), /excited.*two bullets/i);

  const three = thesisWith('here', {
    header: TEST_THESIS.here.header,
    bullets: [...TEST_THESIS.here.bullets, TEST_THESIS.here.bullets[0]],
  });
  assert.throws(() => thesisSections(three), /here.*two bullets/i);
});

test('a bullet with no source is rejected', () => {
  // Every bullet is paired with its sources in the speaker notes, so a bullet
  // that cannot be sourced has nowhere to be recorded.
  const unsourced = thesisWith('excited', {
    header: TEST_THESIS.excited.header,
    bullets: [{ text: 'US Fleet Tracking serves commercial fleets', sources: [] }, TEST_THESIS.excited.bullets[1]],
  });
  assert.throws(() => thesisSections(unsourced), /source/i);
});

test('a missing section is rejected, by name', () => {
  const { help, ...withoutHelp } = TEST_THESIS;
  assert.throws(() => thesisSections(withoutHelp), /help/i);
  assert.throws(() => thesisSections(undefined), /thesis/i);
});

test('a section with no header is rejected', () => {
  const headerless = thesisWith('here', { header: '  ', bullets: TEST_THESIS.here.bullets });
  assert.throws(() => thesisSections(headerless), /here.*header/i);
});

test('the notes pair every bullet with its sources', () => {
  // This is the source record for slide 2: a reviewer checking the deck reads
  // each bullet beside the evidence behind it, without going back to the run.
  const notes = thesisNotes(thesisSections(TEST_THESIS));

  for (const key of SECTION_KEYS) {
    for (const bullet of TEST_THESIS[key].bullets) {
      assert.ok(notes.includes(bullet.text), `notes should carry "${bullet.text}"`);
      for (const source of bullet.sources) {
        assert.ok(notes.includes(source), `notes should carry the source ${source}`);
      }
    }
  }
});

test('the notes name each section, so a bullet is read against its role', () => {
  const notes = thesisNotes(thesisSections(TEST_THESIS));
  for (const label of ["Why we're here", "Why we're excited", 'How we can help']) {
    assert.ok(notes.includes(label), `notes should name ${label}`);
  }
});

test('the notes keep each bullet next to its own sources', () => {
  // A flat list of every URL at the bottom would satisfy "the sources are in
  // the notes" while telling a reviewer nothing about which claim each one
  // backs. Each bullet's sources must follow that bullet and precede the next.
  const notes = thesisNotes(thesisSections(TEST_THESIS));
  const first = TEST_THESIS.excited.bullets[0];
  const second = TEST_THESIS.excited.bullets[1];

  const sourceAt = notes.indexOf(first.sources[0]);
  assert.ok(sourceAt > notes.indexOf(first.text), 'sources follow their bullet');
  assert.ok(sourceAt < notes.indexOf(second.text), 'and precede the next bullet');
});
