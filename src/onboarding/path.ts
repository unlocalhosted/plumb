import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { serve } from '../session/server.js';
import { projectFacts } from '../project-facts/index.js';
import type { Report } from '../report.js';

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
 * Serve the page and open it. Returns false when this isn't a case for the page, so the caller does what it did before.
 */
export async function runPage(context: PathContext): Promise<boolean> {
  if (!onTerminal(context.noOpen)) return false;
  await context.prepare();
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
  return true;
}
