import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { parseSync } from 'oxc-parser';
import { moduleImports } from './collect/modules.js';
import type { ModuleImport } from './collect/modules.js';
import { projectModules } from './session/modules.js';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { appTailwindEntry } from './collect/entries.js';
import { unreadable } from './diagnostics.js';
import type { Finding } from './report.js';
import { matchesPath } from './collect/pattern.js';
import { glob } from 'tinyglobby';
import { containsPath, ownSourcePath, sourceBoundary, sourceSelectors } from './source-boundary.js';
import { linkedSourceFolders, sourceIdentity } from './source-identity.js';
import { projectIgnore, staticIgnore } from './project-facts/checkouts.js';
import { tailwindInstalled } from './project-facts/index.js';
import { userMessage, UsageError } from './errors.js';
import type { PlumbConfig } from './config.js';
import type { FileCounts, Report } from './report.js';

/** The static part; `projectIgnore(root)` adds the nested checkouts (worktrees, submodules, vendored clones). */
export const ignore = staticIgnore;
// With no `source` configured, your code is what the rule says it is (src/source-identity.ts): every file under the
// root that is neither installed nor generated, whatever folder it sits in (src/, app/, components/, lib/, registry/…),
// plus your own code reached through links. `source` in the config is the override.
export const defaultSource = ['**/*.{tsx,jsx,ts,js,css}'];
/** With no `source` configured: the app's own files, plus its own code reached through links (a workspace package, a tsconfig alias), each inside the boundary. */
export async function defaultSourceSelectors(root: string): Promise<string[]> {
  const boundary = sourceBoundary(root);
  const linked = (await linkedSourceFolders(root)).filter(folder => containsPath(boundary, folder));
  return [...defaultSource, ...linked.map(folder => `${relative(root, folder).replaceAll('\\', '/')}/**/*.{tsx,jsx,ts,js,css}`)];
}
const tailwindImport = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']/;

/** Warm hosts already own membership; filter their retained names instead of crawling again. */
export async function matchProjectFiles(root: string, patterns: string | string[], known?: readonly string[]): Promise<string[]> {
  const ignore = await projectIgnore(root);
  if (!known) return glob(patterns, { cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false });
  const selectors = typeof patterns === 'string' ? [patterns] : patterns;
  const positive = selectors.filter(pattern => !pattern.startsWith('!')), negative = selectors.filter(pattern => pattern.startsWith('!')).map(pattern => pattern.slice(1));
  const matches = known.filter(file => {
    const path = relative(root, file);
    const matches = (pattern: string) => matchesPath(isAbsolute(pattern) ? file : path, pattern) || matchesPath(isAbsolute(pattern) ? file : path, pattern + '/**');
    // A linked folder above the root is matched by its `../` path; the ignore list reads it from its first real segment.
    const within = path.replace(/^(?:\.\.\/)+/, '');
    return !ignore.some(pattern => matchesPath(path, pattern) || matchesPath(within, pattern)) && positive.some(matches) && !negative.some(matches);
  });
  // A changed config can introduce an external source location before its
  // worker has published those locations to the Session. Discover that bounded
  // input once; never fall back to a whole-project source inventory.
  const external = selectors.filter(pattern => { const path = relative(root, resolve(root, pattern)); return path === '..' || path.startsWith('..' + sep) || isAbsolute(path); });
  if (external.length) matches.push(...await glob(external, { cwd: root, ignore, absolute: true, dot: true, followSymbolicLinks: false }));
  return [...new Set(matches)];
}
/** Every stylesheet that imports Tailwind, sorted: the entry when there is one, a choice when there are several. */
export async function tailwindEntryCandidates(root: string, diagnostics: Finding[] = [], known?: readonly string[]): Promise<string[]> {
  const candidates: string[] = [];
  const files = await matchProjectFiles(root, '**/*.css', known);
  for (const file of files.sort()) {
    try {
      const css = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
      if (tailwindImport.test(css)) candidates.push(file);
    } catch (error) { diagnostics.push(unreadable(file, file, error)); }
  }
  return candidates;
}
async function entryCss(root: string, diagnostics: Finding[], inputs: string[], css?: string, known?: readonly string[]): Promise<string | null> {
  if (css !== undefined) {
    const path = resolve(root, css);
    try {
      if (extname(path) !== '.css' || !(await stat(path)).isFile()) {
        throw new Error('expected a .css file');
      }
      await readFile(path, 'utf8');
    } catch (error) {
      throw new UsageError(`Set css to a readable .css file in plumber.config.ts: ${path}.\n  ${userMessage(error).replace(`${path}: `, '')}\n  → \${EDITOR:-vi} plumber.config.ts`);
    }
    return path;
  }
  const candidates = await tailwindEntryCandidates(root, diagnostics, known);
  if (candidates.length > 1) {
    inputs.push(...candidates);
    const entry = await appTailwindEntry(root, candidates, diagnostics, inputs);
    if (entry) return entry;
    throw new UsageError(`Multiple Tailwind entry files: ${candidates.join(', ')}; set css in plumber.config.ts to one of them.\n  → \${EDITOR:-vi} plumber.config.ts`);
  }
  return candidates[0] ?? null;
}

async function tailwindVersion(entry: string | null): Promise<string | null> {
  if (entry === null) return null;
  const installed = tailwindInstalled(dirname(entry));
  if (installed instanceof Error) {
    if ((installed as NodeJS.ErrnoException).code) throw installed;
    throw new UsageError(`Fix tailwindcss/package.json: ${installed.message.replace(/^Tailwind package\.json has no version \((.*)\)\.$/, 'version must be a string at $1.')}`);
  }
  return installed;
}

export async function discoverProject(root: string, config: PlumbConfig, known?: readonly string[]): Promise<{
  diagnostics: Finding[]; inputs: string[]; tailwind: Report['tailwind']; files: FileCounts;
}> {
  const diagnostics: Finding[] = [], inputs: string[] = [];
  const entry = await entryCss(root, diagnostics, inputs, config.css, known);
  const files = await projectSourceFiles(root, config, known);
  const counts: FileCounts = { tsx: 0, jsx: 0, css: 0, other: 0 };
  for (const file of files) {
    const extension = extname(file).slice(1);
    if (extension === 'tsx' || extension === 'jsx' || extension === 'css') counts[extension]++;
    else counts.other++;
  }
  return { diagnostics, inputs: [...new Set(inputs)], tailwind: { entry, version: await tailwindVersion(entry) }, files: counts };
}

export async function projectSourceFiles(root: string, config: PlumbConfig, known?: readonly string[]): Promise<string[]> {
  const files = await matchProjectFiles(root, sourceSelectors(root, config.source ?? await defaultSourceSelectors(root)), known);
  // with no `source`, the rule decides (a git-ignored or installed file under the root is not yours); a configured
  // selection is the override and is taken as written
  const owned = await Promise.all(files.map(async file => await ownSourcePath(root, file) && (config.source !== undefined || await sourceIdentity(root, file) !== null)));
  const yours = files.filter((_, index) => owned[index]);
  return (config.source === undefined ? defaultSelection(root, yours) : yours).sort();
}

// The rest of the default selection, over files that are yours by the rule. A tool's config file (vite.config.ts,
// tailwind.config.js, plumber.config.ts, eslint.config.mjs…) configures a tool: it is never your code. A dot folder
// (.storybook/, .theme/, .github/…) is a tool's too, until the app's own import graph reaches a file in it: that file is
// yours then, the way a linked package's are. `source` in the config is the override and never comes here.
const toolConfig = /(?:^|\/)[^/]*\.config\.[cm]?[jt]s$/;
const dotted = (path: string) => path.split('/').some(segment => segment !== '..' && segment !== '.' && segment.startsWith('.'));
const moduleFile = (file: string) => /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file);
function defaultSelection(root: string, files: string[]): string[] {
  const path = (file: string) => relative(root, file).replaceAll('\\', '/');
  const kept = files.filter(file => !toolConfig.test(path(file)));
  const hidden = new Set(kept.filter(file => dotted(path(file))));
  if (!hidden.size) return kept;
  const plain = kept.filter(file => !hidden.has(file));
  // the walk: every import written in a plain module, resolved the way the project's bundler resolves it; a dotted file
  // it lands on is yours, and its own imports are followed in turn. Only run when a dot folder has candidates.
  const texts = new Map<string, string | undefined>();
  const read = (file: string) => { if (!texts.has(file)) { try { texts.set(file, readFileSync(file, 'utf8')); } catch { texts.set(file, undefined); } } return texts.get(file); };
  const resolveModule = projectModules(root, read);
  const reached = new Set<string>();
  const queue = plain.filter(moduleFile);
  for (let index = 0; index < queue.length; index++) {
    const file = queue[index]!, text = read(file);
    if (text === undefined) continue;
    let edges: ModuleImport[];
    try { edges = moduleImports(parseSync(file, text).module, text); } catch { continue; }
    for (const edge of edges) {
      const target = resolveModule(file, edge.specifier)?.path ?? (edge.specifier.startsWith('.') ? resolve(dirname(file), edge.specifier) : undefined);
      if (target === undefined || !hidden.has(target) || reached.has(target)) continue;
      reached.add(target);
      if (moduleFile(target)) queue.push(target);
    }
  }
  return kept.filter(file => !hidden.has(file) || reached.has(file));
}

export async function sourceFiles(root: string, config: PlumbConfig): Promise<string[]> {
  return (await projectSourceFiles(root, config)).filter(file => /\.[jt]sx?$/.test(file));
}
