#!/usr/bin/env node
// Measures how well the overlay finds an element's source on each host. Layer 1 of the locate plan: measurement only.
//   node bench/locate/run.mjs [--hosts vite-stamped,next-webpack] [--corpus showcase,algorecall,craftingattention]
//                             [--screens 01,16] [--cap 150] [--out docs/verification/locate-baseline] [--ignore-memory]
// Needs an existing `npm run build` (dist). One host at a time, each its own process tree on port 0, killed when done.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { appDefs, freeze, startApp } from './apps.mjs';
import { chromiumPath, exists, gitHead, repo, spawnHost, freeMemoryPercent, workRoot, here, nodeModulesHome } from './lib.mjs';
import { measureWithRetry } from './measure.mjs';
import { startNext, writeNextApp } from './next-app.mjs';
import { buildReport, writeReport } from './report.mjs';
import { runNextApps } from './nextapps-run.mjs';
import { nextApps } from './nextapps.mjs';
import { buildNextReport, writeNextReport } from './report-nextapps.mjs';
import { copyShowcaseSource, findShowcase, screenUrl, writeViteProject } from './showcase.mjs';

const SHOWCASE_HOSTS = ['vite-stamped', 'vite-unstamped', 'next-webpack', 'next-turbopack'];
const APP_HOSTS = ['vite-stamped', 'vite-unstamped'];

function parse(argv) {
  const opts = { hosts: null, corpus: ['showcase', ...Object.keys(appDefs)], screens: null, cap: 150, out: join(repo, 'docs/verification/locate-baseline'), ignoreSwap: false, showcase: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--hosts') opts.hosts = next().split(',');
    else if (a === '--corpus') opts.corpus = next().split(',');
    else if (a === '--screens') opts.screens = next().split(',');
    else if (a === '--cap') opts.cap = Number(next());
    else if (a === '--out') { opts.out = resolve(next()); opts.outGiven = true; }
    else if (a === '--showcase') opts.showcase = resolve(next());
    else if (a === '--merge') opts.merge = true;
    else if (a === '--apps') opts.apps = next().split(',');
    else if (a === '--routes') opts.routes = next().split(',');
    else if (a === '--bundlers') opts.bundlers = next().split(',');
    else if (a === '--ignore-memory') opts.ignoreMemory = true;
    else if (a === '--help') { console.log(readHelp()); process.exit(0); }
    else throw new Error('Unknown argument ' + a);
  }
  return opts;
}
const readHelp = () => 'node bench/locate/run.mjs [--hosts a,b] [--corpus showcase,algorecall,craftingattention] [--screens 01,16] [--cap 150] [--out prefix] [--showcase dir] [--ignore-memory]\nhosts: ' + SHOWCASE_HOSTS.join(', ') + ' (apps: ' + APP_HOSTS.join(', ') + '). plumber serve is not covered.';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const tag = (rows, extra) => rows.map((r) => ({ ...extra, ...r }));

async function runShowcaseHost(browser, host, showcase, screens, opts, sink) {
  const dest = join(workRoot, `${host}-${process.pid}`);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  let server;
  try {
    const t0 = performance.now();
    if (host.startsWith('vite')) {
      await copyShowcaseSource(showcase, dest);
      await writeViteProject(dest);
      server = await spawnHost({ file: join(here, 'vite-host.mjs'), args: [JSON.stringify({ root: dest, stamp: host === 'vite-stamped', allow: [repo, nodeModulesHome(), showcase.dir] })], cwd: dest, label: host });
    } else {
      const bundler = host === 'next-webpack' ? 'webpack' : 'turbopack';
      await writeNextApp(dest, showcase, { bundler });
      server = await startNext(dest, bundler);
    }
    log(host, 'up at', server.url, `(${Math.round(performance.now() - t0)} ms)`);
    // Three failures in a row share a cause (a host or setup fault), so the rest of the host is skipped, not waited on.
    let failedInRow = 0;
    for (const screen of screens) {
      if (failedInRow >= 3) { sink.screenFailures.push({ host, screen: screen.id, why: 'skipped: the 3 screens before it failed on this host' }); continue; }
      const t1 = performance.now();
      const result = await measureWithRetry(browser, screenUrl(server.url, host, screen), { rootSelector: '#bench-root', cap: opts.cap });
      failedInRow = result.failed ? failedInRow + 1 : 0;
      if (result.failed) { sink.screenFailures.push({ host, screen: screen.id, why: result.failed }); log(host, screen.id, 'FAILED', result.failed.slice(0, 120)); continue; }
      if (!result.rows.length) { sink.screenFailures.push({ host, screen: screen.id, why: 'rendered no elements' }); continue; }
      sink.rows.push(...tag(result.rows, { corpus: 'showcase', host, screen: screen.id }));
      sink.screenMeta.push({ host, screen: screen.id, total: result.total, sampled: result.rows.length, loadMs: Math.round(result.loadMs), retried: result.retried, pageErrors: result.pageErrors });
      log(host, screen.id, `${result.rows.length}/${result.total} elements, ${Math.round(performance.now() - t1)} ms`);
    }
  } finally {
    await server?.stop();
    await rm(dest, { recursive: true, force: true });
  }
}

async function runApp(browser, name, hosts, opts, sink) {
  const scratch = join(workRoot, `app-${name}-${process.pid}`);
  await rm(scratch, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });
  let frozen;
  try {
    frozen = await freeze(name, scratch);
    log(name, `frozen ${frozen.snapshot.fileCount} files in ${frozen.snapshot.ms} ms`);
    for (const host of hosts) {
      let server;
      try {
        server = await startApp(frozen.app, scratch, { stamp: host === 'vite-stamped' });
        log(name, host, 'up at', server.url);
        for (const path of frozen.app.pages) {
          const result = await measureWithRetry(browser, new URL(path, server.url).href, { rootSelector: null, cap: opts.cap });
          if (result.failed) { sink.screenFailures.push({ host: `${name} ${host}`, screen: path, why: result.failed }); continue; }
          sink.rows.push(...tag(result.rows, { corpus: name, host, screen: path }));
          sink.screenMeta.push({ host: `${name} ${host}`, screen: path, total: result.total, sampled: result.rows.length, loadMs: Math.round(result.loadMs), pageErrors: result.pageErrors });
          log(name, host, path, `${result.rows.length}/${result.total} elements`);
        }
      } catch (error) {
        sink.screenFailures.push({ host: `${name} ${host}`, screen: '/', why: String(error.message).slice(0, 600) });
        log(name, host, 'FAILED', String(error.message).slice(0, 200));
      } finally { await server?.stop(); }
    }
  } finally {
    if (frozen) {
      await frozen.finish();
      sink.apps[name] = { inputsUnchanged: frozen.snapshot.unchanged, originalUnchanged: frozen.snapshot.originalUnchanged, files: frozen.snapshot.fileCount, head: frozen.snapshot.head };
    }
    await rm(scratch, { recursive: true, force: true });
  }
}

async function mainNextApps(opts, argv) {
  const free = freeMemoryPercent();
  if (free < 20 && !opts.ignoreMemory) throw new Error(`Only ${free}% of memory is free; wait or free memory, or pass --ignore-memory.`);
  const keys = opts.apps ?? Object.keys(nextApps);
  for (const k of keys) if (!nextApps[k]) throw new Error('Unknown app ' + k);
  const sink = { rows: [], screenFailures: [], nextapps: {} };
  const started = Date.now();
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const version = browser.version();
  try { await runNextApps(browser, keys, opts, sink); } finally { await browser.close().catch(() => {}); await rm(workRoot, { recursive: true, force: true }).catch(() => {}); }
  const out = opts.outGiven ? opts.out : join(repo, 'docs/verification/locate-real-next');
  // --merge: keep the apps of an earlier report at the same path that this run did not redo, so the apps can run one at a time
  if (opts.merge && existsSync(out + '.json')) {
    const before = JSON.parse(readFileSync(out + '.json', 'utf8'));
    for (const [k, v] of Object.entries(before.meta.nextapps ?? {})) if (!sink.nextapps[k]) {
      sink.nextapps[k] = v;
      sink.rows.push(...before.rows.filter((r) => r.corpus === k));
      sink.screenFailures.push(...(before.meta.screenFailures ?? []).filter((x) => x.host.startsWith(k + ' ')));
    }
  }
  const meta = {
    date: new Date().toISOString().slice(0, 10), commit: gitHead(), args: argv.join(' '), cap: opts.cap,
    versions: `Chrome ${version}, node ${process.version}, apps run on their own pinned Next versions`, durationS: Math.round((Date.now() - started) / 1000),
    jsonName: out.split('/').pop() + '.json', nextapps: sink.nextapps, screenFailures: sink.screenFailures,
    seen: existsSync(join(here, 'seen-real-next.md')) ? readFileSync(join(here, 'seen-real-next.md'), 'utf8').trim() : null,
  };
  const report = buildNextReport(sink.rows, meta);
  await mkdir(resolve(out, '..'), { recursive: true });
  await writeNextReport(report, out);
  log('wrote', out + '.json', out + '.md');
  return report;
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parse(argv);
  if (opts.corpus.length === 1 && opts.corpus[0] === 'nextapps') return mainNextApps(opts, argv);
  if (!exists(join(repo, 'dist/hosts/vite.js'))) throw new Error('No dist: run `npm run build` first.');
  const free = freeMemoryPercent();
  if (free < 20 && !opts.ignoreMemory) throw new Error(`Only ${free}% of memory is free; a host plus Chrome would swap. Free memory, or pass --ignore-memory.`);
  const wanted = opts.hosts;
  const wantsShowcase = opts.corpus.includes('showcase');
  const apps = opts.corpus.filter((c) => c !== 'showcase');
  for (const c of apps) if (!appDefs[c]) throw new Error('Unknown corpus ' + c);
  const showcaseHosts = SHOWCASE_HOSTS.filter((h) => !wanted || wanted.includes(h));
  const appHosts = APP_HOSTS.filter((h) => !wanted || wanted.includes(h));
  for (const h of wanted ?? []) if (!SHOWCASE_HOSTS.includes(h)) throw new Error('Unknown host ' + h + (h.startsWith('plumber') ? ' (plumber serve is not covered)' : ''));
  // the stamped host is the ground truth for every other host, so it always runs; its rows are kept either way
  const needTruth = (h) => h !== 'vite-stamped';
  const runShowcase = wantsShowcase ? [...new Set(['vite-stamped', ...showcaseHosts])] : [];
  const runApps = (hs) => [...new Set([...(hs.some(needTruth) ? ['vite-stamped'] : []), ...hs])];

  await mkdir(workRoot, { recursive: true });
  const sink = { rows: [], screenFailures: [], screenMeta: [], apps: {} };
  const started = Date.now();
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const version = browser.version();
  let showcase = null, screens = [];
  try {
    if (wantsShowcase) {
      showcase = await findShowcase(opts.showcase);
      screens = showcase.screens.filter((s) => !opts.screens || opts.screens.includes(s.id) || opts.screens.includes(String(s.n)));
      if (!screens.length) throw new Error('No screens match --screens');
      for (const host of runShowcase) await runShowcaseHost(browser, host, showcase, screens, opts, sink);
    }
    for (const name of apps) if (appHosts.length) await runApp(browser, name, runApps(appHosts), opts, sink);
  } finally {
    await browser.close().catch(() => {});
    await rm(workRoot, { recursive: true, force: true }).catch(() => {});
  }
  const nextVersion = JSON.parse((await import('node:fs')).readFileSync(join(repo, 'node_modules/next/package.json'), 'utf8')).version;
  const meta = {
    date: new Date().toISOString().slice(0, 10), commit: gitHead(), args: argv.join(' '), cap: opts.cap, hosts: { showcase: runShowcase, apps: apps.length ? runApps(appHosts) : [] },
    versions: `Chrome ${version}, Next ${nextVersion}, node ${process.version}`, durationS: Math.round((Date.now() - started) / 1000),
    showcase: showcase && { origin: showcase.origin, dir: showcase.dir, screens: showcase.screens.length, measured: screens.length, sha256: showcase.sha256 },
    screenNames: showcase && Object.fromEntries(showcase.screens.map((s) => [s.id, s.name])),
    screenFailures: sink.screenFailures, screenMeta: sink.screenMeta, apps: sink.apps,
    jsonName: opts.out.split('/').pop() + '.json',
    notCovered: ['plumber serve: it attaches the overlay to a dev server the user already runs (`serve --overlay --origin <url>`; e2e/served-root.test.mjs drives it over Vite and Next), so it is not a host of its own and would repeat a host measured here. Not run.', ...(wantsShowcase ? [] : ['showcase corpus: not selected in this run.'])],
  };
  const report = buildReport(sink.rows, meta);
  await mkdir(resolve(opts.out, '..'), { recursive: true });
  await writeReport(report, opts.out);
  log('wrote', opts.out + '.json', opts.out + '.md');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(here, 'run.mjs')) {
  main().then(() => process.exit(0), (error) => { console.error(error.message ?? error); process.exit(1); });
}
