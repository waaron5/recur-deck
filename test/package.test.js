// The uploadable ZIP: one top-level skill folder, inside claude.ai's 200-file
// cap, and a generation script that runs from the bundle alone — no package
// installs at run time, no repository checkout, no local runtime.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  ensureBuilt,
  tempDir,
  openPptx,
  testPhoto,
  TEST_HEADQUARTERS,
  TEST_CREDIT,
} = require('./helpers.js');
const {
  SKILL_NAME,
  FIXED_SLIDE_NUMBERS,
  RASTERIZER_ASSETS,
} = require('../skill/src/design.js');

/** Every file in the ZIP, as posix paths relative to the archive root. */
async function zipEntries(zipPath) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
  return Object.entries(zip.files)
    .filter(([, entry]) => !entry.dir)
    .map(([name]) => name);
}

test('the ZIP holds one top-level skill folder', async () => {
  const { zipPath } = await ensureBuilt();
  const roots = new Set((await zipEntries(zipPath)).map((n) => n.split('/')[0]));
  assert.deepEqual([...roots], [SKILL_NAME]);
});

test('the ZIP stays inside the 200-file upload cap', async () => {
  const { zipPath } = await ensureBuilt();
  const entries = await zipEntries(zipPath);
  assert.ok(entries.length <= 200, `${entries.length} files exceeds the cap`);
});

test('the skill folder carries its instructions, script, reference and assets', async () => {
  const { zipPath } = await ensureBuilt();
  const entries = new Set(await zipEntries(zipPath));
  const expected = [
    'SKILL.md',
    'scripts/build-deck.js',
    'scripts/fetch-logo.js',
    'reference/visual-rules.md',
    'assets/recur-wordmark-white.png',
    'assets/recur-wordmark-navy.png',
    // The logo rasterizers. Without these a run can place no SVG or WebP logo,
    // which is most of them.
    `assets/${RASTERIZER_ASSETS.svg}`,
    `assets/${RASTERIZER_ASSETS.webp}`,
    ...FIXED_SLIDE_NUMBERS.map((n) => `assets/fixed-slide-${n}.png`),
  ];
  for (const file of expected) {
    assert.ok(entries.has(`${SKILL_NAME}/${file}`), `missing ${file}`);
  }
});

test('generation ships bundled, with nothing left to resolve at run time', async () => {
  const { stageDir } = await ensureBuilt();
  const script = fs.readFileSync(path.join(stageDir, 'scripts', 'build-deck.js'), 'utf8');
  const bareRequires = [...script.matchAll(/require\(["']([^."'][^"']*)["']\)/g)]
    .map((m) => m[1])
    .filter((id) => !id.startsWith('node:'));
  assert.deepEqual(
    [...new Set(bareRequires)].filter((id) => !require('node:module').builtinModules.includes(id)),
    [],
    'the bundle must not require anything from node_modules',
  );
});

test('the sources stay text, so diffs and review keep working', async () => {
  // A stray NUL byte makes git treat a source file as binary: it stops showing
  // line diffs and review tooling stops being able to read it, while the code
  // still runs. Catch it here rather than at the next person to open a diff.
  const roots = ['skill/src', 'skill/reference', 'scripts', 'test'];
  const files = roots.flatMap((dir) => {
    const full = path.join(__dirname, '..', dir);
    return fs.readdirSync(full).map((name) => path.join(full, name));
  });
  files.push(path.join(__dirname, '..', 'skill', 'SKILL.md'));

  for (const file of files.filter((f) => /\.(js|md)$/.test(f))) {
    assert.ok(
      !fs.readFileSync(file).includes(0x00),
      `${path.relative(path.join(__dirname, '..'), file)} contains a NUL byte`,
    );
  }
});

test('the unpacked skill converts SVG and WebP logos with nothing installed', async () => {
  // Format conversion was this pipeline's known risk: logos arrive as SVG and
  // WebP, PptxGenJS can place neither, and the sandbox has no image library the
  // bundle could call. This runs the shipped bundle the way the sandbox does,
  // with no node_modules anywhere near it, and reads the result back out of the
  // .pptx rather than trusting the generator's own report.
  const { zipPath } = await ensureBuilt();
  const room = tempDir('recur-logo-');
  execFileSync('unzip', ['-q', zipPath, '-d', room]);

  const outDir = path.join(room, 'outputs');
  fs.mkdirSync(outDir);
  const photoFile = path.join(room, 'landmark.jpg');
  fs.writeFileSync(photoFile, testPhoto());

  const logos = {
    webp: fs.readFileSync(path.join(__dirname, 'fixtures', 'usft-logo-white.webp')),
    svg: Buffer.from(
      '<svg viewBox="0 0 200 40"><rect width="40" height="40" fill="currentColor"/>' +
        '<text x="50" y="30" font-size="26" fill="currentColor">Acme</text></svg>',
    ),
  };

  for (const [format, bytes] of Object.entries(logos)) {
    const logoFile = path.join(room, `logo.${format}`);
    fs.writeFileSync(logoFile, bytes);

    const runFile = path.join(room, `run-${format}.json`);
    fs.writeFileSync(
      runFile,
      JSON.stringify({
        company: `Acme ${format}`,
        headquarters: TEST_HEADQUARTERS,
        identification: 'Matched the prompt to acme.example.',
        landmark: { file: photoFile, credit: TEST_CREDIT },
        logo: { file: logoFile, source: 'https://acme.example/', verified: true },
      }),
    );

    execFileSync(
      process.execPath,
      [path.join(room, SKILL_NAME, 'scripts', 'build-deck.js'), '--input', runFile, '--out', outDir],
      { cwd: room, encoding: 'utf8', env: { PATH: process.env.PATH } },
    );

    const file = path.join(outDir, `Recur x Acme ${format}.pptx`);
    assert.ok(fs.existsSync(file), `a ${format} logo should still produce a deck`);
    const notes = String(await (await openPptx(file)).notesText(1));
    assert.match(
      notes,
      new RegExp(`from ${format}`),
      `slide 1 should record that the logo came from ${format}`,
    );
  }
});

test('a logo that cannot be converted still delivers a deck, with the reason recorded', async () => {
  // Every path through the logo pipeline ends in something placeable. A format
  // the package cannot convert is a text wordmark, which is a designed outcome;
  // delivering no file at all would be a critical defect instead.
  const { zipPath } = await ensureBuilt();
  const room = tempDir('recur-badlogo-');
  execFileSync('unzip', ['-q', zipPath, '-d', room]);

  const outDir = path.join(room, 'outputs');
  fs.mkdirSync(outDir);
  const photoFile = path.join(room, 'landmark.jpg');
  fs.writeFileSync(photoFile, testPhoto());

  // An animated GIF, which turns up where a logo was expected and cannot be
  // turned into anything the deck can place.
  const logoFile = path.join(room, 'logo.gif');
  fs.writeFileSync(
    logoFile,
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x21, 0xf9]),
  );

  const runFile = path.join(room, 'run.json');
  fs.writeFileSync(
    runFile,
    JSON.stringify({
      company: 'Acme',
      headquarters: TEST_HEADQUARTERS,
      identification: 'Matched the prompt to acme.example.',
      landmark: { file: photoFile, credit: TEST_CREDIT },
      logo: { file: logoFile, source: 'https://acme.example/logo.gif', verified: true },
    }),
  );

  execFileSync(
    process.execPath,
    [path.join(room, SKILL_NAME, 'scripts', 'build-deck.js'), '--input', runFile, '--out', outDir],
    { cwd: room, encoding: 'utf8', env: { PATH: process.env.PATH } },
  );

  const file = path.join(outDir, 'Recur x Acme.pptx');
  assert.ok(fs.existsSync(file), 'an unconvertible logo must not cost the run its deck');

  const pptx = await openPptx(file);
  assert.equal(pptx.slideCount, 9);
  const onSlide = (await pptx.textBoxes(1)).map((box) => box.text).join(' ');
  assert.ok(onSlide.includes('Acme'), 'the cover should fall back to the text wordmark');
  assert.match(
    String(await pptx.notesText(1)),
    /gif/i,
    'and slide 1 should record why the logo was not used',
  );
});

test('the unpacked skill builds a nine-slide deck with no node_modules in reach', async () => {
  const { zipPath } = await ensureBuilt();
  const room = tempDir('recur-install-');
  execFileSync('unzip', ['-q', zipPath, '-d', room]);

  const outDir = path.join(room, 'outputs');
  fs.mkdirSync(outDir);

  // The run carries its own landmark, so the check stays offline and proves the
  // bundle, rather than Wikimedia, is what is being tested here.
  const photoFile = path.join(room, 'landmark.jpg');
  fs.writeFileSync(photoFile, testPhoto());
  const runFile = path.join(room, 'run.json');
  fs.writeFileSync(
    runFile,
    JSON.stringify({
      company: 'US Fleet Tracking',
      headquarters: TEST_HEADQUARTERS,
      identification: 'Matched the prompt to usfleettracking.com.',
      landmark: { file: photoFile, credit: TEST_CREDIT },
    }),
  );

  execFileSync(
    process.execPath,
    [path.join(room, SKILL_NAME, 'scripts', 'build-deck.js'), '--input', runFile, '--out', outDir],
    { cwd: room, encoding: 'utf8', env: { PATH: process.env.PATH } },
  );

  const file = path.join(outDir, 'Recur x US Fleet Tracking.pptx');
  assert.ok(fs.existsSync(file), 'the run should write the deck');
  assert.equal((await openPptx(file)).slideCount, 9);
});
