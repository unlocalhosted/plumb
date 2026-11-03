import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { serve } from '../session/server.js';
import { projectFacts } from '../project-facts/index.js';
import type { Report } from '../report.js';
import type { Cause } from '../causes.js';
import { count } from '../messages.js';
import { projectGates } from './gates.js';
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
export async function stackLine(report: Report): Promise<string> {
  const facts = await projectFacts(report.root, { root: report.root });
  const host = facts.host.value?.id;
  const part = (label: string, name: string) => { const major = installedMajor(report.root, name); return major ? `${label} ${major}` : label; };
  const parts = [
    ...(host === 'vite' ? [part('Vite', 'vite')] : host === 'next' ? [part('Next.js', 'next')] : []),
    ...(facts.react.value?.installed ? [part('React', 'react')] : []),
    ...(report.tailwind.version ? [`Tailwind ${report.tailwind.version.split('.')[0]}`] : []),
  ];
  const theme = report.tailwind.entry ? ` (theme in ${relative(report.root, report.tailwind.entry).replaceAll('\\', '/')})` : '';
  return parts.length ? parts.join(', ') + theme : 'Your styles' + theme;
}

export const filesCount = (report: Report): number => Object.values(report.files as unknown as Record<string, number>).reduce((sum, n) => sum + n, 0);
export const seconds = (ms: number): string => `${(ms / 1000).toFixed(ms < 9950 ? 1 : 0)}s`;

const nouns: Record<string, string> = { 'font-size': 'text size', 'font-weight': 'text weight', 'letter-spacing': 'letter spacing', 'line-height': 'line height', 'border-radius': 'corner radius' };
const families: Record<string, string> = { color: 'colour', spacing: 'spacing', radius: 'corner radius', type: 'text style', motion: 'timing', elevation: 'shadow', z: 'layer order' };
const stepOf: Record<string, string> = { color: 'your colours', spacing: 'your spacing', radius: 'your corner radii', type: 'your type scale', motion: 'your timings', elevation: 'your shadows', z: 'your layers' };

/** One cause in a sentence or two a person would say out loud: what they wrote, how many places, what their theme calls it. */
export function sayCause(cause: Cause, report: Report): string {
  const property = /^value:[^:]+:([a-z-]+):/.exec(cause.id)?.[1];
  const noun = (property && nouns[property]) ?? families[cause.family] ?? cause.family;
  const ways = cause.spellings.length;
  let text = cause.family === 'color'
    ? `You wrote ${cause.label} ${ways > 1 ? `${ways} ways, ` : ''}in ${count(cause.count, 'place')}.`
    : `You set ${noun} ${cause.label} ${ways > 1 ? `${ways} ways, ` : ''}in ${count(cause.count, 'place')}.`;
  const step = cause.suggestion && report.decisions.find(decision => decision.name === cause.suggestion!.token);
  const raw = step ? step.resolved ?? step.value : undefined;
  // a person says 16px, not 1rem
  const value = raw && /^[\d.]+rem$/.test(raw) ? `${Number(raw.slice(0, -3)) * 16}px` : raw;
  if (cause.suggestion) {
    text += cause.suggestion.exact ? ` Your theme calls it ${cause.suggestion.name}.`
      : ` The closest in ${stepOf[cause.family] ?? 'your theme'} is ${cause.suggestion.name}${value ? ` (${value})` : ''}.`;
  }
  if (cause.rendersNothing) text += ` ${cause.rendersNothing === cause.count ? 'All of them render' : cause.rendersNothing === 1 ? '1 renders' : `${cause.rendersNothing} render`} nothing.`;
  return text;
}

/**
 * The same story with no browser to open (a pipe, CI, --no-open): the 3 biggest causes, one sentence or two each, and
 * exactly one next step. Whether the project is set up decides which step (docs/design/onboarding.md, sections 1 and 5).
 */
export function plainVersion(report: Report): string {
  const causes = (report.causes ?? []).slice(0, 3);
  const open = report.causes?.length ?? 0;
  // set up: a config, and today's state recorded (the ledger); a config alone leaves every problem new
  const setUp = report.config.path !== null && report.ledger?.exists === true;
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
 * Serve the page and open it; with no browser to open, say the same thing in the terminal.
 */
export async function runBare(context: PathContext): Promise<void> {
  const page = onTerminal(context.noOpen);
  // the page offers setup, which writes into the dev config; the plain version only reads
  await projectGates(context.root, context.config, page);
  await context.prepare();
  if (!page) { process.stdout.write(plainVersion(await context.report())); return; }
  const started = performance.now();
  process.stdout.write('Plumber · reading your app…\n');
  const daemon = await serve({ root: context.root, ...(context.config === undefined ? {} : { config: context.config }), page: true, port: 7331, portSearch: 40 });
  let report: Report;
  try { report = await daemon.session.report(); } catch (error) { await daemon.close(); throw error; }
  process.stdout.write(`  ✓ ${await stackLine(report)}\n  ✓ ${filesCount(report)} files in ${seconds(performance.now() - started)}\n\n`);
  const url = `http://localhost:${daemon.info.port}`;
  const opened = await openBrowser(url);
  process.stdout.write(opened ? `Opened your project in the browser: ${url}\n` : `Open your project in the browser: ${url}\n`);
  process.stdout.write("Press Ctrl+C here when you're done.\n");
  await new Promise<void>(done => {
    const stop = () => { process.off('SIGINT', stop); process.off('SIGTERM', stop); done(); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  });
  const written = (await daemon.session.history()).writes.length;
  await daemon.close();
  process.stdout.write(written ? '\n' : '\nNo changes made.\n');
}
