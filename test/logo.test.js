// Turning whatever a company's site serves into something the deck can place.
//
// Logos arrive as SVG and WebP, which the deck generator cannot place directly.
// Conversion was the known risk in ticket 03, so these tests run it against the
// real files the logo trial pulled down, not synthetic stand-ins.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normaliseLogo,
  logoPlacement,
  pickLogoCandidates,
} = require('../skill/src/logo.js');
const { ensureBuilt } = require('./helpers.js');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name));

/** The rasterizers ship as bundled assets, so tests read them where a run does. */
async function assetsDir() {
  const { stageDir } = await ensureBuilt();
  return path.join(stageDir, 'assets');
}

// A mark drawn the way sites actually serve one: no xmlns, and its colour left
// as currentColor for the page's CSS to supply. Both broke the prototype's
// rasterizer until they were handled.
const SITE_SVG = Buffer.from(
  '<svg viewBox="0 0 200 40"><rect x="0" y="8" width="24" height="24" fill="currentColor"/>' +
    '<text x="34" y="30" font-size="26" fill="currentColor">Acme</text></svg>',
);

test('an SVG logo becomes a PNG the deck can place', async () => {
  const logo = await normaliseLogo(SITE_SVG, { assetsDir: await assetsDir() });

  assert.equal(logo.sourceFormat, 'svg');
  assert.equal(
    logo.png.subarray(1, 4).toString('ascii'),
    'PNG',
    'an SVG that stayed an SVG cannot be placed on a slide',
  );
  assert.ok(logo.width > 0 && logo.height > 0, 'a placed logo needs real dimensions');
});

test('transparent padding is trimmed away, so the rules measure the mark', async () => {
  // Both files are 265 x 27 with 7 transparent columns down the right edge, so
  // the mark itself is 258 x 27. The resolution rule divides pixels by placed
  // inches, and padding counted as resolution would overstate how large a logo
  // can be set before it goes soft.
  const dir = await assetsDir();

  const fromPng = await normaliseLogo(fixture('usft-logo.png'), { assetsDir: dir });
  const fromWebp = await normaliseLogo(fixture('usft-logo-white.webp'), { assetsDir: dir });

  const cases = /** @type {[string, {png: Buffer, width: number, height: number}][]} */ ([
    ['PNG', fromPng],
    ['WebP', fromWebp],
  ]);

  for (const [name, logo] of cases) {
    assert.equal(logo.width, 258, `${name}: trimmed width should be the mark's own 258px`);
    assert.equal(logo.height, 27, `${name}: trimmed height should be the mark's own 27px`);
    assert.equal(logo.png.subarray(1, 4).toString('ascii'), 'PNG', `${name}: should stay a PNG`);
  }
});

// The slot a logo is placed into, written as a literal rather than imported
// from design.js: a test that reads the same constant the code places from only
// proves the code read its own value. There is one slot now - decision 01 of
// the tightening map took the logo off the cover.
//
// Market map: equal optical area rather than a uniform box, so a wide wordmark
// and a square mark carry the same weight, capped at 1.0875 x 0.315in.
//
// These are the ticket 10 prototype's sizes scaled by 0.75. The prototype was
// drawn on a 13.333in canvas and this deck's page is the original's 10in, so
// the same physical size is a different number of inches in each.
const MAP_SLOT = { area: 0.1406, maxWidth: 1.0875, maxHeight: 0.315, minHeight: 0.105 };

test("US Fleet Tracking's logo holds up at map size", async () => {
  // The rule is 150px per inch of placed width. This mark is 258 x 27px, so it
  // stays sharp to 258/150 = 1.72in wide. On the map it is sized by area to
  // 1.159in, capped to 1.0875in, and lands 0.114in tall - above that slot's
  // 0.105in floor, and still inside its sharp maximum.
  //
  // This mark used to be the case that failed the cover and passed the map from
  // one rule. Decision 01 of the tightening map took the logo off the cover, so
  // only the map's outcome is left to hold.
  const logo = await normaliseLogo(fixture('usft-logo.png'), { assetsDir: await assetsDir() });

  const onMap = logoPlacement({ logo, slot: MAP_SLOT });
  assert.equal(onMap.kind, 'logo', 'the same mark is sharp enough at map size');
  assert.ok(
    Math.abs(Number(onMap.width) - 1.0875) < 0.01,
    `map width ${onMap.width}, expected the 1.0875in cap`,
  );
  assert.ok(
    Math.abs(Number(onMap.height) - 0.114) < 0.01,
    `map height ${onMap.height}, expected about 0.114in`,
  );
  assert.ok(Number(onMap.height) >= 0.105, 'and no smaller than the map is allowed to go');
});

// A home page shaped like the ones the logo trial actually met: the company's
// own mark inside the link back to the home page, a wall of customer logos
// further down, and a social image in the head.
//
// This is the shape that beat the prototype's first heuristic. On Samsara it
// scored the customer logo "Logo-DHL-v2.svg" above Samsara's own mark, which is
// how 3 of 10 sites ended up with another company's logo.
const HOME_PAGE = `<!doctype html><html><head>
  <meta property="og:image" content="/social/card.png">
  <link rel="apple-touch-icon" href="/touch-icon.png">
</head><body>
  <header>
    <a href="/" aria-label="Acme home"><svg class="acme-logo" viewBox="0 0 120 32"><path d="M0 0h10v10H0z"/></svg></a>
    <nav><a href="/pricing">Pricing</a></nav>
  </header>
  <main>
    <section class="customers">
      <img src="/media/Logo-DHL-v2.svg" alt="DHL logo">
      <img src="/media/Logo-Swissport-v2.svg" alt="Swissport customer logo">
      <img src="/badges/g2-award-logo.png" alt="G2 award logo">
      <img src="/partners/acme-partner-logo.png" alt="partner logo">
    </section>
  </main>
</body></html>`;

test("a company's own mark outranks the customer logos on its page", async () => {
  const candidates = pickLogoCandidates(HOME_PAGE, 'https://www.acme.com/');

  assert.equal(
    candidates[0].kind,
    'home-link',
    "the mark inside the home link is the company's own, and comes first",
  );

  const urls = candidates.map((candidate) => String(candidate.url ?? '')).join(' ');
  for (const theirs of ['DHL', 'Swissport', 'g2-award', 'partner']) {
    assert.ok(!urls.includes(theirs), `${theirs} belongs to someone else and must not be offered`);
  }

  // The social image is a last resort, not a logo, so nothing may rank below it.
  const social = candidates.findIndex((candidate) => String(candidate.url ?? '').includes('social'));
  assert.ok(social > 0, 'the social image should still be available as a last resort');
});

test('a mark set only in CSS is still found, ahead of the social image', async () => {
  // Some sites never put their logo in an <img> at all: the header element is
  // empty and the mark arrives as a background image from the stylesheet. With
  // nothing else on the page, the alternative to reading CSS is the social
  // card, which is a screenshot with words on it rather than a logo.
  const cssOnly = `<!doctype html><html><head>
    <meta property="og:image" content="/social/card.png">
    <style>.brand { background-image: url("/assets/acme-logo.svg"); }</style>
  </head><body>
    <header><a href="/" class="brand"></a></header>
  </body></html>`;

  const candidates = pickLogoCandidates(cssOnly, 'https://www.acme.com/');
  const css = candidates.findIndex((c) => String(c.url ?? '').includes('acme-logo.svg'));
  const social = candidates.findIndex((c) => String(c.url ?? '').includes('social'));

  assert.ok(css >= 0, 'the stylesheet names the only logo on the page');
  assert.ok(social < 0 || css < social, 'and a real logo always outranks the social image');
});

test('a logo that cannot be converted gives a reason, never a broken image', async () => {
  // Favicons and animated GIFs both turn up where a logo was expected. Neither
  // can be placed, and a company whose logo ends here gets a text wordmark, so
  // what matters is that the reason names the format and nothing half converted
  // escapes to a slide.
  const dir = await assetsDir();
  const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x21, 0xf9]);
  const notAnImage = Buffer.alloc(32, 0x07);

  await assert.rejects(() => normaliseLogo(gif, { assetsDir: dir }), /gif/i);
  await assert.rejects(() => normaliseLogo(notAnImage, { assetsDir: dir }), /unknown/i);
});

test('a WebP logo becomes a PNG the deck can place', async () => {
  // US Fleet Tracking's own header logo, as its site serves it. The capability
  // probe found PptxGenJS could not place this file, which is what sent the
  // probe's deck to a 32px favicon instead.
  const logo = await normaliseLogo(fixture('usft-logo-white.webp'), {
    assetsDir: await assetsDir(),
  });

  assert.equal(logo.sourceFormat, 'webp');
  assert.equal(
    logo.png.subarray(1, 4).toString('ascii'),
    'PNG',
    'a WebP that stayed a WebP cannot be placed on a slide',
  );
});
