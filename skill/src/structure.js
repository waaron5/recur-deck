// The structural check a build passes before anything is rendered.
//
// Stage 6 of the unattended-run decision (issues/07-define-unattended-run.md)
// puts this between building the file and looking at it: exactly nine slides,
// slides 4-9 present and in order, speaker notes on slides 1-3, and the file
// reopens after being written.
//
// It reads the written file rather than the objects that produced it. That is
// the whole point: a deck that was assembled correctly and then written badly is
// exactly the failure this catches, and only the bytes on disk can show it.
//
// What it reports are **critical defects** as CONTEXT.md defines them - "a wrong
// slide count or order, or a missing or unopenable file" - and not the content
// gate's findings. The difference is not vocabulary. A finding names one field
// for a repair round to rewrite; nothing here is repaired by rewriting copy,
// because a deck that came out with eight slides is a fault in this package. So
// these carry no field, and assertStructure fails the build with them rather
// than handing them to a repair round.
//
// How far the reopen goes, stated plainly because the comment that said "and
// parse" was claiming more than the code did: the container opens, the
// presentation part is there, every slide the presentation lists is present, and
// each one carries a complete root element. That catches a deck truncated or
// corrupted on write. It does not validate the XML against the schema, which
// would mean shipping a parser inside the 200-file cap to check for a failure
// PptxGenJS has no way of producing.
//
// Decision 07 names python-pptx as what reopens the file. Reading the package
// here keeps the check inside the one bundled script the skill ships, and asks
// the same question of the same bytes.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const { GENERATED_SLIDE_NUMBERS, FIXED_SLIDE_NUMBERS } = require('./design.js');

/**
 * @typedef {{slide: number, rule: string, message: string}} Defect
 */

/** How many slides a finished deck has. */
const SLIDE_COUNT = GENERATED_SLIDE_NUMBERS.length + FIXED_SLIDE_NUMBERS.length;

/**
 * One thing wrong with the built file.
 *
 * `slide` is the slide it sits on, or 0 for the file as a whole, which is where
 * a deck that will not reopen belongs: it has no slides to blame.
 *
 * @param {number} slide
 * @param {string} rule
 * @param {string} message
 * @returns {Defect}
 */
const defect = (slide, rule, message) => ({ slide, rule, message });

const sha256 = (/** @type {Buffer} */ buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Check the written deck, and fail the build if anything is wrong with it.
 *
 * This is the form the generator uses. The message is built here, beside the
 * defects themselves, so that how a defect reads stays with what a defect is.
 *
 * @param {string} file
 * @param {{assetsDir: string}} options
 * @returns {Promise<void>}
 */
async function assertStructure(file, { assetsDir }) {
  const defects = await checkStructure(file, { assetsDir });
  if (defects.length === 0) return;

  throw new Error(
    `the deck did not pass its structural check:\n${defects
      .map((problem) => `  ${slideLabel(problem.slide)}: ${problem.message}`)
      .join('\n')}`,
  );
}

/** What a defect is about, as a person would say it. */
const slideLabel = (/** @type {number} */ slide) => (slide === 0 ? 'the file' : `slide ${slide}`);

/**
 * Everything structurally wrong with a written deck, at once.
 *
 * @param {string} file       The .pptx as it was written.
 * @param {{assetsDir: string}} options  Where the fixed slide PNGs ship.
 * @returns {Promise<Defect[]>}
 */
async function checkStructure(file, { assetsDir }) {
  let opened;
  try {
    opened = await openDeck(file);
  } catch (error) {
    // The deck does not reopen. Nothing below can run, and this is the defect.
    return [
      defect(
        0,
        'unopenable',
        `does not reopen as a PowerPoint package: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    ];
  }

  const { zip, order } = opened;
  if (!order) {
    return [defect(0, 'unopenable', 'carries no ppt/presentation.xml, so it is not a deck')];
  }

  /** @type {Defect[]} */
  const defects = [];

  if (order.length !== SLIDE_COUNT) {
    defects.push(
      defect(0, 'slide-count', `has ${order.length} slides where the deck is exactly ${SLIDE_COUNT}`),
    );
  }

  defects.push(...(await checkSlidesComplete(zip, order)));
  defects.push(...(await checkFixedSlides(zip, order, assetsDir)));
  defects.push(...(await checkNotes(zip, order)));

  return defects;
}

/**
 * Open a written deck, and resolve the order a reader pages through it.
 *
 * Both readers here need the same three things first - the package, its
 * presentation part, and the slide order - so they ask for them once. What each
 * does about a deck that carries no presentation part differs, which is why the
 * order comes back undefined rather than this deciding: the checker reports that
 * as a critical defect, while a reader of notes simply has none to return.
 *
 * Throws where the file is not a package at all, which is the one failure the
 * caller has to tell apart from every other.
 *
 * @param {string} file
 * @returns {Promise<{zip: JSZip, order: string[] | undefined}>}
 */
async function openDeck(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));

  const presentation = zip.file('ppt/presentation.xml');
  if (!presentation) return { zip, order: undefined };

  return { zip, order: await slideOrder(zip, await presentation.async('string')) };
}

/**
 * The slide parts in the order the presentation pages through them.
 *
 * This is the presentation's own slide list, not the part names. Numbering parts
 * is the writer's business; the list is what PowerPoint pages through.
 *
 * @param {JSZip} zip
 * @param {string} presentationXml
 * @returns {Promise<string[]>}  Part names, in reading order.
 */
async function slideOrder(zip, presentationXml) {
  const rels = zip.file('ppt/_rels/presentation.xml.rels');
  if (!rels) return [];

  const byId = new Map(
    relationships(await rels.async('string'))
      .filter((rel) => rel.type.endsWith('/slide'))
      .map((rel) => [rel.id, path.posix.normalize(path.posix.join('ppt', rel.target))]),
  );

  // <p:sldId id="256" r:id="rId2"/>, in document order.
  const list = presentationXml.match(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/)?.[0] ?? '';

  /** @type {string[]} */
  const order = [];
  for (const match of list.matchAll(/<p:sldId[^>]*r:id="([^"]+)"/g)) {
    // A slide the list names but the package does not carry is not a slide a
    // reader will ever see, so it is absent here and the count says so.
    const part = byId.get(match[1]);
    if (part && zip.file(part)) order.push(part);
  }
  return order;
}

/**
 * Every slide the presentation lists came out whole.
 *
 * A part truncated on write still unzips, so the container opening says nothing
 * about the slide inside it. Checking that each one opens and closes its root
 * element catches that without shipping an XML parser to do it.
 *
 * @param {JSZip} zip
 * @param {string[]} order
 * @returns {Promise<Defect[]>}
 */
async function checkSlidesComplete(zip, order) {
  /** @type {Defect[]} */
  const defects = [];

  for (const [index, part] of order.entries()) {
    const entry = zip.file(part);
    if (!entry) continue;

    const xml = await entry.async('string');
    if (/<p:sld\b[\s\S]*<\/p:sld>\s*$/.test(xml)) continue;

    defects.push(
      defect(
        index + 1,
        'unopenable',
        'did not come out whole: its slide part has no complete <p:sld> element',
      ),
    );
  }

  return defects;
}

/**
 * Slides 4-9: present, and each carrying the reference PNG it is supposed to.
 *
 * Comparing the placed image against the shipped asset is what makes this an
 * order check rather than a count. Two reference slides swapped would leave
 * nine slides that all carry a picture, and only their bytes tell them apart.
 *
 * @param {JSZip} zip
 * @param {string[]} order
 * @param {string} assetsDir
 * @returns {Promise<Defect[]>}
 */
async function checkFixedSlides(zip, order, assetsDir) {
  /** @type {Defect[]} */
  const defects = [];
  const last = FIXED_SLIDE_NUMBERS[FIXED_SLIDE_NUMBERS.length - 1];

  for (const slideNumber of FIXED_SLIDE_NUMBERS) {
    const part = order[slideNumber - 1];
    if (!part) {
      defects.push(
        defect(
          slideNumber,
          'fixed-slide',
          `is missing: slides ${FIXED_SLIDE_NUMBERS[0]}-${last} are Recur's introduction and ship with the skill`,
        ),
      );
      continue;
    }

    const asset = path.join(assetsDir, `fixed-slide-${slideNumber}.png`);
    if (!fs.existsSync(asset)) {
      defects.push(
        defect(slideNumber, 'fixed-slide', `has no shipped asset to check against: ${asset}`),
      );
      continue;
    }

    const placed = await imageHashes(zip, part);
    if (placed.includes(sha256(fs.readFileSync(asset)))) continue;

    defects.push(
      defect(
        slideNumber,
        'fixed-slide',
        placed.length === 0
          ? 'carries no image, and it should be the supplied reference slide'
          : 'does not carry its supplied reference slide, so slides 4-9 are out of order',
      ),
    );
  }

  return defects;
}

/**
 * Slides 1-3 carry the run's source record, and a deck whose evidence did not
 * survive the write is one nobody can check.
 *
 * @param {JSZip} zip
 * @param {string[]} order
 * @returns {Promise<Defect[]>}
 */
async function checkNotes(zip, order) {
  /** @type {Defect[]} */
  const defects = [];

  for (const slideNumber of GENERATED_SLIDE_NUMBERS) {
    const part = order[slideNumber - 1];
    if (!part) {
      defects.push(defect(slideNumber, 'missing-slide', 'is missing, and the deck is built around it'));
      continue;
    }

    const notes = await notesText(zip, part);
    if (notes && notes.trim()) continue;

    defects.push(
      defect(
        slideNumber,
        'notes',
        'has no speaker notes, and slides 1-3 carry the source record behind what they claim',
      ),
    );
  }

  return defects;
}

/**
 * The relationship targets of one part, by relationship type.
 *
 * @param {JSZip} zip
 * @param {string} part
 * @param {string} type
 * @returns {Promise<string[]>}  Part names, resolved against the package root.
 */
async function relatedParts(zip, part, type) {
  const dir = path.posix.dirname(part);
  const rels = zip.file(`${dir}/_rels/${path.posix.basename(part)}.rels`);
  if (!rels) return [];

  return relationships(await rels.async('string'))
    .filter((rel) => rel.type.endsWith(`/${type}`))
    .map((rel) => path.posix.normalize(path.posix.join(dir, rel.target)));
}

/**
 * sha256 of every image placed on one slide.
 *
 * @param {JSZip} zip
 * @param {string} part
 * @returns {Promise<string[]>}
 */
async function imageHashes(zip, part) {
  const hashes = [];
  for (const target of await relatedParts(zip, part, 'image')) {
    const entry = zip.file(target);
    if (entry) hashes.push(sha256(await entry.async('nodebuffer')));
  }
  return hashes;
}

/**
 * The speaker-notes text of one slide, or null where it has no notes part.
 *
 * @param {JSZip} zip
 * @param {string} part
 * @returns {Promise<string | null>}
 */
async function notesText(zip, part) {
  const [target] = await relatedParts(zip, part, 'notesSlide');
  if (!target) return null;

  const entry = zip.file(target);
  if (!entry) return null;

  const xml = await entry.async('string');
  // The notes body repeats the slide number in its own placeholder. Counting
  // that as notes would make every empty notes field look filled.
  const body = xml.split('<p:ph type="sldNum"')[0];
  return [...body.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => match[1]).join('');
}

/**
 * The speaker notes of a built deck, by slide number.
 *
 * The notes are the run's source record: the sources behind each company fact,
 * the evidence behind each competitor, and how the company was identified. A
 * person judging a deck reads them against what the slides claim, which is what
 * ticket 09's spot-check is, and the judging harness reads them from here rather
 * than opening the package a second way of its own.
 *
 * Slides with no notes are absent rather than empty, so a caller can tell "this
 * slide carries nothing" from "this slide carries an empty string".
 *
 * @param {string} file
 * @returns {Promise<Record<number, string>>}
 */
async function readNotes(file) {
  const { zip, order } = await openDeck(file);
  if (!order) return {};

  /** @type {Record<number, string>} */
  const notes = {};
  for (const [index, part] of order.entries()) {
    const text = await notesText(zip, part);
    if (text && text.trim()) notes[index + 1] = text;
  }
  return notes;
}

/**
 * The relationships in a .rels part.
 *
 * Each element is read whole and its attributes pulled out one at a time,
 * because their order inside the tag is the writer's choice and not something
 * to match a pattern against.
 *
 * @param {string} xml
 * @returns {{id: string, type: string, target: string}[]}
 */
function relationships(xml) {
  return [...xml.matchAll(/<Relationship\b[^>]*\/?>/g)]
    .map((match) => ({
      id: match[0].match(/\bId="([^"]*)"/)?.[1] ?? '',
      type: match[0].match(/\bType="([^"]*)"/)?.[1] ?? '',
      target: match[0].match(/\bTarget="([^"]*)"/)?.[1] ?? '',
    }))
    .filter((rel) => rel.id && rel.type && rel.target);
}

module.exports = { SLIDE_COUNT, checkStructure, assertStructure, readNotes };
