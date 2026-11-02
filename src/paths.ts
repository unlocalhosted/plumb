import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread } from 'node:worker_threads';

export const configNames = ['ts', 'mts', 'mjs', 'js'].map(extension => `plumber.config.${extension}`);
export const legacyConfigNames = configNames.map(name => name.replace('plumber', 'plumb'));
export const allConfigNames = [...configNames, ...legacyConfigNames];
/** Once a new config exists, legacy candidates cannot affect discovery. */
export const configurationNames = (root: string) => configNames.some(name => existsSync(join(root, name))) ? configNames : allConfigNames;

/** Choose one state directory for every read and write; never split a legacy project. */
export function stateDirectory(root: string): string {
  const current = join(root, '.plumber');
  return !existsSync(current) && existsSync(join(root, '.plumb')) ? join(root, '.plumb') : current;
}
export const statePath = (root: string, file: string) => join(stateDirectory(root), file);
export const environment = (name: string) => process.env[`PLUMBER_${name}`] ?? process.env[`PLUMB_${name}`];
export const cacheDirectory = (root: string) => resolve(environment('CACHE_DIR') ?? statePath(root, 'cache'));
/** The cache is never committed: its root carries a .gitignore that ignores all of it, written the first time a
 * session or a check makes the cache. Projects don't have to know the folder exists. */
export function ignoreCache(root: string): void {
  const directory = cacheDirectory(root), file = join(directory, '.gitignore');
  try { if (!existsSync(file)) { mkdirSync(directory, { recursive: true }); writeFileSync(file, "# React Plumber's cache: rebuilt on demand, never committed\n*\n"); } } catch { /* a read-only checkout keeps working */ }
}
export const isLedgerPath = (file: string) => /\/\.plumb(?:er)?\/ledger\.jsonl$/.test(file);

let build: string | undefined;
/**
 * A hash of the built code itself. Every cache on disk is keyed by it, so a rebuild (a dev checkout, a linked
 * package) is never served a result the previous code made, with or without a version bump.
 */
export function buildId(): string {
  if (build) return build;
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path); else if (entry.isFile() && path.endsWith('.js')) files.push(path);
    }
  };
  walk(dirname(fileURLToPath(import.meta.url)));
  const digest = createHash('sha256');
  for (const file of files.sort()) digest.update(file).update('\0').update(readFileSync(file)).update('\0');
  return build = digest.digest('hex');
}

let noticed = false;
/** Host/CLI owns the notice, so analysis workers cannot repeat it. JSON stays on stdout. */
export function migrationNotice(root: string, explicitConfig?: string): void {
  if (!isMainThread || noticed) return;
  const selected = explicitConfig ? resolve(root, explicitConfig) : allConfigNames.map(name => join(root, name)).find(existsSync);
  const moves: string[] = [];
  if (selected && legacyConfigNames.includes(basename(selected)) && existsSync(selected) && !configNames.some(name => existsSync(join(root, name)))) {
    const name = basename(selected);
    moves.push(`mv ${name} ${name.replace('plumb.config.', 'plumber.config.')}`);
  }
  if (!existsSync(join(root, '.plumber')) && existsSync(join(root, '.plumb'))) moves.push('mv .plumb .plumber');
  if (moves.length) {
    noticed = true;
    process.stderr.write(`React Plumber: legacy names in use; migrate with ${moves.join('; ')}.\n`);
  }
}
