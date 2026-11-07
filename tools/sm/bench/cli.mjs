// @ts-check
// Spawns the CLI the way the hook and an agent do, N times per command, and prints min / median / max wall time in ms.
// Not run by the test suite. `node tools/sm/bench/cli.mjs [--runs 20] [--root <dir>] [-- extra sm args…]`.
// Commands: Node start-up alone; `sm on` against the fix-panel fixture in a temp root; `sm check` over the repo and on its biggest file.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const bin = join(here, '..', 'bin.mjs');
const repoRoot = join(here, '..', '..', '..');
const argv = process.argv.slice(2);
const runs = Number(argv[argv.indexOf('--runs') + 1] || 20);
const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : repoRoot;

/** @param {string} label @param {string[]} args @param {string} cwd */
function bench(label, args, cwd) {
  const times = [];
  for (let i = 0; i < runs + 2; i++) {
    const t0 = performance.now();
    const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
    const ms = performance.now() - t0;
    if (i >= 2) times.push(ms); // two warm-up runs
    if (i === 2 && r.status !== 0 && r.status !== 1) console.error(`${label}: exit ${r.status}\n${r.stdout}${r.stderr}`);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  console.log(`${label.padEnd(44)} min ${times[0].toFixed(1).padStart(7)}  median ${median.toFixed(1).padStart(7)}  max ${times[times.length - 1].toFixed(1).padStart(7)}  (${runs} runs)`);
  return median;
}

const temp = mkdtempSync(join(tmpdir(), 'sm-bench-'));
mkdirSync(join(temp, '.state'));
writeFileSync(join(temp, '.state', 'config.json'), JSON.stringify({ schema: 1, include: ['*.js'], exclude: [] }));
copyFileSync(join(repoRoot, 'e2e', 'fixtures', 'sm', 'cli', 'fixpanel.js'), join(temp, 'fixpanel.js'));

try {
  console.log(`node ${process.version}, ${runs} runs each after 2 warm-ups, times in ms\n`);
  bench('node -e 0 (start-up floor)', ['-e', '0'], root);
  bench('sm on fix-panel holding escape (fixture root)', [bin, 'on', 'fix-panel', 'holding', 'escape', '--no-log'], temp);
  bench('sm check fixpanel.js (fixture root)', [bin, 'check', 'fixpanel.js', '--no-log'], temp);
  bench('sm list (repo root: scans include for @machine)', [bin, 'list', '--no-log'], root);
  /** @type {{ file: string, size: number } | null} */
  let biggest = null;
  const walk = (/** @type {string} */ dir, /** @type {string} */ rel) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name), r = rel ? `${rel}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) { if (name !== 'node_modules') walk(abs, r); }
      else if (/\.(ts|js)$/.test(name) && !/\.test\.|\.d\.ts$/.test(name) && (!biggest || st.size > biggest.size)) biggest = { file: r, size: st.size };
    }
  };
  for (const dir of ['src', 'overlay/src']) { try { walk(join(root, dir), dir); } catch { /* not in this root */ } }
  if (biggest) bench(`sm check ${biggest.file} (biggest file)`, [bin, 'check', biggest.file, '--no-log'], root);
  bench('sm check (whole repo, --no-cache)', [bin, 'check', '--no-cache', '--no-log'], root);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
