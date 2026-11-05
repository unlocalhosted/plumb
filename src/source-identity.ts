// Which files are yours, and the one name a stamp gives each of them (docs/briefs/stamping-everywhere.md, "Codebase
// shapes"). The Vite transform, the Next loader and the server's resolve all answer through here, so a stamp written by
// one host is read back by the server the same way for every app in the repository.
import { readFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { matchesPath } from './collect/pattern.js';
import type { PlumbConfig } from './config.js';
import { repoOf } from './project-facts/index.js';
import { containsPath } from './source-boundary.js';

/** A file that is yours: where it really is, and its `/`-separated path from the repository root, as a stamp names it. */
export interface SourceIdentity { file: string; path: string }

/** Stamps name files from here: the Git top level of the app, or the app's own root when there is no checkout. */
export function repositoryRoot(root: string): string { return repoOf(root).value ?? resolve(root); }

// Installed means a package manager put it there: an unlinked node_modules package, pnpm's store, Yarn's cache or
// Plug'n'Play data. Generated means a build wrote it. Both are judged on the real path, so a workspace member reached
// through a node_modules link is still yours, and a store copy linked into src/ is still not.
const installed = /(?:^|\/)(?:node_modules|\.pnpm|\.pnpm-store|\.yarn\/(?:cache|unplugged|__virtual__)|\.pnp\.(?:cjs|js|data\.json))(?:\/|$)/;
const generated = /(?:^|\/)(?:\.git|dist|build|out|coverage|\.next|\.nuxt|\.turbo|\.nx|\.cache|\.vite-cache|\.plumb-cache|\.plumber\/cache|\.plumb\/cache|bazel-(?:out|bin|testlogs))(?:\/|$)/;

/**
 * The rule: a file is yours when its real path is inside the repository and it is neither installed nor generated
 * (ignored by git, or under a known output folder). Null when it is not. `folder` may be a directory, for a linked
 * package as a whole.
 */
export async function sourceIdentity(root: string, file: string): Promise<SourceIdentity | null> {
  const repo = await realRepository(root);
  let real: string;
  try { real = await realpath(file); } catch { return null; }
  if (!containsPath(repo, real) || repo === real) return null;
  const path = relative(repo, real).split(sep).join('/');
  if (installed.test(path) || generated.test(path) || await gitIgnored(repo, path)) return null;
  return { file: real, path };
}

/**
 * What a host stamps: yours by the rule, named from the repository root. `source` in the config is the override: when
 * it is set, only its selection is stamped, and a selected file is named the same way.
 */
export async function stampedSource(root: string, file: string, config: PlumbConfig, selected: () => Promise<boolean>): Promise<SourceIdentity | null> {
  if (config.source !== undefined && !await selected()) return null;
  const identity = await sourceIdentity(root, file);
  if (identity || config.source === undefined) return identity;
  try { const real = await realpath(file); return { file: real, path: relative(await realRepository(root), real).split(sep).join('/') }; } catch { return null; }
}

const repositories = new Map<string, { at: number; real: Promise<string> }>();
const ttl = 2000;
async function realRepository(root: string): Promise<string> {
  const top = repositoryRoot(root);
  let entry = repositories.get(top);
  if (!entry || Date.now() - entry.at > ttl) { entry = { at: Date.now(), real: realpath(top).catch(() => top) }; repositories.set(top, entry); }
  return entry.real;
}

// Git's ignore rules, read in process: every transform asks, and a `git check-ignore` per file would cost more than
// the stamp. .gitignore files from the repository root down to the file's folder, plus .git/info/exclude; the last
// matching rule wins, a deeper file after a shallower one; a rule on a folder covers everything in it.
interface Rule { glob: string; negated: boolean; folderOnly: boolean }
const ignoreFiles = new Map<string, { at: number; rules: Promise<Rule[]> }>();
async function rulesIn(file: string): Promise<Rule[]> {
  let entry = ignoreFiles.get(file);
  if (!entry || Date.now() - entry.at > ttl) { entry = { at: Date.now(), rules: readFile(file, 'utf8').then(parseIgnore, () => []) }; ignoreFiles.set(file, entry); }
  return entry.rules;
}
function parseIgnore(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.replace(/\r$/, '').replace(/(?<!\\)\s+$/, '');
    if (!line || line.startsWith('#')) continue;
    const negated = line.startsWith('!'); if (negated) line = line.slice(1);
    const folderOnly = line.endsWith('/'); if (folderOnly) line = line.slice(0, -1);
    const anchored = line.includes('/'); line = line.replace(/^\//, '');
    rules.push({ glob: anchored ? line : `**/${line}`, negated, folderOnly });
  }
  return rules;
}
async function gitIgnored(repo: string, path: string): Promise<boolean> {
  const folders = [''];
  for (const segment of path.split('/').slice(0, -1)) folders.push(folders.at(-1) ? `${folders.at(-1)}/${segment}` : segment);
  let ignored = false;
  const files = [join(repo, '.git/info/exclude'), ...folders.map(folder => join(repo, folder, '.gitignore'))];
  const bases = ['', ...folders];
  for (const [index, file] of files.entries()) {
    const base = bases[index]!, inside = base ? path.slice(base.length + 1) : path;
    const ancestors: string[] = [];
    for (const segment of inside.split('/').slice(0, -1)) ancestors.push(ancestors.length ? `${ancestors.at(-1)}/${segment}` : segment);
    for (const rule of await rulesIn(file)) {
      const hit = (!rule.folderOnly && matchesPath(inside, rule.glob)) || ancestors.some(folder => matchesPath(folder, rule.glob));
      if (hit) ignored = !rule.negated;
    }
  }
  return ignored;
}

/**
 * Your own code an app reaches through links, for the default `source` selection: workspace members and `file:`
 * packages linked into node_modules, and tsconfig path aliases that point into the repository. Each as a real folder
 * that is yours by the rule; never the app root itself or a folder above it.
 */
export async function linkedSourceFolders(root: string): Promise<string[]> {
  const folders = new Set<string>();
  const consider = async (candidate: string) => {
    const identity = await sourceIdentity(root, candidate);
    if (identity && !containsPath(identity.file, resolve(root))) folders.add(identity.file);
  };
  const manifest = await json(join(root, 'package.json')) as Record<string, Record<string, string> | undefined> | null;
  const names = new Set<string>();
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) for (const name of Object.keys(manifest?.[key] ?? {})) names.add(name);
  const top = repositoryRoot(root);
  for (const name of names) {
    // The package as the app resolves it: its own node_modules first, then each folder up to the repository root.
    for (let folder = resolve(root);; folder = dirname(folder)) {
      const candidate = join(folder, 'node_modules', name);
      if (await stat(candidate)) { await consider(candidate); break; }
      if (folder === top || dirname(folder) === folder) break;
    }
  }
  for (const target of await aliasTargets(root)) await consider(target);
  return [...folders].sort();
}
async function stat(path: string): Promise<boolean> { try { await realpath(path); return true; } catch { return false; } }
async function json(file: string): Promise<unknown> {
  try { return JSON.parse(stripComments(await readFile(file, 'utf8'))); } catch { return null; }
}
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'\\])\/\/.*$/gm, '$1').replace(/,(\s*[}\]])/g, '$1');
/** The folders tsconfig `paths` point at, resolved from `baseUrl` (else the tsconfig's folder); one `extends` level. */
async function aliasTargets(root: string, file = join(root, 'tsconfig.json'), depth = 0): Promise<string[]> {
  const config = await json(file) as { extends?: string; compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> } } | null;
  if (!config) return [];
  const options = config.compilerOptions ?? {};
  if (!options.paths && typeof config.extends === 'string' && config.extends.startsWith('.') && depth < 2) return aliasTargets(root, resolve(dirname(file), config.extends.endsWith('.json') ? config.extends : `${config.extends}.json`), depth + 1);
  const base = resolve(dirname(file), options.baseUrl ?? '.');
  return Object.values(options.paths ?? {}).flat().filter(target => typeof target === 'string').map(target => resolve(base, target.replace(/\/?\*.*$/, '')));
}
