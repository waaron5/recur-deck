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
const { SLIDE_W, SLIDE_H, COVER } = require('../skill/src/design.js');

// A real Commons photo, downscaled to 512px to keep the repo light:
// "Downtown Oklahoma City skyline.jpg" by Urbanative, CC0.
//
// Synthetic bands alone cannot hold this treatment honest. The first version of
// these tests passed on colours no photograph contains while the same code left
// a real photo barely touched.
const REAL_PHOTO = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'oklahoma-city-skyline.jpg'),
);

// A bright photograph, the case a skyline hides: "Casa Adobe de San Rafael
// (Glendale, California).jpg" by Alexis Doine, CC0, which a ServiceTitan
// practice run put on its cover. Unlike the skyline it ships at full
// resolution, cut to the 16:9 window the cover keeps: downscaling averages away
// the bright detail the contrast floor is about, and at 512px wide it measured
// 4.69:1 under the old treatment against 3.35:1 on the real cover.
const BRIGHT_PHOTO = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'glendale-casa-adobe.jpg'),
);

// White type over the reference cover's own ground, with the type masked out:
// the band the wordmarks sit in measures 101 of 255 at its 90th percentile,
// which is 5.83:1. Measured in the September 18, 2026 amendment to decision 06.
const REFERENCE_CONTRAST = 5.83;

/**
 * The contrast of white type against the brighter end of the band the two
 * marks sit in.
 *
 * The band runs from the reference's wordmark ink (x 2.823in) to the end of the
 * company's slot, over the divider's height. The 90th percentile rather than
 * the mean, because a mark is lost where the ground is brightest, not where it
 * is typical.
 *
 * @param {Buffer} buffer  A treated cover.
 */
function bandContrast(buffer) {
  const { data, width, height } = jpeg.decode(buffer, { useTArray: true });
  const across = (inches) => Math.round((inches / SLIDE_W) * width);
  const down = (inches) => Math.round((inches / SLIDE_H) * height);
  const x0 = across(2.823);
  const x1 = across(COVER.name.left + COVER.name.width);
  const y0 = down(COVER.divider.y);
  const y1 = down(COVER.divider.y + COVER.divider.h);

  const lumas = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      lumas.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    }
  }
  lumas.sort((a, b) => a - b);
  const p90 = lumas[Math.floor(lumas.length * 0.9)];

  // WCAG relative luminance, taking the band's grey as all three channels.
  const c = p90 / 255;
  const linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 1.05 / (linear + 0.05);
}

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
  // A coarse bound on a synthetic photo. The floor that matters is measured
  // where the marks sit, on real photographs, further down.
  const after = measure(coverPhoto(vividPhoto(800, 450)));

  assert.ok(
    after.luma > 20 && after.luma < 110,
    `mean luminance ${after.luma.toFixed(1)}, wanted a dark ground`,
  );
});

test('a real skyline sits deeper than the reference cover', async () => {
  // The accepted cost of one fixed treatment that holds the contrast floor on a
  // bright photograph: a typical skyline lands at a whole-slide mean of about
  // 57, against the reference ground's 77.8.
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
    Math.abs(after.luma - 57) < 8,
    `mean luminance ${after.luma.toFixed(1)}, wanted about 57`,
  );
});

test('white type over the marks clears the reference contrast, bright photo and skyline alike', async () => {
  // A skyline alone cannot hold this: under the first treatment the Oklahoma
  // City skyline nearly matched the reference while a bright subject fell to
  // 3.35:1, and the wordmarks stopped reading.
  /** @type {[string, Buffer][]} */
  const photos = [
    ['bright photograph', BRIGHT_PHOTO],
    ['skyline', REAL_PHOTO],
  ];
  for (const [name, photo] of photos) {
    const contrast = bandContrast(coverPhoto(photo));
    assert.ok(
      contrast >= REFERENCE_CONTRAST,
      `${name}: white type sits at ${contrast.toFixed(2)}:1 over the marks' band, ` +
        `the reference cover's own is ${REFERENCE_CONTRAST}:1`,
    );
  }
});

test('a photo already the right shape keeps its full width', async () => {
  const treated = coverPhoto(vividPhoto(1920, 1080));

  assert.equal(measure(treated).width, 1920);
});
