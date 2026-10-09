import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { UsageError } from '../errors.js';
import { ledgerPath, parseLedger } from './store.js';
import type { LedgerEntry } from './types.js';

function git(root: string, args: string[]): string {
  try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 }); }
  catch { throw new UsageError(`Git comparison requires a repository and valid ref (${args[0]}).`); }
}
export function author(root: string): string | undefined {
  try { return git(root, ['config', 'user.name']).trim() || undefined; } catch { return undefined; }
}
export function gitContext(root: string, ref: string): { top: string; commit: string } {
  const top = git(root, ['rev-parse', '--show-toplevel']).trim();
  const commit = git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
  return { top, commit };
}
function refFile(context: { top: string; commit: string }, file: string): string {
  const path = relative(context.top, file).replaceAll('\\', '/');
  if (path === '..' || path.startsWith('../')) throw new UsageError(`Git comparison file is outside the repository: ${file}.`);
  const exists = git(context.top, ['ls-tree', '--name-only', context.commit, '--', path]).trim();
  return exists ? git(context.top, ['show', `${context.commit}:${path}`]) : '';
}
export function ledgerAt(root: string, ref: string): LedgerEntry[] {
  const context = gitContext(root, ref);
  return parseLedger(refFile(context, ledgerPath(root)), `${ref}:.plumb/ledger.jsonl`);
}
export function changedFiles(root: string, ref: string): Set<string> {
  const context = gitContext(root, ref);
  const names = git(context.top, ['diff', '--name-only', '--no-renames', '-z', context.commit, '--']) +
    git(context.top, ['ls-files', '--others', '--exclude-standard', '-z']);
  return new Set(names.split('\0').filter(Boolean).map(file => resolve(context.top, file)));
}
export async function configGrowth(root: string, config: string | null): Promise<{ file: string; line: number; text: string }[]> {
  const context = gitContext(root, 'HEAD');
  const paths = new Set(['ts', 'mts', 'mjs', 'js'].map(ext => resolve(root, `plumb.config.${ext}`)));
  if (config) paths.add(config);
  const added: { file: string; line: number; text: string }[] = [];
  for (const file of paths) {
    let text: string;
    try { text = await readFile(file, 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    const counts = new Map<string, number>();
    for (const line of refFile(context, file).split(/\r?\n/).map(line => line.trim()).filter(Boolean)) counts.set(line, (counts.get(line) ?? 0) + 1);
    text.split(/\r?\n/).forEach((text, index) => {
      const line = text.trim(); if (!line) return;
      const count = counts.get(line) ?? 0;
      if (count) counts.set(line, count - 1); else added.push({ file, line: index + 1, text });
    });
  }
  return added;
}
