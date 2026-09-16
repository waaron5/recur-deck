// Turning a downloaded photo into the cover ground.
//
// The user's reaction to the prototype set this treatment: "take most of the
// colour out and apply a stronger, premium blue filter so the logos stand out
// and the city reads cleaner."
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jpeg = require('jpeg-js');

const { coverPhoto } = require('../skill/src/cover-photo.js');
const { SLIDE_W, SLIDE_H } = require('../skill/src/design.js');

// A real Commons photo, downscaled to 512px to keep the repo light:
// "Downtown Oklahoma City skyline.jpg" by Urbanative, CC0.
//
// Synthetic bands alone cannot hold this treatment honest. The first version of
// these tests passed on colours no photograph contains while the same code left
// a real photo barely touched.
const REAL_PHOTO = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'oklahoma-city-skyline.jpg'),
);

/**
 * A colourful test photo: bands of unrelated hues, bright at the top and dark
 * at the bottom, so a treatment that fails to flatten colour or luminance shows
 * up.
 *
 * The bands are pulled back towards their own grey before use. Raw primaries
 * are not what a photograph looks like: a real Commons skyline measures 0.41
 * mean saturation, and these bands sit at 0.57, so the test stays a little
 * harder than the real thing instead of becoming a case that never arrives.
 *
 * @param {number} width
 * @param {number} height
 */
function vividPhoto(width, height) {
  const data = Buffer.alloc(width * height * 4);
  const bands = [
    [220, 30, 30],
    [30, 200, 60],
    [240, 170, 20],
    [150, 40, 190],
  ];
  const vividness = 0.5;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = bands[(x + y) % bands.length];
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      /** @param {number} channel */
      const muted = (channel) => channel * vividness + grey * (1 - vividness);
      // Bright at the top, dark at the bottom, like sky over a city.
      const fade = 1 - (y / height) * 0.6;
      const i = (y * width + x) * 4;
      data[i] = Math.round(muted(r) * fade);
      data[i + 1] = Math.round(muted(g) * fade);
      data[i + 2] = Math.round(muted(b) * fade);
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width, height }, 92).data;
}

/**
 * Size, mean channels, mean luminance, and how tightly the hues cluster.
 *
 * Hue concentration is the mean of every pixel's hue taken as a unit vector on
 * the colour wheel: 1 means every pixel shares one hue, 0 means the hues point
 * in all directions. It is what separates a duotone from a photo that has
 * merely been dimmed, and unlike saturation it does not confuse the tint the
 * treatment adds with the colour it was supposed to remove.
 *
 * @param {Buffer} buffer
 */
function measure(buffer) {
  const { data, width, height } = jpeg.decode(buffer, { useTArray: true });
  const pixels = width * height;
  let r = 0;
  let g = 0;
  let b = 0;
  let luma = 0;
  let hueX = 0;
  let hueY = 0;
  let hued = 0;

  for (let i = 0; i < pixels; i += 1) {
    const R = data[i * 4];
    const G = data[i * 4 + 1];
    const B = data[i * 4 + 2];
    r += R;
    g += G;
    b += B;
    luma += 0.2126 * R + 0.7152 * G + 0.0722 * B;

    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const chroma = max - min;
    if (chroma === 0) continue;
    let hue;
    if (max === R) hue = 60 * ((((G - B) / chroma) % 6) + 6);
    else if (max === G) hue = 60 * ((B - R) / chroma + 2);
    else hue = 60 * ((R - G) / chroma + 4);
    const radians = ((hue % 360) * Math.PI) / 180;
    hueX += Math.cos(radians);
    hueY += Math.sin(radians);
    hued += 1;
  }

  return {
    width,
    height,
    r: r / pixels,
    g: g / pixels,
    b: b / pixels,
    luma: luma / pixels,
    hueConcentration: hued ? Math.sqrt(hueX ** 2 + hueY ** 2) / hued : 1,
    meanHue: hued ? ((Math.atan2(hueY, hueX) * 180) / Math.PI + 360) % 360 : 0,
  };
}

test('the photo is cropped to the shape of the slide', async () => {
  // A 4:3 photo has to lose its top and bottom to fill a 10 x 5.625in cover.
  const treated = coverPhoto(vividPhoto(800, 600));

  const { width, height } = measure(treated);
  const wanted = SLIDE_W / SLIDE_H;
  assert.ok(
    Math.abs(width / height - wanted) < 0.02,
    `cropped to ${width}x${height} (${(width / height).toFixed(3)}), wanted ${wanted.toFixed(3)}`,
  );
});

test('unrelated colours collapse onto a single ramp', async () => {
  // This is what makes it a duotone rather than a dimmed photo. Measured on a
  // real Commons skyline the same treatment moves hue concentration from 0.42
  // to 0.99.
  const source = vividPhoto(800, 450);

  const before = measure(source);
  const after = measure(coverPhoto(source));

  assert.ok(
    before.hueConcentration < 0.6,
    `the test photo should start with its hues spread, was ${before.hueConcentration.toFixed(3)}`,
  );
  assert.ok(
    after.hueConcentration > 0.95,
    `hues are still spread after treatment: ${after.hueConcentration.toFixed(3)}`,
  );
});

test('the one ramp it collapses onto is navy', async () => {
  const after = measure(coverPhoto(vividPhoto(800, 450)));

  assert.ok(
    after.meanHue > 195 && after.meanHue < 245,
    `mean hue ${after.meanHue.toFixed(0)}deg is not in the blue range`,
  );
  assert.ok(
    after.b > after.r && after.b > after.g,
    `blue ${after.b.toFixed(1)} should lead red ${after.r.toFixed(1)} and green ${after.g.toFixed(1)}`,
  );
});

test('the ground is dark enough for white type to read over it', async () => {
  // The reference cover's own ground measures a mean luminance of about 77 of
  // 255. Anything much brighter and the white wordmarks stop standing out.
  const after = measure(coverPhoto(vividPhoto(800, 450)));

  assert.ok(
    after.luma > 20 && after.luma < 110,
    `mean luminance ${after.luma.toFixed(1)}, wanted the reference's neighbourhood of 77`,
  );
});

test('a real photograph lands where the reference cover sits', async () => {
  // The reference cover's own ground measures a mean luminance of about 77 of
  // 255 at a mean saturation of 0.19. This is the assertion that would have
  // caught the treatment being too bright, and the one the ticket's claims
  // about real photographs rest on.
  const before = measure(REAL_PHOTO);
  const after = measure(coverPhoto(REAL_PHOTO));

  assert.ok(
    before.hueConcentration < 0.7,
    `the source photo should have its hues spread, was ${before.hueConcentration.toFixed(3)}`,
  );
  assert.ok(
    after.hueConcentration > 0.95,
    `a real photo should collapse onto one ramp, got ${after.hueConcentration.toFixed(3)}`,
  );
  assert.ok(
    Math.abs(after.luma - 77) < 15,
    `mean luminance ${after.luma.toFixed(1)}, reference ground is about 77`,
  );
});

test('a photo already the right shape keeps its full width', async () => {
  const treated = coverPhoto(vividPhoto(1920, 1080));

  assert.equal(measure(treated).width, 1920);
});
