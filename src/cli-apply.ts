import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import { cacheDirectory, ignoreCache } from './paths.js';
import { UsageError } from './errors.js';
import { readSource, writeSource, staleFile } from './write/source-file.js';
import { editChoices } from './surfaces/edits.js';
import { newSites } from './surfaces/sites.js';
import type { Report } from './report.js';

/**
 * `plumber apply <key>`: an agent takes a problem group the way a person takes a fix in the fix bar. The edits are
 * re-derived from the files as they are now and written by the session engine's own `apply` (the fix bar's writer:
 * the same guards, the same spelling); nothing the agent types becomes code. Each apply is kept for `plumber undo`,
 * which puts the files back only while nothing has changed them since, as the fix bar's Undo does.
 */
interface Kept { id: string; at: string; label: string; files: { file: string; before: string; hashAfter: string }[] }
const historyLimit = 20;
const historyFile = (root: string) => join(cacheDirectory(root), 'applied.json');

async function history(root: string): Promise<Kept[]> {
  try { return JSON.parse(await readFile(historyFile(root), 'utf8')) as Kept[]; } catch { return []; }
}
async function keep(root: string, entries: Kept[]): Promise<void> {
  ignoreCache(root);
  await mkdir(cacheDirectory(root), { recursive: true });
  const file = historyFile(root), temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(entries.slice(-historyLimit)));
  await rename(temp, file);
}

export interface ApplyCommand { root: string; config?: string; key: string; token?: string }

export async function applyGroup({ root, config, key, token }: ApplyCommand): Promise<string> {
  const { Session } = await import('./session/index.js');
  const session = await Session.create({ root, ...(config === undefined ? {} : { config }) });
  try {
    const report = await session.report({}) as Report;
    // a long key (a hash) is printed short; any unique start of one names it
    const matches = report.findings.filter(f => f.key === key || /^[0-9a-f]{64}$/.test(f.key) && key.length >= 8 && f.key.startsWith(key));
    if (matches.length > 1) throw new UsageError(`More than one problem group starts with ${key}; use more of its key.`);
    const finding = matches[0];
    if (!finding) throw new UsageError(`No problem group is called ${JSON.stringify(key)} now. It may be fixed already.\n  → plumber check --agent`, 'not-found');
    const choices = editChoices(finding).map(d => d.name);
    if (!choices.length) throw new UsageError(`${key} has no token close enough to write. A person has to decide it; tell them the places and the value you wanted.`);
    if (token !== undefined && !choices.includes(token)) throw new UsageError(`${token} isn't one of the choices for ${key}: ${choices.join(', ')}.\n  → plumber apply ${quote(key)} --token ${choices[0]}`);
    if (token === undefined && choices.length > 1) throw new UsageError(`${key} can take any of ${choices.join(', ')}. Pick one by its reason and what the element is for.\n  → plumber apply ${quote(key)} --token ${choices[0]}`);
    const chosen = token ?? choices[0]!;
    const sites = newSites(finding);
    // the file and lines each place is written at: the literal, when the class is read through a variable
    const byFile = new Map<string, Set<number>>();
    for (const site of sites) { const at = site.defined ?? site; byFile.set(at.file, (byFile.get(at.file) ?? new Set()).add(at.line)); }
    const kept: Kept = { id: randomBytes(4).toString('hex'), at: new Date().toISOString(), label: `${chosen} for “${finding.title || key}”`, files: [] };
    const lines: string[] = [], skipped: string[] = [];
    let applied = 0;
    for (const [path, at] of byFile) {
      const name = relative(root, path).replaceAll('\\', '/');
      const before = await readSource(root, path);
      const ids = new Map<string, { start: number; end: number }>();
      for (const line of at) {
        const found = await session.edits(path, line);
        if (found.hash !== before.hash) throw new UsageError(staleFile);
        for (const edit of found.edits) if (edit.findingKey === finding.key && edit.token === chosen && ![...ids.values()].some(e => e.start < edit.end && edit.start < e.end)) ids.set(edit.id, edit);
      }
      if (!ids.size) { skipped.push(name); continue; }
      const result = await session.apply({ file: path, hash: before.hash, edits: [...ids.keys()].map(id => ({ id })) });
      kept.files.push({ file: name, before: before.text, hashAfter: result.hash });
      applied += ids.size;
      lines.push(`- ${name}: ${ids.size === 1 ? '1 place' : `${ids.size} places`}`);
    }
    if (!applied) throw new UsageError(`None of the places of ${key} can be rewritten automatically. Change them by hand (plumber check --agent shows each one).`);
    await keep(root, [...await history(root), kept]);
    return [`Applied ${chosen} for “${finding.title || key}” in ${applied === 1 ? '1 place' : `${applied} places`}:`, ...lines,
      ...skipped.length ? [`Not written (change these by hand): ${skipped.join(', ')}`] : [],
      `Undo: plumber undo ${kept.id}`, 'Next: plumber check --changed --agent', ''].join('\n');
  } finally { await session.close(); }
}

/** Put back the files of one apply (the last one by default), each only if it still holds what the apply wrote. */
export async function undoApplied(root: string, id?: string): Promise<string> {
  const entries = await history(root);
  const entry = id === undefined ? entries.at(-1) : entries.find(e => e.id === id);
  if (!entry) throw new UsageError(id === undefined ? 'Nothing applied here to undo.' : `No apply called ${id}; only the last ${historyLimit} can be undone, each once.`, 'not-found');
  // every file is checked before any is written: an undo goes back whole or not at all
  const current = await Promise.all(entry.files.map(f => readSource(root, join(root, f.file))));
  const changed = entry.files.filter((f, i) => current[i]!.hash !== f.hashAfter).map(f => f.file);
  if (changed.length) throw new UsageError(`${changed.join(', ')} changed since this apply, so nothing was undone. Undo newer applies first, or edit it by hand.`, 'stale-file');
  for (const [i, f] of entry.files.entries()) await writeSource(root, join(root, f.file), { expectHash: current[i]!.hash, expectIdentity: current[i]!.identity, next: f.before });
  await keep(root, entries.filter(e => e !== entry));
  return `Undid ${entry.label} in ${entry.files.map(f => f.file).join(', ')}.\n`;
}

/** A key as the shell takes it: `'existence/dead-class:data-[state=open]:animate-in'`. */
export const quote = (full: string) => {
  const key = /^[0-9a-f]{64}$/.test(full) ? full.slice(0, 12) : full;
  return /^[\w./:-]+$/.test(key) ? key : `'${key.replaceAll("'", `'\\''`)}'`;
};
