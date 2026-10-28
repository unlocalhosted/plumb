import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/** Folders that never hold this project's source; also where the checkout scan does not look. */
export const staticIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.git/**', '**/.plumber/cache/**', '**/.plumb/cache/**'];
const skipped = new Set(['node_modules', 'dist', 'build', '.next', '.git', '.cache', '.plumb-cache']);
const depthBound = 6;

export interface Checkout {
  /** Relative to the root, `/`-separated. */
  path: string;
  kind: 'worktree' | 'submodule' | 'clone';
  /** `observed` for a `.git` entry on disk; `declared` for a `.gitmodules` path not yet checked out. */
  source: 'observed' | 'declared';
  evidence: { file: string; line: number; text: string };
}

const memo = new Map<string, { at: number; scan: Promise<Checkout[]> }>();
const ttl = 2000;
/** The watcher calls this when the tree changes; a CLI run never needs to. */
export function forgetCheckouts(root?: string): void { if (root === undefined) memo.clear(); else memo.delete(root); }

/**
 * Every folder under `root` that is its own checkout: a nested worktree, a submodule or a vendored clone, each
 * marked by a `.git` entry (file or directory). The same signal that fences the walk up fences the walk down.
 * Bounded to six levels and never enters the static ignore folders; a checkout's own tree is not entered either.
 */
export function scanCheckouts(root: string): Promise<Checkout[]> {
  let entry = memo.get(root);
  if (!entry || Date.now() - entry.at > ttl) { entry = { at: Date.now(), scan: walk(root) }; memo.set(root, entry); entry.scan.catch(() => memo.delete(root)); }
  return entry.scan;
}

async function walk(root: string): Promise<Checkout[]> {
  const found: Checkout[] = [];
  const declared = await submodulePaths(root);
  const visit = async (folder: string, depth: number): Promise<void> => {
    let entries;
    try { entries = await readdir(folder, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || skipped.has(entry.name)) continue;
      const path = join(folder, entry.name), git = join(path, '.git');
      const marker = await gitEntry(git);
      if (marker) {
        const rel = relative(root, path).replaceAll('\\', '/');
        const submodule = declared.has(rel) || /\/\.git\/modules\//.test(marker.text);
        found.push({ path: rel, kind: submodule ? 'submodule' : marker.directory ? 'clone' : 'worktree', source: 'observed',
          evidence: { file: `${rel}/.git`, line: 1, text: marker.directory ? 'git directory' : marker.text } });
        continue;
      }
      if (depth < depthBound) await visit(path, depth + 1);
    }
  };
  await visit(root, 1);
  for (const [path, line] of declared) {
    if (found.some(item => item.path === path)) continue;
    found.push({ path, kind: 'submodule', source: 'declared', evidence: { file: '.gitmodules', line, text: `path = ${path}` } });
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** A real checkout, not a folder that happens to be named .git: a file that says `gitdir:`, or a directory with a HEAD. */
async function gitEntry(git: string): Promise<{ directory: boolean; text: string } | undefined> {
  try {
    const text = await readFile(git, 'utf8');
    const first = text.split('\n')[0]!.trim();
    return first.startsWith('gitdir:') ? { directory: false, text: first } : undefined;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EISDIR') return undefined;
    try { await readFile(join(git, 'HEAD'), 'utf8'); return { directory: true, text: '' }; } catch { return undefined; }
  }
}

/** `.gitmodules#path` entries with their line numbers: a submodule is declared before it is initialised. */
async function submodulePaths(root: string): Promise<Map<string, number>> {
  const paths = new Map<string, number>();
  let text: string;
  try { text = await readFile(join(root, '.gitmodules'), 'utf8'); } catch { return paths; }
  text.split('\n').forEach((line, index) => {
    const match = /^\s*path\s*=\s*(.+?)\s*$/.exec(line);
    if (match) paths.set(match[1]!.replace(/\/$/, ''), index + 1);
  });
  return paths;
}

/** The glob ignore list for this project: the static folders plus every nested checkout. */
export async function projectIgnore(root: string): Promise<string[]> {
  const checkouts = await scanCheckouts(root);
  return [...staticIgnore, ...checkouts.map(item => `${item.path}/**`)];
}
