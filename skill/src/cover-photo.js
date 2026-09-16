// The cover ground: a downloaded city photo cropped to the slide and given the
// deck's navy duotone.
//
// The treatment comes from the user's reaction to the prototype - "take most of
// the colour out and apply a stronger, premium blue filter so the logos stand
// out and the city reads cleaner" - and its values live in design.js.
//
// The pixel work is done here in JavaScript on purpose. The skill ships as one
// bundled script with no package installs at run time, which rules out a native
// image library, and the sandbox has no ImageMagick binding the bundle could
// call. A pure-JavaScript JPEG codec bundles cleanly and runs anywhere the
// generator does, which is also why the landmark search asks Commons for JPEG.

const jpeg = require('jpeg-js');

const { SLIDE_W, SLIDE_H, COVER_PHOTO } = require('./design.js');

/**
 * Crop a photo to the cover's shape and give it the navy duotone.
 *
 * @param {Buffer} jpegBuffer  The downloaded photo.
 * @returns {Buffer}           A JPEG the deck can place full-bleed.
 */
function coverPhoto(jpegBuffer) {
  const source = jpeg.decode(jpegBuffer, { useTArray: true });
  const window = cropWindow(source.width, source.height, SLIDE_W / SLIDE_H, COVER_PHOTO.cropBias);

  const out = Buffer.alloc(window.width * window.height * 4);
  for (let y = 0; y < window.height; y += 1) {
    for (let x = 0; x < window.width; x += 1) {
      const from = ((y + window.top) * source.width + (x + window.left)) * 4;
      const to = (y * window.width + x) * 4;
      const [r, g, b] = duotonePixel(
        source.data[from],
        source.data[from + 1],
        source.data[from + 2],
      );
      out[to] = r;
      out[to + 1] = g;
      out[to + 2] = b;
      out[to + 3] = 255;
    }
  }

  return jpeg.encode({ data: out, width: window.width, height: window.height }, COVER_PHOTO.quality)
    .data;
}

/**
 * One pixel, desaturated onto the navy-to-pale ramp, given back a little of its
 * own colour, then pulled down so white type carries the slide.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
function duotonePixel(r, g, b) {
  const { shadow, highlight, colourKept, exposure } = COVER_PHOTO;
  // Rec. 709 luminance: how far up the duotone ramp this pixel sits.
  const t = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  /**
   * @param {number} dark
   * @param {number} light
   * @param {number} original
   */
  const channel = (dark, light, original) => {
    const duotone = dark + (light - dark) * t;
    return clampByte((duotone * (1 - colourKept) + original * colourKept) * exposure);
  };

  return [
    channel(shadow.r, highlight.r, r),
    channel(shadow.g, highlight.g, g),
    channel(shadow.b, highlight.b, b),
  ];
}

/**
 * The largest window of the wanted shape that fits, centred across and sitting
 * high in the frame, because a skyline wants more sky than foreground.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} aspect
 * @param {number} bias   0 keeps the top of the photo, 1 keeps the bottom.
 */
function cropWindow(width, height, aspect, bias) {
  let w = width;
  let h = Math.round(width / aspect);
  if (h > height) {
    h = height;
    w = Math.round(height * aspect);
  }
  return {
    left: Math.round((width - w) / 2),
    top: Math.round((height - h) * bias),
    width: w,
    height: h,
  };
}

/** @param {number} value */
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

module.exports = { coverPhoto };
