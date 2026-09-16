// Decoding whatever a company's site serves as its logo, and encoding what
// PowerPoint can place.
//
// Logos arrive as SVG and WebP far more often than as PNG, and the deck
// generator can place neither. Conversion happens here, in WebAssembly carried
// inside the package, for the same reason the cover's photo work is pure
// JavaScript: the skill installs as one bundled script with no package installs
// at run time, so a native image library cannot be used, and the sandbox has no
// binding the bundle could call.
//
// Ticket 03 treated this as its known risk. It is settled by measurement rather
// than by trust: both rasterizers run offline here, against the real files the
// logo trial pulled off company sites.

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const { RASTERIZER_ASSETS } = require('./design.js');

// An SVG carries no pixels of its own, so it is rendered well above any slot the
// deck places a logo in. The resolution rule then never has cause to reject a
// vector mark, which is the right answer: it is sharp at every size. At 150px
// per placed inch this is sharp to 8in, against a widest slot of 2.831in.
const SVG_RENDER_WIDTH = 1200;

// A mark whose colour is left to the page's CSS has to be given one before it
// can be rendered alone. Near-black keeps a single-colour mark legible on a
// light slide, and the cover whitens it through its alpha channel anyway.
const CURRENT_COLOR = '#111111';

/** A logo in a format this package cannot turn into a placeable image. */
class UnsupportedLogoFormat extends Error {
  /** @param {string} format */
  constructor(format) {
    super(`cannot convert a ${format} logo to a placeable image`);
    this.name = 'UnsupportedLogoFormat';
    this.format = format;
  }
}

/**
 * What a downloaded file actually is, read from its first bytes rather than
 * from its URL: sites serve `.png` URLs that hold WebP, and content types lie.
 *
 * @param {Buffer} bytes
 * @returns {'png'|'jpeg'|'webp'|'gif'|'ico'|'svg'|'unknown'}
 */
function sniffFormat(bytes) {
  const b = Buffer.from(bytes);
  if (b.length < 12) return 'unknown';
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01) return 'ico';
  // An SVG may open with a comment or an XML declaration, so look past the head.
  if (/<svg[\s>]/i.test(b.subarray(0, 2000).toString('utf8'))) return 'svg';
  return 'unknown';
}

/** initWasm throws if it runs twice, so each rasterizer starts once per process. */
/** @type {Promise<any> | null} */
let svgReady = null;

/**
 * Render a vector mark to pixels.
 *
 * @param {Buffer} bytes
 * @param {string} assetsDir
 */
async function renderSvg(bytes, assetsDir) {
  const resvg = require('@resvg/resvg-wasm');
  if (!svgReady) {
    svgReady = resvg.initWasm(fs.readFileSync(path.join(assetsDir, RASTERIZER_ASSETS.svg)));
  }
  await svgReady;

  const rendered = new resvg.Resvg(usableSvg(bytes.toString('utf8')), {
    fitTo: { mode: 'width', value: SVG_RENDER_WIDTH },
    background: 'rgba(0,0,0,0)',
  }).render();

  return { png: Buffer.from(rendered.asPng()), width: rendered.width, height: rendered.height };
}

/**
 * A logo lifted out of a page is not a standalone document. It leans on the
 * page for its namespace and for the colour behind `currentColor`, and a
 * rasterizer given neither renders nothing at all.
 *
 * @param {string} svg
 */
function usableSvg(svg) {
  const coloured = svg.replace(/currentColor/g, CURRENT_COLOR);
  return /\sxmlns\s*=/i.test(coloured)
    ? coloured
    : coloured.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** @type {Promise<(data: ArrayBuffer) => Promise<any>> | null} */
let webpReady = null;

/**
 * Decode a WebP mark to raw pixels.
 *
 * The decoder is an ES module and the generator bundles as CommonJS, so it is
 * reached through a dynamic import rather than require.
 *
 * @param {Buffer} bytes
 * @param {string} assetsDir
 */
async function decodeWebp(bytes, assetsDir) {
  if (!webpReady) {
    webpReady = (async () => {
      const webp = await import('@jsquash/webp/decode.js');
      // WebAssembly is a runtime global this project's lib setting does not
      // declare, so it is reached the way the other host globals here are.
      const wasm = /** @type {any} */ (globalThis).WebAssembly;
      await webp.init(
        await wasm.compile(fs.readFileSync(path.join(assetsDir, RASTERIZER_ASSETS.webp))),
      );
      return webp.default;
    })();
  }

  const decode = await webpReady;
  // The decoder wants an ArrayBuffer holding exactly this image, and a Buffer is
  // usually a window onto a larger pooled one.
  const only = /** @type {ArrayBuffer} */ (
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  );
  const image = await decode(only);
  return { data: Buffer.from(image.data), width: image.width, height: image.height };
}

/**
 * Pixels to PNG bytes, which is the one raster format PptxGenJS places with an
 * alpha channel intact.
 *
 * @param {{data: Buffer, width: number, height: number}} raster
 */
function encodePng({ data, width, height }) {
  const png = new PNG({ width, height });
  data.copy(png.data);
  return PNG.sync.write(png);
}

/**
 * Pixels read back out of PNG bytes.
 *
 * @param {Buffer} png
 * @returns {{data: Buffer, width: number, height: number}}
 */
function decodePng(png) {
  const image = PNG.sync.read(png);
  return { data: image.data, width: image.width, height: image.height };
}

/**
 * Turn a downloaded logo into PNG bytes and its true pixel size.
 *
 * @param {Buffer} bytes
 * @param {string} format   As reported by sniffFormat.
 * @param {string} assetsDir
 * @returns {Promise<{png: Buffer, width: number, height: number}>}
 */
async function toPng(bytes, format, assetsDir) {
  if (format === 'svg') return renderSvg(bytes, assetsDir);
  if (format === 'png') {
    const { width, height } = decodePng(bytes);
    return { png: bytes, width, height };
  }
  if (format === 'webp') {
    const raster = await decodeWebp(bytes, assetsDir);
    return { png: encodePng(raster), width: raster.width, height: raster.height };
  }
  throw new UnsupportedLogoFormat(format);
}

module.exports = { sniffFormat, toPng, encodePng, decodePng, UnsupportedLogoFormat };
