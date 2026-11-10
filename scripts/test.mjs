// The test runner (docs/briefs/test-system.md, layer 1).
//
//   node scripts/test.mjs                 every file
//   node scripts/test.mjs cli             one tier: cli | browser | host | alone
//   node scripts/test.mjs verdict census  files whose name contains a word
//   node scripts/test.mjs --cores 6       cores to fill (default: every core that is not already busy)
//   node scripts/test.mjs --memory 8      GB to fill (default: what is free, less 2 GB)
//   node scripts/test.mjs --timeout 10    minutes before a file is killed (default 6)
//   node scripts/test.mjs --serial        one file at a time, as before
//   node scripts/test.mjs --list          print each file's tier and stop
//
// Each file has a cost tier, read from its own source: the cores and the memory a file of that tier was measured
// to use. Files run side by side while both budgets hold; `alone` files run after the rest, one at a time. A file's
// whole process tree is killed when it ends or times out, so no browser or dev server outlives its test.
import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { availableParallelism, freemem, loadavg, platform, totalmem } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const logs = join(root, '.test-logs');
// What one file of a tier uses while it runs, measured on vm-agent (8 cores, 2026-11-10) from each file's process
// tree and the machine's load: a CLI file spawns the CLI over and over, so it is light on memory and heavy on cores;
// a browser file holds its dev servers in one Node process, and Chromium beside it.
const COST = {
  cli: { cores: 1.7, mb: 250 },
  browser: { cores: 1.2, mb: 1300 },
  host: { cores: 1.5, mb: 1200 },
};
const RESERVE_MB = 2000; // left for the machine and whatever else lives on it

// Files that cannot share the machine, and why.
const ALONE = {
  'e2e/session-burst.test.mjs': 'gates on latency',
  'e2e/bare-page.test.mjs': 'holds port 7331',
  'e2e/packaging.test.mjs': 'rebuilds dist and packs the package',
  'e2e/next-install.test.mjs': 'packs the package',
  'e2e/rename.test.mjs': 'packs the package',
  'e2e/setup.test.mjs': 'packs the package',
};
// The passes the old runner made after the main one, kept as they were. (The old runner stopped at the first pass
// that failed, so on a red suite these never ran.)
const EXTRA = [
  { file: 'e2e/serve.test.mjs', label: 'serve (polling)', env: { PLUMBER_WATCH: '1', PLUMBER_POLLING: '1' } },
  { file: 'e2e/serve.test.mjs', label: 'serve (no watch)', env: { PLUMBER_WATCH: '0', PLUMBER_POLLING: '0' } },
];
const FLAGS = { 'e2e/session-burst.test.mjs': ['--max-semi-space-size=8'] };

async function tierOf(file) {
  const source = await readFile(join(root, file), 'utf8');
  const said = source.match(/^\/\/ @tier (cli|browser|host|alone)\b/m)?.[1];
  if (said) return said;
  if (ALONE[file]) return 'alone';
  if (/next\/dist\/bin|turbopack|['"]npm['"]|next dev/i.test(source)) return 'host';
  if (/from 'playwright'/.test(source)) return 'browser';
  return 'cli';
}

const args = process.argv.slice(2);
// a flag with a number (`--cores 6`), or the same from the environment (`PLUMB_TEST_CORES=6`)
function numberOf(name, env) {
  const at = args.indexOf(name);
  const value = at >= 0 ? Number(args.splice(at, 2)[1]) : Number(process.env[env]);
  return value > 0 ? value : 0;
}
const askedCores = numberOf('--cores', 'PLUMB_TEST_CORES'), askedGb = numberOf('--memory', 'PLUMB_TEST_MEMORY_GB');
// A file that runs this long is killed and counted as failed. The slowest file on vm-agent takes 72 s; one hung
// file at the old 20 minutes held a whole run open for that long.
const TIMEOUT_MIN = numberOf('--timeout', 'PLUMB_TEST_TIMEOUT_MIN') || 6;
const TIMEOUT = TIMEOUT_MIN * 60 * 1000;
const flag = (name) => args.includes(name);
const words = args.filter((a) => !a.startsWith('--'));
const tiers = words.filter((w) => w in COST || w === 'alone');
const names = words.filter((w) => !tiers.includes(w));

const every = (await readdir(join(root, 'e2e'))).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => `e2e/${f}`);
let jobs = await Promise.all(every.map(async (file) => ({ file, label: file, tier: await tierOf(file), env: { PLUMBER_WATCH: '1', PLUMBER_POLLING: '0' } })));
const whole = !tiers.length && !names.length;
if (tiers.length) jobs = jobs.filter((j) => tiers.includes(j.tier));
if (names.length) jobs = jobs.filter((j) => names.some((n) => j.file.includes(n)));
if (whole) jobs.push(...EXTRA.map((e) => ({ ...e, tier: 'alone' })));

if (flag('--list')) {
  for (const j of jobs) console.log(`${j.tier.padEnd(8)}${j.label}`);
  const count = (t) => jobs.filter((j) => j.tier === t).length;
  console.log(`\n${jobs.length} runs: ${count('cli')} cli, ${count('browser')} browser, ${count('host')} host, ${count('alone')} alone`);
  process.exit(0);
}
if (!jobs.length) { console.error('No test file matches.'); process.exit(1); }

// The budgets, from what the machine has free right now, because it is shared: other projects run on vm-agent and
// other sessions on the laptop. Cores: every core not already busy (the one-minute load), never fewer than two.
// Memory: what is free, less the reserve. Linux reports what is really available; macOS reports only untouched
// pages, so half the machine stands in for it there.
// On a CI runner nothing else is running: the load there is this job's own install and build, a moment ago. One core
// is still left free. On GitHub's four cores, three browser files at once made the tests that act while a page
// reloads fail twice as often (10 failures against 5 with one file at a time); two at once is the middle.
const busy = process.env.CI ? 1 : Math.round(loadavg()[0]);
const freeMb = (platform() === 'linux' ? freemem() : totalmem() / 2) / 1e6;
const budget = flag('--serial') ? { cores: 0, mb: 0 }
  : { cores: askedCores || Math.max(2, availableParallelism() - busy), mb: askedGb ? askedGb * 1000 : Math.max(COST.browser.mb, freeMb - RESERVE_MB) };
if (!flag('--serial') && !askedCores && busy >= 2) console.log(`The machine is already busy (load ${busy}): using ${budget.cores} of ${availableParallelism()} cores.`);

await rm(logs, { recursive: true, force: true });
await mkdir(logs, { recursive: true });

// Every process a file starts, however deep. Playwright starts Chromium in a process group of its own, so killing
// the file's group is not enough: the tree is read every two seconds while files run, and whatever a file's tree
// ever held is killed when the file ends.
const trees = new Map(); // the file's pid → every pid seen under it
function readTrees() {
  if (!trees.size) return;
  const ps = spawn('ps', ['-eo', 'pid=,ppid='], { stdio: ['ignore', 'pipe', 'ignore'] });
  let text = '';
  ps.stdout.on('data', (chunk) => { text += chunk; });
  ps.once('close', () => {
    const parent = new Map(text.trim().split('\n').map((line) => line.trim().split(/\s+/).map(Number)));
    // a pid that has gone is forgotten at once, so a number the system hands out again is never killed
    for (const seen of trees.values()) for (const pid of seen) if (!parent.has(pid)) seen.delete(pid);
    for (const [pid, up] of parent) {
      for (const [top, seen] of trees) if (up === top || seen.has(up)) seen.add(pid);
    }
  });
}
setInterval(readTrees, 2000).unref();

function run(job) {
  return new Promise((resolve) => {
    const began = Date.now();
    const name = job.label.replace(/[^a-z0-9.-]+/gi, '_');
    const out = createWriteStream(join(logs, `${name}.log`));
    let text = '';
    const child = spawn(process.execPath, [...(FLAGS[job.file] ?? []), '--test', '--test-concurrency=1', '--test-reporter=tap', job.file], {
      cwd: root, env: { ...process.env, ...job.env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
    });
    const seen = new Set();
    trees.set(child.pid, seen);
    const sweep = () => {
      trees.delete(child.pid);
      for (const pid of [-child.pid, ...seen]) { try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ } }
    };
    const timer = setTimeout(() => { job.timedOut = true; sweep(); }, TIMEOUT);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { text += chunk; out.write(chunk); });
    child.once('close', (code) => {
      clearTimeout(timer);
      sweep(); // anything the file left running: browsers, dev servers
      out.end();
      const failed = [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map((m) => m[1]);
      // a skipped test is reported as `ok … # SKIP`: it did not pass, it did not run
      const skipped = (text.match(/^ok \d+ - .*# SKIP/gm) ?? []).length;
      const passed = (text.match(/^ok \d+ - /gm) ?? []).length - skipped;
      resolve({ ...job, code: job.timedOut ? 1 : code ?? 1, seconds: (Date.now() - began) / 1000, passed, skipped, failed, log: `.test-logs/${name}.log` });
    });
  });
}

const results = [];
function report(r) {
  results.push(r);
  const mark = r.code === 0 ? 'ok  ' : r.timedOut ? 'TIME' : 'FAIL';
  console.log(`${mark} ${String(results.length).padStart(3)}/${jobs.length} ${r.seconds.toFixed(1).padStart(7)}s  ${r.tier.padEnd(7)} ${r.label}${r.failed.length ? `  (${r.failed.length} failed)` : ''}`);
}

const started = Date.now();
// Side by side: the tiers that hold the most memory first, so the long files don't end up running alone at the end.
// A file starts when both budgets have room for it; one file always runs, whatever the budgets say.
const queue = jobs.filter((j) => j.tier !== 'alone').sort((a, b) => COST[b.tier].mb - COST[a.tier].mb);
let most = 0;
await new Promise((resolve) => {
  let cores = 0, mb = 0, running = 0;
  const next = () => {
    if (!queue.length && !running) return resolve();
    for (let i = 0; i < queue.length;) {
      const cost = COST[queue[i].tier];
      if (running && (cores + cost.cores > budget.cores || mb + cost.mb > budget.mb)) { i += 1; continue; }
      const [job] = queue.splice(i, 1);
      cores += cost.cores; mb += cost.mb; running += 1; most = Math.max(most, running);
      run(job).then((r) => { cores -= cost.cores; mb -= cost.mb; running -= 1; report(r); next(); });
    }
  };
  next();
});
for (const job of jobs.filter((j) => j.tier === 'alone')) report(await run(job));

const wall = (Date.now() - started) / 1000;
const bad = results.filter((r) => r.code !== 0);
const sum = (pick) => results.reduce((n, r) => n + pick(r), 0);
const room = flag('--serial') ? 'one at a time' : `${budget.cores} cores and ${(budget.mb / 1000).toFixed(1)} GB, up to ${most} files at once`;
console.log(`\n${results.length} runs in ${(wall / 60).toFixed(1)} min on ${room}: ${sum((r) => r.passed)} tests passed, ${sum((r) => r.failed.length)} failed, ${sum((r) => r.skipped)} skipped, ${bad.length} files failed`);
console.log('\nSlowest files:');
for (const r of [...results].sort((a, b) => b.seconds - a.seconds).slice(0, 10)) console.log(`  ${r.seconds.toFixed(1).padStart(7)}s  ${r.label}`);
if (bad.length) {
  console.log('\nFailed:');
  for (const r of bad) {
    console.log(`  ${r.label}${r.timedOut ? `  (killed after ${TIMEOUT_MIN} min)` : ''}  → ${r.log}`);
    for (const name of r.failed) console.log(`      ${name}`);
  }
}
await writeFile(join(logs, 'summary.json'), JSON.stringify({ wall, budget, most, results: results.map(({ env, ...r }) => r) }, null, 1));
process.exit(bad.length ? 1 : 0);
