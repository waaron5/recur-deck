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

module.exports = { ensureBuilt, tempDir, openPptx, sha256 };
