// The landmark ladder: what a run asks Commons for, and in what order.
//
// Decision 07 sets four rungs - a landmark in the headquarters city, that city's
// skyline, a landmark in the nearest major metro, then a state or regional one -
// and makes the last two quality notes, because a cover showing somewhere other
// than the company's own city is weaker without being unusable.
//
// The rungs are written here as the decision words them rather than read back
// out of the module. A ladder that quietly reordered itself would still be a
// list of four searches, and would still put the wrong city on the cover.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const fs = require('node:fs');
const path = require('node:path');

const { landmarkLadder, findLandmarkOnLadder } = require('../skill/src/ladder.js');

/** @param {string} name */
const fixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'));

/**
 * A Commons that has a photo for exactly one search phrase and nothing for any
 * other, so a test can put the only usable photo on the rung it means to test
 * and watch the ladder walk down to it.
 *
 * @param {{only: string}} options
 */
function commonsWithPhotoFor({ only }) {
  /** @type {string[]} */
  const searched = [];

  /** @type {any} */
  const fetchImpl = async (/** @type {string} */ url) => {
    const target = String(url);

    if (target.includes('/w/api.php')) {
      const search = new URL(target).searchParams.get('gsrsearch') ?? '';
      searched.push(search);
      return {
        ok: true,
        status: 200,
        json: async () =>
          search.includes(only) ? fixture('commons-oklahoma-city') : fixture('commons-no-results'),
      };
    }

    const bytes = Buffer.from('a landmark photo');
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };

  return { fetchImpl, searched };
}

test('the ladder steps from the headquarters city down to the region', () => {
  const rungs = landmarkLadder({
    city: 'Oklahoma City, Oklahoma',
    metro: 'Dallas, Texas',
    region: 'Oklahoma',
  });

  assert.deepEqual(
    rungs.map((rung) => rung.rung),
    ['city-landmark', 'city-skyline', 'metro-landmark', 'region-landmark'],
    'decision 07 fixes this order: the cover prefers the company\'s own city',
  );

  // The top rung asks for something recognisable, which is not the same request
  // as the skyline below it. Asking for both in one phrase measured worse on the
  // cities this already serves - landmark.js records that - so they stay apart.
  assert.match(rungs[0].search, /Oklahoma City/);
  assert.match(rungs[0].search, /landmark/);
  assert.doesNotMatch(rungs[0].search, /skyline/);

  assert.match(rungs[1].search, /Oklahoma City.*downtown skyline/);

  assert.deepEqual(
    rungs.map((rung) => rung.qualityNote),
    [false, false, true, true],
    'a cover from the metro or the region is a quality note, not a defect',
  );
});

test('a city with no known metro is not given an invented one', () => {
  // The run supplies the metro and the region, because which city is nearest is
  // a judgment about a map. A rung with nothing to search for is left out rather
  // than searched for blankly, which would return whatever Commons had.
  const rungs = landmarkLadder({ city: 'Oklahoma City, Oklahoma' });

  assert.deepEqual(
    rungs.map((rung) => rung.rung),
    ['city-landmark', 'city-skyline'],
    'the two rungs that need only the city are still there',
  );
});

test('a rung that finds nothing steps down to the next one', async () => {
  // Commons has no landmark for this city but does have its skyline, which is
  // the ordinary case the second rung exists for.
  const { fetchImpl, searched } = commonsWithPhotoFor({ only: 'downtown skyline' });

  const found = await findLandmarkOnLadder({
    headquarters: { city: 'Oklahoma City, Oklahoma' },
    fetchImpl,
  });

  assert.equal(found.rung, 'city-skyline');
  assert.equal(found.fallback, '', 'the cover still shows the company\'s own city');
  assert.ok(found.photo.length > 0, 'and it came back with an actual photo');
  assert.ok(
    searched.some((search) => search.includes('landmark')),
    'the rung above was tried first, not skipped',
  );
});

test('a cover that had to leave the city records that it did', async () => {
  // Decision 07 makes the metro rung a quality note: a deck carrying the
  // nearest big city is weaker than one carrying the company's own and is still
  // worth mailing. It is only worth anything, though, if the run says so - an
  // unremarked Dallas skyline on an Oklahoma City company reads as a mistake.
  const { fetchImpl } = commonsWithPhotoFor({ only: 'Dallas' });

  const found = await findLandmarkOnLadder({
    headquarters: { city: 'Oklahoma City, Oklahoma', metro: 'Dallas, Texas' },
    fetchImpl,
  });

  assert.equal(found.rung, 'metro-landmark');
  assert.match(found.fallback, /metro landmark/, 'named the way the reply names it');
  assert.match(found.fallback, /Dallas/, 'and saying which city it settled for');
});
