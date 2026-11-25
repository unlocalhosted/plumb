import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import { cacheDirectory, ignoreCache } from './paths.js';
import { UsageError } from './errors.js';
import { readSource, writeSource, staleFile } from './write/source-file.js';
import { editChoices } from './surfaces/edits.js';
import { newSites } from './surfaces/sites.js';
import type { Finding, Report } from './report.js';

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

/**
 * A page check's fixes (`plumber craft --url`), kept so `plumber apply p…` can take one without reading the page
 * again (a page check takes most of a minute). The newest run wins; each fix is guarded again when it is written.
 */
interface PageFix { file: string; line: number; column: number; from: string; to: string; title: string; rule: string; url?: string; path?: string }
const pageFixesFile = (root: string) => join(cacheDirectory(root), 'page-fixes.json');
const isPageKey = (key: string) => /^p[0-9a-f]{9}$/.test(key);
export async function keepPageFixes(root: string, findings: readonly Finding[], places: ReadonlyMap<string, { url: string; path: string }> = new Map()): Promise<void> {
  let kept: Record<string, PageFix> = {};
  try { kept = JSON.parse(await readFile(pageFixesFile(root), 'utf8')) as Record<string, PageFix>; } catch { /* none yet */ }
  for (const finding of findings) {
    const site = finding.sites[0];
    if (!finding.apply || !site) continue;
    delete kept[finding.apply.key];
    kept[finding.apply.key] = { file: relative(root, site.file).replaceAll('\\', '/'), line: site.line, column: site.column, from: finding.apply.from, to: finding.apply.to, title: finding.title, rule: finding.rule, ...places.get(finding.apply.key) };
  }
  const entries = Object.entries(kept).slice(-500);
  ignoreCache(root);
  await mkdir(cacheDirectory(root), { recursive: true });
  const file = pageFixesFile(root), temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(Object.fromEntries(entries)));
  await rename(temp, file);
}

async function applyPageFix({ root, config, key }: ApplyCommand): Promise<string> {
  let kept: Record<string, PageFix> = {};
  try { kept = JSON.parse(await readFile(pageFixesFile(root), 'utf8')) as Record<string, PageFix>; } catch { /* none yet */ }
  const fix = kept[key];
  if (!fix) throw new UsageError(`No page fix is called ${key}. Page fixes come from the last page check; run it again.\n  → plumber craft --url <your dev server>`, 'not-found');
  const { Session } = await import('./session/index.js');
  const session = await Session.create({ root, ...(config === undefined ? {} : { config }) });
  try {
    const path = join(root, fix.file), before = await readSource(root, path);
    try { await session.swap({ file: path, hash: before.hash, line: fix.line, column: fix.column, from: fix.from, to: fix.to }); }
    catch (error) {
      // the element moved or changed since the page was read: say so, and how to get a fresh fix
      if (error instanceof UsageError && /does not identify|is not written on this element|no longer|changed since/i.test(error.message)) throw new UsageError(`${fix.file}:${fix.line} changed since the page check, so nothing was written (${error.message.replace(/\.$/, '')}). Run the page check again for a fresh fix.`, 'stale-file');
      throw error;
    }
    const after = await readSource(root, path);
    const entry: Kept = { id: randomBytes(4).toString('hex'), at: new Date().toISOString(), label: `${fix.from ? `${fix.from} → ${fix.to}` : `+${fix.to}`} at ${fix.file}:${fix.line}`, files: [{ file: fix.file, before: before.text, hashAfter: after.hash }] };
    await keep(root, [...await history(root), entry]);
    delete kept[key];
    await writeFile(pageFixesFile(root), JSON.stringify(kept));
    const shots = await pictures(root, key, fix);
    return [`Applied ${fix.from ? `${fix.from} → ${fix.to}` : `+${fix.to}`} at ${fix.file}:${fix.line} (${fix.rule}).`,
      ...shots, `Undo: plumber undo ${entry.id}`, 'Next: look at the pictures, or run the page check again.', ''].join('\n');
  } finally { await session.close(); }
}

/**
 * The element before (taken by the page check) and after (taken now, once the dev server has the change): two files
 * an agent can open to see what it did. A picture that can't be taken is said, never a failed apply.
 */
async function pictures(root: string, key: string, fix: PageFix): Promise<string[]> {
  const { shotsDirectory, shoot, launchChromium } = await import('./craft-run.js');
  const before = join(shotsDirectory(root), `${key}-before.png`), after = join(shotsDirectory(root), `${key}-after.png`);
  const had = await readFile(before).then(() => true, () => false);
  if (!fix.url || !fix.path) return had ? [`Before: ${before}`] : [];
  try {
    const browser = await launchChromium();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      // the dev server's hot update lands in well under this; a full reload is waited for by goto itself
      await new Promise(done => setTimeout(done, 800));
      await page.goto(fix.url, { waitUntil: 'load', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await shoot(page, fix.path, after);
    } finally { await browser.close(); }
    return [...had ? [`Before: ${before}`] : [], `After:  ${after}`];
  } catch (error) {
    return [...had ? [`Before: ${before}`] : [], `No after picture: ${String((error as Error).message ?? error).split('\n')[0]}`];
  }
}

export async function applyGroup(command: ApplyCommand): Promise<string> {
  if (isPageKey(command.key)) return applyPageFix(command);
  const { root, config, key, token } = command;
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
