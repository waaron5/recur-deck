// Shared test helpers: build the package once per test process, and read a PPTX
// the way a checker would — through its relationships, not by guessing part names.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');

const { buildPackage } = require('../scripts/build-package.js');

const EMU_PER_INCH = 914400;

/** @type {Promise<{stageDir: string, zipPath: string, fileCount: number}> | null} */
let built = null;

/** Build the shipping package once, no matter how many tests ask for it. */
function ensureBuilt() {
  if (!built) {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recur-pkg-'));
    built = buildPackage({ outDir });
  }
  return built;
}

/** A temp directory that is cleaned up when the test process exits. */
function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * A missing part means a malformed deck, so fail loudly and by name.
 *
 * @template T
 * @param {T | null | undefined} value
 * @param {string} what
 * @returns {T}
 */
function required(value, what) {
  if (value === null || value === undefined) throw new Error(`expected ${what} in the .pptx`);
  return value;
}

/**
 * Open a .pptx and expose the few structural facts the acceptance criteria care
 * about. Slide-to-part lookups go through each slide's .rels, because part
 * numbering is the writer's business, not a guarantee we should lean on.
 */
async function openPptx(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files);
  const text = (name) => required(zip.file(name), name).async('string');

  /** Resolve relationship targets from slide N's .rels by relationship type. */
  async function relTargets(slideNumber, type) {
    const rels = await text(`ppt/slides/_rels/slide${slideNumber}.xml.rels`);
    const pattern = new RegExp(`Type="[^"]*/${type}"[^>]*Target="([^"]+)"`, 'g');
    return [...rels.matchAll(pattern)].map((m) =>
      path.posix.normalize(path.posix.join('ppt/slides', m[1])),
    );
  }

  return {
    names,
    slideCount: names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length,

    /** The raw XML of slide N. */
    slideXml: (slideNumber) => text(`ppt/slides/slide${slideNumber}.xml`),

    /** Slide width and height in inches, from the presentation part. */
    async pageSizeInches() {
      const xml = await text('ppt/presentation.xml');
      const m = required(xml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/), 'a slide size');
      return { w: Number(m[1]) / EMU_PER_INCH, h: Number(m[2]) / EMU_PER_INCH };
    },

    /** The speaker-notes text of slide N, with empty notes coming back as ''. */
    async notesText(slideNumber) {
      const [target] = await relTargets(slideNumber, 'notesSlide');
      if (!target) return null;
      const xml = await text(target);
      // The notes body repeats the slide number in its placeholder; drop that
      // part and keep only the text the deck actually wrote.
      const body = xml.split('<p:ph type="sldNum"')[0];
      return [...body.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('');
    },

    /** sha256 of every image placed on slide N, in document order. */
    async imageHashes(slideNumber) {
      const targets = await relTargets(slideNumber, 'image');
      const out = [];
      for (const t of targets) out.push(sha256(await required(zip.file(t), t).async('nodebuffer')));
      return out;
    },

    /** Text shapes on slide N: their box in inches, plus the text they carry. */
    async textBoxes(slideNumber) {
      const xml = await text(`ppt/slides/slide${slideNumber}.xml`);
      const boxes = [];
      for (const shape of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
        const off = shape[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
        const ext = shape[0].match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
        if (!off || !ext) continue;
        boxes.push({
          x: Number(off[1]) / EMU_PER_INCH,
          y: Number(off[2]) / EMU_PER_INCH,
          w: Number(ext[1]) / EMU_PER_INCH,
          h: Number(ext[2]) / EMU_PER_INCH,
          text: [...shape[0].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((t) => t[1]).join(''),
        });
      }
      return boxes;
    },

    /** Offsets and extents (in inches) of every picture shape on slide N. */
    async pictureBoxes(slideNumber) {
      const xml = await text(`ppt/slides/slide${slideNumber}.xml`);
      return [...xml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)].map((m) => {
        const off = required(m[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/), 'a picture offset');
        const ext = required(m[0].match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/), 'a picture extent');
        return {
          x: Number(off[1]) / EMU_PER_INCH,
          y: Number(off[2]) / EMU_PER_INCH,
          w: Number(ext[1]) / EMU_PER_INCH,
          h: Number(ext[2]) / EMU_PER_INCH,
        };
      });
    },
  };
}

/**
 * A small stand-in for a downloaded Commons photo, so no test needs the
 * network. It is encoded with the same codec the cover treatment decodes with.
 *
 * @param {number} [width]
 * @param {number} [height]
 */
function testPhoto(width = 480, height = 270) {
  const jpeg = require('jpeg-js');
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = Math.round((x * 255) / width);
      data[i + 1] = Math.round((y * 255) / height);
      data[i + 2] = 200;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width, height }, 90).data;
}

/** The headquarters and cover photo a test hands to buildDeck. */
const TEST_HEADQUARTERS = {
  city: 'Oklahoma City, Oklahoma',
  source: 'https://www.usfleettracking.com/contact-us',
};

const TEST_CREDIT = {
  fileName: 'Downtown Oklahoma City skyline.jpg',
  artist: 'Urbanative',
  licence: 'CC0',
  descriptionUrl: 'https://commons.wikimedia.org/wiki/File:Downtown_Oklahoma_City_skyline.jpg',
};

/**
 * A research object's thesis, shaped the way the model is asked to write one:
 * the three fixed roles, each a header and exactly two bullets, every bullet
 * carrying the sources that slide 2's speaker notes pair it with.
 *
 * The help bullets cite the Recur introduction rather than the target's site,
 * because they are Recur proposals and not company facts.
 */
const TEST_THESIS = {
  here: {
    header: 'Commercial fleets are mid-cycle in adopting real-time telematics',
    bullets: [
      {
        text: 'Small commercial fleets still coordinate dispatch on homegrown tools',
        sources: ['https://www.fleetowner.com/technology/telematics'],
      },
      {
        text: 'Enterprise telematics platforms price and configure for large fleets',
        sources: ['https://www.samsara.com/pricing'],
      },
    ],
  },
  excited: {
    header: 'US Fleet Tracking sells live GPS tracking without long contracts',
    bullets: [
      {
        text: 'Vehicle locations refresh on a live map every ten seconds',
        sources: ['https://www.usfleettracking.com/'],
      },
      {
        text: 'Live tracking and in-vehicle video run in one app',
        sources: ['https://www.usfleettracking.com/products'],
      },
    ],
  },
  // Offers, and never a claim about what the target lacks. "Strengthen their
  // organic growth with an outbound team" would assert an absent outbound
  // motion, which is an invented fact and a critical defect.
  help: {
    header: "Bring Recur's go-to-market and AI strengths to US Fleet Tracking",
    bullets: [
      {
        text: "Apply Recur's go-to-market team to the live tracking product",
        sources: ['Recur introduction, slide 5'],
      },
      {
        text: 'Build AI features on the tracking and video data the product captures',
        sources: ['Recur introduction, slide 6'],
      },
    ],
  },
};

/** The test thesis with one section replaced, for the rejection cases. */
function thesisWith(section, copy) {
  return { ...TEST_THESIS, [section]: copy };
}

/**
 * A research object's market map, shaped the way the model is asked to write
 * one: two categorical axes, nine competitors plus the target, 0-1 coordinates
 * for each, and the callout in its decided three-part structure.
 *
 * The companies and placements are the illustrative US Fleet Tracking set from
 * the ticket 10 prototype. Its distribution is a legal one: four in the busiest
 * quadrant, and all four quadrants carrying a competitor.
 */
const TEST_MARKET_MAP = {
  subtitle: 'Fleet telematics splits between enterprise platforms and simple trackers',
  axes: {
    x: {
      name: 'Commitment model',
      low: 'Contract-bundled platform',
      high: 'No-contract live tracking',
      reasoning: 'Buyers choose first on whether tracking comes with a multi-year contract.',
    },
    y: {
      name: 'Fleet segment focus',
      low: 'Enterprise and large fleets',
      high: 'SMB commercial fleets',
      reasoning: 'Pricing and onboarding differ sharply between small and enterprise fleets.',
    },
  },
  companies: [
    {
      name: 'US Fleet Tracking',
      target: true,
      x: 0.76,
      y: 0.84,
      evidence: 'https://www.usfleettracking.com/',
      placement: 'Sells live tracking to small fleets with no contract required.',
    },
    {
      name: 'Azuga',
      x: 0.1,
      y: 0.86,
      evidence: 'https://www.azuga.com/',
      placement: 'Sells fleet tracking to small fleets on an annual plan.',
    },
    {
      name: 'GPS Insight',
      x: 0.39,
      y: 0.86,
      evidence: 'https://www.gpsinsight.com/',
      placement: 'Targets small and mid-size fleets on term agreements.',
    },
    {
      name: 'Force Fleet Tracking',
      x: 0.24,
      y: 0.62,
      evidence: 'https://www.forcefleettracking.com/',
      placement: 'Sells a simple tracker to small fleets on a subscription.',
    },
    {
      name: 'Linxup',
      x: 0.66,
      y: 0.62,
      evidence: 'https://www.linxup.com/',
      placement: 'Sells month-to-month tracking to small fleets.',
    },
    {
      name: 'Samsara',
      x: 0.1,
      y: 0.36,
      evidence: 'https://www.samsara.com/',
      placement: 'Prices and configures for large fleets on multi-year contracts.',
    },
    {
      name: 'Verizon Connect',
      x: 0.39,
      y: 0.36,
      evidence: 'https://www.verizonconnect.com/',
      placement: 'Bundles telematics into enterprise contracts.',
    },
    {
      name: 'Geotab',
      x: 0.1,
      y: 0.13,
      evidence: 'https://www.geotab.com/',
      placement: 'Sells through resellers to enterprise fleets.',
    },
    {
      name: 'Teletrac Navman',
      x: 0.39,
      y: 0.13,
      evidence: 'https://www.teletracnavman.com/',
      placement: 'Sells compliance-led telematics to large fleets.',
    },
    {
      name: 'Motive',
      x: 0.76,
      y: 0.2,
      evidence: 'https://gomotive.com/',
      placement: 'Sells fleet and driver safety to larger fleets without long lock-in.',
    },
  ],
  callout: {
    take: 'US Fleet Tracking wins small fleets that want fast tracking without a contract',
    dynamics: [
      'Enterprise platforms bundle long contracts and features small fleets rarely use',
      'AI-first entrants chase trucking compliance more than quick live tracking',
    ],
    proposal: 'Recur can add AI scoring to the GPS and video the product already streams',
  },
};

/** The test market map with one part replaced, for the rejection cases. */
function marketMapWith(part, value) {
  return { ...TEST_MARKET_MAP, [part]: value };
}

/**
 * A whole research object, the way a run writes one: the company, the thesis
 * and the market map together.
 *
 * The content gate reads all three at once, because some of its rules span
 * them - the company's name has to be spelled the same way on slide 2 as it is
 * on the map, and a number anywhere has to have a source behind it.
 */
const TEST_RESEARCH = {
  company: 'US Fleet Tracking',
  thesis: TEST_THESIS,
  marketMap: TEST_MARKET_MAP,
};

/**
 * The research object with parts replaced, for the rejection cases.
 *
 * Market-map parts merge one level down and thesis sections merge two, so a
 * test can name only the field it is breaking - a header on its own, without
 * restating the two bullets beside it - and the rest stays the clean fixture.
 * That keeps each test's intent readable: what it passes in is exactly what it
 * is testing.
 *
 * @param {{company?: string, thesis?: Record<string, any>, marketMap?: Record<string, any>}} patch
 */
function researchWith(patch = {}) {
  /** @type {Record<string, any>} */
  const thesis = { ...TEST_RESEARCH.thesis };
  for (const [key, section] of Object.entries(patch.thesis ?? {})) {
    thesis[key] = { ...TEST_RESEARCH.thesis[key], ...section };
  }

  return {
    ...TEST_RESEARCH,
    ...patch,
    thesis,
    marketMap: { ...TEST_RESEARCH.marketMap, ...(patch.marketMap ?? {}) },
  };
}

module.exports = {
  ensureBuilt,
  tempDir,
  openPptx,
  sha256,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
  TEST_THESIS,
  thesisWith,
  TEST_MARKET_MAP,
  marketMapWith,
  TEST_RESEARCH,
  researchWith,
};
