// Finding the headquarters landmark photo on Wikimedia Commons.
//
// The responses under fixtures/ are real recorded Commons replies, so these
// tests hold against the API's actual shape without touching the network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { findLandmarkPhoto, cityLandmarkSearch, LandmarkNotFound } = require('../skill/src/landmark.js');

/** @param {string} name */
const fixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'));

/** The recorded reply, cut down to the one file a test wants served first. */
function onlyFile(name) {
  const reply = fixture('commons-oklahoma-city');
  const pages = Object.entries(reply.query.pages).filter(
    ([, page]) => /** @type {any} */ (page).title === `File:${name}`,
  );
  if (pages.length === 0) throw new Error(`fixture has no file called ${name}`);
  return { batchcomplete: '', query: { pages: Object.fromEntries(pages) } };
}

/**
 * A stand-in for global fetch that answers from a recorded response, so a test
 * can see exactly what the module asked for.
 *
 * @param {object} [options]
 * @param {unknown} [options.search]   The Commons API reply to serve.
 * @param {Buffer} [options.photo]     The bytes to serve for a thumbnail request.
 * @param {boolean} [options.photoFails]  Answer thumbnail requests with a 404.
 */
function fakeFetch({
  search = fixture('commons-oklahoma-city'),
  photo = Buffer.from('a landmark photo'),
  photoFails = false,
} = {}) {
  /** @type {{url: string, headers: Record<string, string>}[]} */
  const calls = [];
  /** @type {any} */
  const fetchImpl = async (/** @type {string} */ url, /** @type {any} */ init = {}) => {
    calls.push({ url: String(url), headers: init.headers ?? {} });
    if (String(url).includes('/w/api.php')) {
      return { ok: true, status: 200, json: async () => search };
    }
    if (photoFails) return { ok: false, status: 404 };
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => photo.buffer.slice(photo.byteOffset, photo.byteOffset + photo.byteLength),
    };
  };
  return { fetchImpl, calls };
}

test('finds a photo of the headquarters city and reports who to credit', async () => {
  const { fetchImpl } = fakeFetch({ photo: Buffer.from('a landmark photo') });

  const found = await findLandmarkPhoto({ search: 'Oklahoma City downtown skyline', fetchImpl });

  assert.equal(found.photo.toString(), 'a landmark photo');
  assert.equal(found.credit.fileName, 'Oklahoma City downtown skyline May 2024.jpg');
  assert.equal(found.credit.artist, 'Kerwin Moore');
  assert.equal(found.credit.licence, 'CC BY-SA 4.0');
  assert.match(found.credit.descriptionUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.ok(found.width >= 1600, `photo is ${found.width}px wide, below the 1600px floor`);
});

test('the credit names a person, not a fragment of markup', async () => {
  // Commons returns Artist as an HTML anchor whenever the uploader has a user
  // page. It goes into speaker notes a person reads, so the tags have to be
  // gone by the time it leaves here.
  const { fetchImpl } = fakeFetch({ search: onlyFile('Downtown Oklahoma City skyline.jpg') });

  const { credit } = await findLandmarkPhoto({ search: 'Oklahoma City', fetchImpl });

  assert.equal(credit.artist, 'Urbanative');
});

test('every request identifies itself as Chrome', async () => {
  // Ordinary sites answer the bare Mozilla/5.0 default with a 403, so a run
  // that forgets the header looks like a company with no website.
  const { fetchImpl, calls } = fakeFetch();

  await findLandmarkPhoto({ search: 'Oklahoma City', fetchImpl });

  assert.ok(calls.length >= 2, 'expected a search and a download');
  for (const call of calls) {
    const agent = call.headers['User-Agent'] ?? call.headers['user-agent'] ?? '';
    assert.match(agent, /Chrome\/\d+/, `${call.url} went out without a Chrome user-agent`);
  }
});

test('a city with no usable photo fails honestly rather than returning nothing', async () => {
  const { fetchImpl } = fakeFetch({ search: fixture('commons-no-results') });

  await assert.rejects(
    () => findLandmarkPhoto({ search: 'Nowhere at all', fetchImpl }),
    LandmarkNotFound,
  );
});

test('a photo that will not download is passed over for the next candidate', async () => {
  const { fetchImpl } = fakeFetch({ photoFails: true });

  await assert.rejects(
    () => findLandmarkPhoto({ search: 'Oklahoma City', fetchImpl }),
    LandmarkNotFound,
  );
});

test('a 1920px thumbnail that will not download is retried at 1280', async () => {
  // Commons serves thumbnails at standard widths only, so the retry steps to
  // 1280 rather than to the cover's 1600px floor. The photo that comes back is
  // below that floor, which is why its width goes into the source record.
  const wide = fixture('commons-oklahoma-city');
  const narrow = JSON.parse(JSON.stringify(wide));
  for (const page of Object.values(narrow.query.pages)) {
    const info = /** @type {any} */ (page).imageinfo[0];
    info.thumbheight = Math.round(info.thumbheight * (1280 / info.thumbwidth));
    info.thumbwidth = 1280;
    info.thumburl = String(info.thumburl).replace('1920px-', '1280px-');
  }

  const bytes = Buffer.from('the narrower photo');
  /** @type {any} */
  const fetchImpl = async (/** @type {string} */ url) => {
    const target = String(url);
    if (target.includes('/w/api.php')) {
      const wanted = target.includes('iiurlwidth=1280') ? narrow : wide;
      return { ok: true, status: 200, json: async () => wanted };
    }
    if (target.includes('1920px-')) return { ok: false, status: 404 };
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };

  const found = await findLandmarkPhoto({ search: 'Oklahoma City', fetchImpl });

  assert.equal(found.photo.toString(), 'the narrower photo');
  assert.equal(found.width, 1280);
});

test('the search phrase for a city asks Commons for that city', async () => {
  assert.match(cityLandmarkSearch('Oklahoma City, Oklahoma'), /Oklahoma City/);
  assert.doesNotMatch(cityLandmarkSearch('Oklahoma City, Oklahoma'), /,/);
});
