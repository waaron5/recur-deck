// Getting the logo off the company's own site, and handing it to the model to
// check before anything uses it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { acquireLogo } = require('../skill/src/fetch-logo.js');
const { ensureBuilt } = require('./helpers.js');

const PAGE = `<!doctype html><html><head>
  <meta property="og:image" content="/social/card.png">
</head><body>
  <header>
    <a href="/" aria-label="Acme home"><svg viewBox="0 0 120 32"><rect width="120" height="32" fill="currentColor"/></svg></a>
  </header>
  <section class="customers">
    <img src="/media/Logo-DHL-v2.svg" alt="DHL logo">
  </section>
</body></html>`;

async function assetsDir() {
  const { stageDir } = await ensureBuilt();
  return path.join(stageDir, 'assets');
}

test("the logo comes off the company's own site, normalised and ready to check", async () => {
  /** @type {{url: string, ua: string}[]} */
  const asked = [];
  const fetchImpl = async (url, init) => {
    asked.push({ url, ua: String(init?.headers?.['User-Agent'] ?? '') });
    return { ok: true, status: 200, url, text: async () => PAGE };
  };

  const found = await acquireLogo({
    site: 'https://www.acme.com/',
    assetsDir: await assetsDir(),
    fetchImpl,
  });

  assert.equal(found.kind, 'home-link', "the mark inside the home link is the company's own");
  assert.equal(found.logo.sourceFormat, 'svg');
  assert.equal(
    found.logo.png.subarray(1, 4).toString('ascii'),
    'PNG',
    'the model has to be able to look at it',
  );
  assert.ok(!String(found.source).includes('DHL'), "a customer's logo is never what comes back");

  // Ordinary sites answer the bare default user agent with a 403, which would
  // make a reachable company look like it has no website at all.
  assert.match(asked[0].ua, /Chrome/, 'every fetch sends a full Chrome user agent');
});

test('a page crowded with logo images still reaches the lower rungs', async () => {
  // The ladder is an order, not a top-four. A header full of logo-ish images
  // whose files will not come down must not use up every attempt, or a site
  // whose real mark is in its stylesheet is never reached at all.
  const crowded = `<!doctype html><html><head>
    <style>.brand { background-image: url("/assets/acme-logo.svg"); }</style>
  </head><body><header>
    <img src="/a-logo.png"><img src="/b-logo.png"><img src="/c-logo.png">
    <img src="/d-logo.png"><img src="/e-logo.png"><img src="/f-logo.png">
  </header></body></html>`;

  const asked = [];
  const fetchImpl = async (url) => {
    if (url.endsWith('/')) return { ok: true, status: 200, url, text: async () => crowded };
    asked.push(url);
    // Only the stylesheet's mark can actually be downloaded.
    if (url.includes('acme-logo.svg')) {
      return {
        ok: true,
        status: 200,
        url,
        arrayBuffer: async () =>
          /** @type {ArrayBuffer} */ (
            new TextEncoder().encode(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32"><rect width="120" height="32" fill="#111"/></svg>',
            ).buffer
          ),
      };
    }
    return { ok: false, status: 404 };
  };

  const found = await acquireLogo({
    site: 'https://www.acme.com/',
    assetsDir: await assetsDir(),
    fetchImpl,
  });

  assert.equal(found.kind, 'css', 'the stylesheet rung should still be reached');
  assert.ok(
    asked.some((url) => url.includes('acme-logo.svg')),
    'the crowded header should not consume every attempt',
  );
});

test('a site that refuses the fetch gives a reason and no logo', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403 });

  const dir = await assetsDir();

  await assert.rejects(
    () => acquireLogo({ site: 'https://www.acme.com/', assetsDir: dir, fetchImpl }),
    /403/,
    'the run needs to know the site refused, not that the company has no logo',
  );
});
