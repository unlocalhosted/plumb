// What `plumber` finds in Quarry beyond what the overlay reads live: the source habits, and the craft rules that are
// found by using the page (pressing, hovering, dragging, the dark and touch pairs, held responses). Writes
// src/findings.json, which the showcase shows beside the overlay. Run with the showcase's dev server up:
//   node scripts/findings.mjs [http://127.0.0.1:4312]
// Broken and Fixed are two builds of one project, so each is checked on its own: Broken's source is the project
// without src/fixed.css, Fixed's without src/broken.css (a habit like font-metrics judges the whole project at once).
import { execFile } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = fileURLToPath(new URL('..', import.meta.url));
const cli = fileURLToPath(new URL('../../../dist/cli.js', import.meta.url));
const url = (process.argv[2] ?? 'http://127.0.0.1:4312').replace(/\/$/, '');

const json = async (args) => {
  const r = await run('node', [cli, ...args], { maxBuffer: 64 << 20, timeout: 600000 }).catch((e) => e);
  try { return JSON.parse(r.stdout); } catch { throw new Error(`plumber ${args.join(' ')} said: ${String(r.stderr || r.message).slice(0, 400)}`); }
};
const row = (f, root) => ({
  rule: f.rule,
  file: relative(root, f.sites?.[0]?.file ?? f.file ?? '').replace(/^\.\.\/.*\//, ''),
  line: f.sites?.[0]?.line ?? f.line ?? null,
  title: f.title ?? f.finding?.title ?? '',
});

async function habits(without) {
  const root = await mkdtemp(join(here, '..', '.quarry-')); // beside the showcase, so Tailwind resolves from the repo
  try {
    await cp(here, root, { recursive: true, filter: (p) => !p.includes('node_modules') && !p.endsWith(without) });
    const report = await json(['check', '--root', root, '--json']);
    return (report.findings ?? []).filter((f) => f.rule?.startsWith('habits/')).map((f) => row(f, root));
  } finally { await rm(root, { recursive: true, force: true }); }
}

// the craft rules the overlay can't read on a page at rest: found by the probes and the pairs
const used = (report) => (report.findings ?? []).filter((f) => HEADLESS.has(f.rule));
const HEADLESS = new Set(['craft/dark-elevation', 'craft/dark-weight', 'craft/skeleton-match', 'craft/scroll-cue', 'craft/exit-faster', 'craft/interruptible',
  'craft/press-feedback', 'craft/menu-pointerdown', 'craft/tooltip-delay', 'craft/palette-motion', 'craft/submenu-path', 'craft/overdrag', 'craft/touch-manipulation', 'craft/spinner-timing']);

async function craft(route) {
  const report = await json(['craft', '--url', url + route, '--root', here, '--json', '--probe', 'drag', '--timeout', '240000']);
  return used(report).map((f) => row(f, here));
}

const out = {
  url,
  broken: { habits: await habits('src/fixed.css'), used: await craft('/') },
  fixed: { habits: await habits('src/broken.css'), used: await craft('/?fixed') },
};
await writeFile(join(here, 'src/findings.json'), JSON.stringify(out, null, 2) + '\n');
const n = (m) => out[m].habits.length + out[m].used.length;
console.log(`Broken: ${n('broken')} findings, Fixed: ${n('fixed')}. Wrote src/findings.json.`);
