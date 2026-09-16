// The uploadable ZIP: one top-level skill folder, inside claude.ai's 200-file
// cap, and a generation script that runs from the bundle alone — no package
// installs at run time, no repository checkout, no local runtime.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { ensureBuilt, tempDir, openPptx } = require('./helpers.js');
const { SKILL_NAME, FIXED_SLIDE_NUMBERS } = require('../skill/src/design.js');

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
    'reference/visual-rules.md',
    'assets/recur-wordmark-white.png',
    'assets/recur-wordmark-navy.png',
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

test('the unpacked skill builds a nine-slide deck with no node_modules in reach', async () => {
  const { zipPath } = await ensureBuilt();
  const room = tempDir('recur-install-');
  execFileSync('unzip', ['-q', zipPath, '-d', room]);

  const outDir = path.join(room, 'outputs');
  fs.mkdirSync(outDir);
  execFileSync(
    process.execPath,
    [
      path.join(room, SKILL_NAME, 'scripts', 'build-deck.js'),
      '--company',
      'US Fleet Tracking',
      '--out',
      outDir,
    ],
    { cwd: room, encoding: 'utf8', env: { PATH: process.env.PATH } },
  );

  const file = path.join(outDir, 'Recur x US Fleet Tracking.pptx');
  assert.ok(fs.existsSync(file), 'the run should write the deck');
  assert.equal((await openPptx(file)).slideCount, 9);
});
