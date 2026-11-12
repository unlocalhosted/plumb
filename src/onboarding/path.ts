import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { serve } from '../session/server.js';
import { projectFacts } from '../project-facts/index.js';
import type { Report } from '../report.js';
import type { Cause } from '../causes.js';
import { count } from '../messages.js';
import { sayCause } from '../say-cause.js';
import { projectGates } from './gates.js';
import { loadConfig } from '../config.js';
import { installOverlay } from '../adoption/install.js';
import { initProject } from '../adoption/init.js';
import { entryCount, readLedger } from '../ledger/store.js';
import { ledgerCommand } from '../ledger/commands.js';
import { packageManager } from '../setup-messages.js';
import type { ReadinessReport } from '../readiness/index.js';
import { wrap } from '../cli-table.js';

/**
 * The path a newcomer takes: `npx plumber`, nothing else. On a terminal it reads the code, serves a page about the
 * project on localhost and opens it (docs/design/onboarding.md, "The path"). The words here follow docs/copy/voice.md:
 * the person's own stack and numbers, never our parts.
 */
export interface PathContext {
  root: string;
  config?: string;
  /** Checks that the project can be read at all (the same gate every analysis passes); prints its own notices. */
  prepare(): Promise<void>;
  noOpen: boolean;
  /** `--yes`: set up here, with no page and no question. */
  yes?: boolean;
  /** The project's report, with progress shown where it helps. */
  report(): Promise<Report>;
}

/** Are we on a terminal where a browser tab is a fair thing to open? `PLUMBER_TERMINAL=1` says so for tests. */
export function onTerminal(noOpen: boolean): boolean {
  const ci = process.env.CI !== undefined && !['', '0', 'false'].includes(process.env.CI.toLowerCase());
  return !noOpen && !ci && (process.stdout.isTTY === true || process.env.PLUMBER_TERMINAL === '1');
}

/** The installed major version of a package, read from the nearest node_modules above the project. */
function installedMajor(root: string, name: string): string | undefined {
  for (let folder = resolve(root); ; folder = dirname(folder)) {
    const file = join(folder, 'node_modules', name, 'package.json');
    if (existsSync(file)) {
      try { const version = (JSON.parse(readFileSync(file, 'utf8')) as { version?: string }).version; return version?.split('.')[0]; } catch { return undefined; }
    }
    if (dirname(folder) === folder) return undefined;
  }
}

/** `Vite 8, React 19, Tailwind 4 (theme in src/index.css)`: what was found, in the person's words. */
export async function stackLine(root: string, tailwind: { version?: string | null; entry?: string | null }, withTheme = true): Promise<string> {
  const facts = await projectFacts(root, { root });
  const host = facts.host.value?.id;
  const part = (label: string, name: string) => { const major = installedMajor(root, name); return major ? `${label} ${major}` : label; };
  const parts = [
    ...(host === 'vite' ? [part('Vite', 'vite')] : host === 'next' ? [part('Next.js', 'next')] : []),
    ...(facts.react.value?.installed ? [part('React', 'react')] : []),
    ...(tailwind.version ? [`Tailwind ${tailwind.version.split('.')[0]}`] : []),
  ];
  const theme = withTheme && tailwind.entry ? ` (theme in ${relative(root, tailwind.entry).replaceAll('\\', '/')})` : '';
  return parts.length ? parts.join(', ') + theme : 'Your styles' + theme;
}

export const filesCount = (report: Report): number => Object.values(report.files as unknown as Record<string, number>).reduce((sum, n) => sum + n, 0);
export const seconds = (ms: number): string => `${(ms / 1000).toFixed(ms < 9950 ? 1 : 0)}s`;

/**
 * The same story with no browser to open (a pipe, CI, --no-open): the 3 biggest causes, one sentence or two each, and
 * exactly one next step. Whether the project is set up decides which step (docs/design/onboarding.md, sections 1 and 5).
 */
export function plainVersion(report: Report, setUp: boolean): string {
  const causes = (report.causes ?? []).slice(0, 3);
  const open = report.causes?.length ?? 0;
  // what would fail a pull request: new problems the ledger doesn't know (a value off your theme warns, it doesn't fail)
  const fresh = report.ledger?.new ?? 0;
  const lines = [`Plumber · ${count(filesCount(report), 'file')} in ${seconds(report.timing.totalMs)}`];
  if (!open) lines.push(setUp ? '  Nothing to fix. Nothing new since you set up.' : '  Nothing to fix in your styles.');
  else {
    if (setUp) lines.push(fresh ? `  ${count(fresh, 'new problem')} since you set up. ${open === 1 ? '1 cause is' : `${open} causes are`} open, the biggest:` : `  Nothing new since you set up. ${open === 1 ? '1 cause is' : `${open} causes are`} still open${open === 1 ? ':' : ', the biggest:'}`);
    for (const cause of causes) lines.push(wrap('  ' + sayCause(cause, report)));
  }
  lines.push('', setUp ? 'Next: press Alt+B on your page to fix it there.' : 'Next: run npx plumber in a terminal to see this in your browser, or npx plumber --yes to set it up here.');
  return lines.join('\n') + '\n';
}

/** Open the person's browser. `PLUMBER_OPENER` names a command to run with the address instead (tests set it; nothing opens). */
export function openBrowser(url: string): Promise<boolean> {
  const stub = process.env.PLUMBER_OPENER;
  const [command, ...args] = stub ? [stub, url] : process.platform === 'darwin' ? ['open', url] : process.platform === 'win32' ? ['cmd', '/c', 'start', '""', url] : ['xdg-open', url];
  return new Promise(done => {
    try {
      const child = spawn(command!, args, { stdio: 'ignore', detached: true });
      child.once('error', () => done(false));
      child.once('spawn', () => { child.unref(); done(true); });
    } catch { done(false); }
  });
}

/**
 * What setting up still has to do. Set up means all three: Plumber in the dev config, a config, and today's state
 * recorded (a config alone leaves every problem new). The plain version and --yes ask this one question.
 */
export async function setupGaps(root: string, config: string | undefined, ready: ReadinessReport): Promise<{ devConfig: boolean; config: boolean; state: boolean }> {
  return {
    devConfig: ready.requirements.find(item => item.id === 'locate.plugin')?.status !== 'ok',
    config: (await loadConfig(root, config)).path === null,
    state: !(await readLedger(root)).exists,
  };
}
const isSetUp = (gaps: { devConfig: boolean; config: boolean; state: boolean }) => !gaps.devConfig && !gaps.config && !gaps.state;

/**
 * Serve the page and open it; with no browser to open, say the same thing in the terminal.
 */
export async function runBare(context: PathContext): Promise<void> {
  const page = !context.yes && onTerminal(context.noOpen);
  // the page and --yes set up, which writes into the dev config; the plain version only reads
  const ready = await projectGates(context.root, context.config, page || context.yes === true);
  await context.prepare();
  if (context.yes) { process.stdout.write(await setUp(context, ready)); return; }
  if (!page) { process.stdout.write(plainVersion(await context.report(), isSetUp(await setupGaps(context.root, context.config, ready)))); return; }
  const started = performance.now();
  process.stdout.write('Plumber · reading your app…\n');
  const daemon = await serve({ root: context.root, ...(context.config === undefined ? {} : { config: context.config }), page: true, port: 7331, portSearch: 40 });
  let report: Report;
  try { report = await daemon.session.report(); } catch (error) { await daemon.close(); throw error; }
  process.stdout.write(`  ✓ ${await stackLine(report.root, report.tailwind)}\n  ✓ ${filesCount(report)} files in ${seconds(performance.now() - started)}\n\n`);
  const url = `http://localhost:${daemon.info.port}`;
  const opened = await openBrowser(url);
  process.stdout.write(opened ? `Opened your project in the browser: ${url}\n` : `Open your project in the browser: ${url}\n`);
  // listening before saying so: a Ctrl+C the moment the line appears would otherwise kill the process, leaving the
  // page's server open and saying nothing
  const stopped = new Promise<void>(done => {
    const stop = () => { process.off('SIGINT', stop); process.off('SIGTERM', stop); done(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  });
  process.stdout.write("Press Ctrl+C here when you're done.\n");
  await stopped;
  const written = (await daemon.session.history()).writes.length;
  await daemon.close();
  process.stdout.write(written ? '\n' : '\nNo changes made.\n');
}

/**
 * `--yes`: what the page's one button does, with no page and no question. Adds Plumber to the dev config (the changed
 * lines only) and writes plumber.config.ts with today's state, so only new problems fail later. It never writes into
 * the theme: theme proposals are fixes to take later. Running it again changes nothing.
 */
export async function setUp(context: PathContext, ready: ReadinessReport): Promise<string> {
  const root = context.root;
  const lines: string[] = [];
  const gaps = await setupGaps(root, context.config, ready);
  if (gaps.devConfig) {
    // first: the dev config is the step that can be refused (an unusual config), and a refusal writes nothing
    const wrote = [...(await installOverlay(root, true)).matchAll(/^Wrote (.+)\.$/gm)].map(match => match[1]!);
    for (const file of wrote.length ? wrote : ['your dev config']) lines.push(`  ✓ Added Plumber to ${file}`);
  }
  // a config with no state recorded (set up by hand, or before this): record today's state against it
  const saved = (entries: import('../ledger/types.js').LedgerEntry[]) => {
    const places = entries.filter(entry => entry.kind === 'debt').reduce((sum, entry) => sum + entryCount(entry), 0);
    lines.push(`  ✓ Saved today's state${places ? ` (${count(places, 'place')})` : ''}, so only new problems fail from now on`, '  Your theme is untouched.');
  };
  if (!gaps.config) { if (gaps.state) saved((await ledgerCommand('baseline', await context.report(), {})).entries); }
  else {
    const result = await initProject(root, { ...(context.config === undefined ? {} : { config: context.config }), unattended: true, quiet: true }, () => {});
    saved(result.entries);
  }
  if (!lines.length) return 'Plumber is already set up here.\n\nNext: press Alt+B on your page to fix it there.\n';
  const manager = packageManager(root);
  return ['Plumber · set up', ...lines, '', `Next: start your app (${manager === 'npm' ? 'npm run dev' : `${manager} dev`}) and press Alt+B on your page.`, ''].join('\n');
}
