#!/usr/bin/env node
// Produces the uploadable workflow package: dist/recur-sell-deck.zip, holding one
// top-level recur-sell-deck/ skill folder.
//
// The ZIP must stand alone — no repository checkout, no local runtime, no external
// server — and claude.ai rejects skill uploads over 200 files, which is why the
// generation code ships as one esbuild bundle rather than a vendored node_modules.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const { SKILL_NAME, FIXED_SLIDE_NUMBERS, RASTERIZER_ASSETS } = require('../skill/src/design.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILL_SRC = path.join(REPO_ROOT, 'skill');
const REFERENCE_SLIDES = path.join(REPO_ROOT, 'Recur x US Fleet Tracking_vS');

/**
 * Every file the skill folder ships, as { from, to } pairs relative to the skill
 * root. The supplied reference slides stay in one place in the repo and are
 * copied in under the names the generator expects.
 */
function assetPlan() {
  return [
    { from: path.join(SKILL_SRC, 'SKILL.md'), to: 'SKILL.md' },
    {
      from: path.join(SKILL_SRC, 'reference', 'visual-rules.md'),
      to: 'reference/visual-rules.md',
    },
    {
      from: path.join(SKILL_SRC, 'assets', 'recur-wordmark-white.png'),
      to: 'assets/recur-wordmark-white.png',
    },
    {
      from: path.join(SKILL_SRC, 'assets', 'recur-wordmark-navy.png'),
      to: 'assets/recur-wordmark-navy.png',
    },
    // The logo rasterizers travel as assets rather than inside the bundle: a
    // WebAssembly module read from a file needs no base64 detour, and the file
    // cap the ZIP has to stay inside counts files, not bytes.
    {
      from: require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
      to: `assets/${RASTERIZER_ASSETS.svg}`,
    },
    {
      from: require.resolve('@jsquash/webp/codec/dec/webp_dec.wasm'),
      to: `assets/${RASTERIZER_ASSETS.webp}`,
    },
    ...FIXED_SLIDE_NUMBERS.map((n) => ({
      from: path.join(REFERENCE_SLIDES, `Slide${n}.png`),
      to: `assets/fixed-slide-${n}.png`,
    })),
  ];
}

/**
 * Stage the skill folder and zip it.
 *
 * @param {{outDir?: string}} [options]
 * @returns {Promise<{stageDir: string, zipPath: string, fileCount: number}>}
 */
async function buildPackage({ outDir = path.join(REPO_ROOT, 'dist') } = {}) {
  const stageDir = path.join(outDir, SKILL_NAME);
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  for (const { from, to } of assetPlan()) {
    if (!fs.existsSync(from)) throw new Error(`package source missing: ${from}`);
    const dest = path.join(stageDir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(from, dest);
  }

  await esbuild.build({
    // Three entry points, in the order a run reaches them: one finds and
    // normalises the logo for the model to check, one reports what the content
    // gate finds in the copy, and the third builds the deck once both have
    // been seen to.
    entryPoints: [
      path.join(SKILL_SRC, 'src', 'build-deck.js'),
      path.join(SKILL_SRC, 'src', 'fetch-logo.js'),
      path.join(SKILL_SRC, 'src', 'check-content.js'),
    ],
    outdir: path.join(stageDir, 'scripts'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    logLevel: 'warning',
  });

  const zipPath = path.join(outDir, `${SKILL_NAME}.zip`);
  fs.rmSync(zipPath, { force: true });
  execFileSync('zip', ['-qr', '-X', zipPath, SKILL_NAME, '-x', '*.DS_Store'], { cwd: outDir });

  return { stageDir, zipPath, fileCount: countFiles(stageDir) };
}

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const full = path.join(dir, entry.name);
    return total + (entry.isDirectory() ? countFiles(full) : 1);
  }, 0);
}

if (require.main === module) {
  buildPackage()
    .then(({ zipPath, fileCount }) => {
      const kb = Math.round(fs.statSync(zipPath).size / 1024);
      console.log(`${zipPath}\n${fileCount} files, ${kb} KB`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { buildPackage };
