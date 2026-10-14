import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
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
export const isLedgerPath = (file: string) => /\/\.plumb(?:er)?\/ledger\.jsonl$/.test(file);

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
