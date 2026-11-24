import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** The commands a person can run, as React Plumber prints them in its words ("Next: plumber init"). */
const COMMANDS = 'init|check|install|doctor|propose|state|fix|baseline|accept|accept-decisions|spec|craft|ledger|show|why|report|census|habits|decisions|explain|try|presets|serve|agent-docs|parity|imitation';

/**
 * How this project runs a package's command: the lockfile beside it, or the nearest one above (a workspace). A bare
 * `plumber init` runs only where React Plumber is installed globally; printed that way, the onboarding's next steps
 * failed in a shell (docs/qa/onboarding-2026-11-19.md, gap 7).
 */
export function runnerOf(root: string): string {
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm exec';
    if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
    if (existsSync(join(dir, 'bun.lock')) || existsSync(join(dir, 'bun.lockb'))) return 'bunx';
    if (existsSync(join(dir, 'package-lock.json'))) return 'npx';
    if (dirname(dir) === dir) return 'npx';
  }
}

/** Text with every `plumber <command>` written the way this project runs it (`pnpm exec plumber init`). */
export function runnable(text: string, runner: string): string {
  // a command, or bare `plumber` (the page) at the end of a line or before a flag; one a runner already starts is left
  // alone (a hook's `npx --no-install plumber` was printed as `npx --no-install npx plumber`)
  return text.replace(new RegExp(`(^|[^\\w./@-])(?<!npx |exec |yarn |bunx |--no-install )plumber(?=(?: (?:${COMMANDS})\\b| --|$))`, 'gm'), `$1${runner} plumber`);
}

/** The runner the CLI prints with, set once at its start for words meant for a person; unset (an API caller, JSON),
 * commands stay `plumber …`. Text laid out to a width (a wrapped command) adds it before measuring. */
let printing: string | undefined;
export function printWith(runner: string | undefined): void { printing = runner; }
export function printed(command: string): string { return printing ? runnable(command, printing) : command; }
