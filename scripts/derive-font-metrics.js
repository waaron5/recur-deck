#!/usr/bin/env node
// Derives the advance-width table the content gate measures text with, and
// writes it to skill/src/font-advances.js.
//
//   node scripts/derive-font-metrics.js
//
// Why Arial. Ticket 01 read "Noto Sans Arabic Light" off the original
// presentation, and design.js declared it until ticket 07. That face carries no
// Latin glyphs at all - no A-Z, no a-z, in any weight - so it cannot draw this
// deck's English copy and cannot be measured for it. Something else always drew
// that copy, in the sandbox renderer and in PowerPoint alike.
//
// Which face was settled by measurement, not assumption. Four strings on the
// reference PNGs, at four sizes and both weights, against Arial's real
// advances:
//
//   cover name "USFleetTracking"   design.js 27.4pt   Arial implies 27.30pt
//   thesis title                   design.js 20pt     Arial implies 19.56pt
//   thesis bullet                  design.js 11.5pt   Arial implies 11.35pt
//   bold section label             design.js 15pt     Arial implies 15.10pt
//
// Every sample reads slightly under prediction, which is the expected bias:
// measured ink stops at the last glyph's ink, while an advance includes its
// right side bearing. One cause, one direction, all four samples. The match
// also discriminates - Verdana lands 9% wide, Tahoma 4% narrow, Arial Narrow
// 18% narrow - so this is the reference deck's own Latin metric.
//
// Arial is additionally metric-compatible with Liberation Sans, which is what
// the sandbox renderer substitutes, so an estimate taken from these numbers
// predicts the line breaks ticket 07's render check will show. That is why
// ticket 07 made design.js declare Arial: the deck is now set in the face this
// script measures, so the gate, the render and PowerPoint all break lines in
// the same places.
//
// The table is generated rather than hand-copied, and records the source file
// and its digest, so the numbers can always be traced back and regenerated.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(REPO_ROOT, 'skill', 'src', 'font-advances.js');

// The two faces the deck sets type in. macOS ships both; a machine without them
// is told which file it is missing rather than left with a silent default.
const FACES = {
  regular: '/System/Library/Fonts/Supplemental/Arial.ttf',
  bold: '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
};

// The copy this deck carries is English. Printable ASCII covers it, and the few
// characters beyond it that a model tends to type are listed so their width is
// measured rather than guessed. The dashes especially: Recur's own slides use
// them, and the gate lets them through.
const EXTRA = ['‘', '’', '“', '”', '–', '—', '…'];

/**
 * The font's table directory: tag -> where that table starts.
 *
 * @param {Buffer} buf
 * @returns {Record<string, number>}
 */
function tableOffsets(buf) {
  const count = buf.readUInt16BE(4);
  /** @type {Record<string, number>} */
  const offsets = {};
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    offsets[buf.toString('ascii', at, at + 4)] = buf.readUInt32BE(at + 8);
  }
  return offsets;
}

/**
 * Character code to glyph id, from a format 4 cmap subtable. Format 4 is the
 * one every Windows-compatible font carries for the Basic Multilingual Plane.
 *
 * @param {Buffer} buf
 * @param {number} base
 * @returns {(code: number) => number}
 */
function characterMap(buf, base) {
  const segCount = buf.readUInt16BE(base + 6) / 2;
  const endAt = base + 14;
  const startAt = endAt + segCount * 2 + 2;
  const deltaAt = startAt + segCount * 2;
  const rangeAt = deltaAt + segCount * 2;

  return (code) => {
    for (let s = 0; s < segCount; s += 1) {
      if (code > buf.readUInt16BE(endAt + s * 2)) continue;
      const start = buf.readUInt16BE(startAt + s * 2);
      if (code < start) return 0;

      const delta = buf.readInt16BE(deltaAt + s * 2);
      const rangeOffset = buf.readUInt16BE(rangeAt + s * 2);
      if (rangeOffset === 0) return (code + delta) & 0xffff;

      // The glyph id array is addressed relative to the offset's own slot,
      // which is why this is measured from rangeAt rather than from the table.
      const glyph = buf.readUInt16BE(rangeAt + s * 2 + rangeOffset + (code - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/**
 * The best format 4 subtable in the font's cmap: the Windows Unicode one where
 * there is one, since that is the table PowerPoint itself reads.
 *
 * @param {Buffer} buf
 * @param {number} cmapAt
 */
function bestSubtable(buf, cmapAt) {
  const count = buf.readUInt16BE(cmapAt + 2);
  const subtables = [];
  for (let i = 0; i < count; i += 1) {
    const at = cmapAt + 4 + i * 8;
    subtables.push({
      platform: buf.readUInt16BE(at),
      encoding: buf.readUInt16BE(at + 2),
      offset: cmapAt + buf.readUInt32BE(at + 4),
    });
  }

  const format4 = subtables.filter((t) => buf.readUInt16BE(t.offset) === 4);
  const chosen =
    format4.find((t) => t.platform === 3 && t.encoding === 1) ??
    format4.find((t) => t.platform === 0) ??
    format4[0];
  if (!chosen) throw new Error('the font carries no format 4 cmap subtable');
  return chosen;
}

/**
 * One face, measured: every character's advance as a fraction of the em.
 *
 * @param {string} file
 */
function measureFace(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`cannot measure metrics: ${file} is not on this machine`);
  }

  const buf = fs.readFileSync(file);
  const at = tableOffsets(buf);
  for (const table of ['head', 'hhea', 'hmtx', 'cmap', 'OS/2']) {
    if (at[table] === undefined) throw new Error(`${file} has no ${table} table`);
  }

  const unitsPerEm = buf.readUInt16BE(at.head + 18);
  const hMetrics = buf.readUInt16BE(at.hhea + 34);
  const glyphOf = characterMap(buf, bestSubtable(buf, at.cmap).offset);

  // Past the last full metric the font repeats the final advance, which is how
  // monospaced tails are stored. Clamping is that rule, not a guess.
  const advanceOf = (/** @type {number} */ glyph) =>
    buf.readUInt16BE(at.hmtx + Math.min(glyph, hMetrics - 1) * 4) / unitsPerEm;

  /** @type {Record<string, number>} */
  const advances = {};
  const missing = [];
  const characters = [
    ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
    ...EXTRA,
  ];
  for (const character of characters) {
    const glyph = glyphOf(character.codePointAt(0) ?? 0);
    if (glyph === 0) {
      missing.push(character);
      continue;
    }
    advances[character] = round(advanceOf(glyph));
  }

  return {
    file,
    digest: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16),
    unitsPerEm,
    capHeightEm: round(buf.readInt16BE(at['OS/2'] + 88) / unitsPerEm),
    // What an unmapped character costs. Every face here maps all of printable
    // ASCII, so this is only reached by a character the copy should not carry.
    notdefEm: round(advanceOf(0)),
    advances,
    missing,
  };
}

/** Four decimals of an em is 0.0003in at 20pt: far finer than a line break. */
const round = (/** @type {number} */ value) => Number(value.toFixed(4));

/** @param {Record<string, number>} advances */
function renderAdvances(advances) {
  return Object.entries(advances)
    .map(([character, width]) => `    ${JSON.stringify(character)}: ${width},`)
    .join('\n');
}

function main() {
  const faces = Object.fromEntries(
    Object.entries(FACES).map(([weight, file]) => [weight, measureFace(file)]),
  );

  for (const [weight, face] of Object.entries(faces)) {
    if (face.missing.length > 0) {
      throw new Error(
        `${weight} is missing ${face.missing.length} characters the deck can set: ` +
          face.missing.join(''),
      );
    }
  }

  const provenance = Object.entries(faces)
    .map(
      ([weight, face]) =>
        `// ${weight.padEnd(7)} ${path.basename(face.file)}  sha256:${face.digest}  ` +
        `${face.unitsPerEm} units/em  cap ${face.capHeightEm} em`,
    )
    .join('\n');

  const source = `// GENERATED by scripts/derive-font-metrics.js - do not edit by hand.
//
// Advance widths as a fraction of the em, for the Latin copy slides 1-3 carry.
// Measured from the font files themselves rather than estimated:
//
${provenance}
//
// These are the faces design.js declares, so what the gate measures and what
// the deck is set in cannot drift apart. Why the original presentation's own
// font name is not one of them is recorded in the deriving script.

/** @type {Record<'regular' | 'bold', Record<string, number>>} */
const ADVANCES = {
${Object.entries(faces)
  .map(([weight, face]) => `  ${weight}: {\n${renderAdvances(face.advances)}\n  },`)
  .join('\n')}
};

/** What an unmapped character costs, per weight. */
const NOTDEF = {
${Object.entries(faces)
  .map(([weight, face]) => `  ${weight}: ${face.notdefEm},`)
  .join('\n')}
};

module.exports = { ADVANCES, NOTDEF };
`;

  fs.writeFileSync(OUT_FILE, source);
  const count = Object.keys(faces.regular.advances).length;
  console.log(`${path.relative(REPO_ROOT, OUT_FILE)}: ${count} characters per weight`);
  for (const [weight, face] of Object.entries(faces)) {
    console.log(`  ${weight}: ${path.basename(face.file)} (${face.unitsPerEm} units/em)`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
