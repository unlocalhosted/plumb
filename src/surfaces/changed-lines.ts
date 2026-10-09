import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { changedFiles, gitContext } from '../ledger/git.js';
import { UsageError } from '../errors.js';
import type { Site } from '../report.js';

export type LineScope = ReadonlyMap<string, ReadonlySet<number>>;
export const touchesLine = (scope: LineScope | undefined, site: Site) => scope === undefined || scope.get(site.file)?.has(site.line) === true;

/** Read added/replaced lines against the ref, including staged edits and untracked files. */
export async function changedLines(root: string, ref: string): Promise<LineScope> {
  const context = gitContext(root, ref);
  const scope = new Map<string, Set<number>>();
  for (const file of changedFiles(root, ref)) {
    const path = relative(context.top, file);
    const lines = new Set<number>();
    try {
      const diff = execFileSync('git', ['-C', context.top, 'diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=0', context.commit, '--', path],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
      for (const match of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number(match[1]), count = match[2] === undefined ? 1 : Number(match[2]);
        for (let line = start; line < start + count; line++) lines.add(line);
      }
      // An untracked file has no Git diff yet. Its authored lines are all new.
      if (!diff) {
        const untracked = execFileSync('git', ['-C', context.top, 'ls-files', '--others', '--exclude-standard', '-z', '--', path], { encoding: 'utf8' });
        if (untracked) (await readFile(file, 'utf8')).split(/\r?\n/).forEach((_, index) => lines.add(index + 1));
      }
    } catch (error) {
      throw new UsageError(`Cannot read changed lines for ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    scope.set(file, lines);
  }
  return scope;
}
