// One detection pass, one typed, evidence-carrying object (docs/briefs/project-detection-design.md section 2).
// Every entry point reads `value`; only the detectors in this folder read the disk for these questions (R6).
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import type { Fact, Evidence } from './facts.js';
import { known, resolveFact, unknown } from './facts.js';
import type { Claim } from './facts.js';
import { createContext, runRegistry } from './detector.js';
import type { Context, Detector, PackageJson } from './detector.js';
import { forgetCheckouts, scanCheckouts, staticIgnore } from './checkouts.js';
import type { Checkout } from './checkouts.js';
import { workspaceManifest } from './project/workspace-manifest.js';
import type { Workspace } from './project/workspace-manifest.js';
import { workspacePnpm } from './project/workspace-pnpm.js';
import { pmManifest } from './project/pm-manifest.js';
import type { PackageManager } from './project/pm-manifest.js';
import { pmLockfile } from './project/pm-lockfile.js';

export type { Fact, Evidence, Claim, Source } from './facts.js';
export type { Workspace, PackageManager, Checkout };

export interface App { path: string; kind: string; tailwind: string | null }
export interface ProjectFacts {
  /** The app folder analysis runs in: the nearest folder with package.json, or the override. */
  root: Fact<string>;
  /** The outermost folder source globs may reach: the nearest declared workspace, else the checkout, else the root. */
  boundary: Fact<string>;
  /** The Git checkout the root sits in (top level); CI and CODEOWNERS use it. */
  repo: Fact<string>;
  /** `null` with a declared source = a workspace file that declares no packages: a single project. */
  workspace: Fact<Workspace>;
  /** The React apps under the workspace patterns; empty for a single project. */
  apps: Fact<App[]>;
  packageManager: Fact<PackageManager>;
  /** Folders under the root that are their own checkout; out of membership. */
  checkouts: Fact<Checkout[]>;
}
export interface Overrides { root?: string }

/** Registry order is precedence within one source (R3). */
export const projectRegistry: readonly Detector[] = [workspaceManifest, workspacePnpm, pmManifest, pmLockfile];

const workspaceDetectors = projectRegistry.filter(item => item.id.startsWith('workspace.'));
const pmDetectors = projectRegistry.filter(item => item.id.startsWith('pm.'));
const contexts = new Map<string, Context>();
const context = (folder: string) => { let ctx = contexts.get(folder); if (!ctx) { ctx = createContext(folder); contexts.set(folder, ctx); } return ctx; };
const facts = new Map<string, Promise<ProjectFacts>>();
const home = () => { try { return realpathSync(homedir()); } catch { return homedir(); } };
/** A home directory is a boundary even when HOME belongs to another user. */
const atHome = (folder: string) => folder === home() || folder === homedir() || dirname(folder) === folder || /^(?:\/Users|\/home)\/[^/]+$/.test(folder);

/** The session watcher calls this when the tree changes; a CLI run never needs to. */
export function forgetProjectFacts(): void { contexts.clear(); facts.clear(); forgetCheckouts(); }

/** Walk up from `start` to the nearest folder with package.json; null at the home folder or the filesystem root. */
export function findRoot(start: string): string | null {
  for (let folder = resolve(start);; folder = dirname(folder)) {
    if (context(folder).exists('package.json')) return folder;
    if (atHome(folder)) return null;
  }
}

/** The declared workspace at one folder, from the registry: a claim with a value, a declared null, unknown, or nothing. */
function workspaceAt(folder: string): Fact<Workspace> {
  const claims = runRegistry(workspaceDetectors, context(folder)).workspace as Claim<Workspace>[] | undefined;
  return claims?.length ? resolveFact(claims) : unknown([]);
}

/** Nearest declared workspace wins; otherwise the Git checkout bounds shared source; otherwise the root itself. Sync for hot paths. */
export function boundaryOf(root: string): Fact<string> {
  for (let at = resolve(root);; at = dirname(at)) {
    const workspace = workspaceAt(at);
    if (workspace.value) return known(at, 'declared', workspace.evidence.map(item => ({ ...item, file: rel(root, at, item.file) })));
    if (context(at).exists('.git')) return known(at, 'observed', [{ file: rel(root, at, '.git'), line: 1, text: 'git checkout' }]);
    if (dirname(at) === at) return known(resolve(root), 'inferred', [{ file: 'package.json', line: 1, text: 'no workspace or git checkout above' }]);
  }
}
/** The Git top level: the nearest folder (inclusive) with a `.git` entry. */
export function repoOf(root: string): Fact<string> {
  for (let at = resolve(root);; at = dirname(at)) {
    if (context(at).exists('.git')) return known(at, 'observed', [{ file: rel(root, at, '.git'), line: 1, text: 'git checkout' }]);
    if (dirname(at) === at) return unknown([{ file: 'package.json', line: 1, text: 'no .git above' }]);
  }
}
/** The package manager, sync for messages: declared `packageManager` beats the nearest lockfile; npm when neither. */
export function packageManagerOf(root: string): Fact<PackageManager> {
  const claims = runRegistry(pmDetectors, context(resolve(root))).packageManager as Claim<PackageManager>[] | undefined;
  const fact = claims?.length ? resolveFact(claims) : unknown<PackageManager>([]);
  return fact.value ? fact : known<PackageManager>('npm', 'inferred', [{ file: 'package.json', line: 1, text: 'no lockfile or packageManager field; npm by default' }]);
}
const rel = (root: string, folder: string, file: string) => relative(root, join(folder, file)).replaceAll('\\', '/') || '.';

export const manifestAt = (folder: string): PackageJson | undefined | Error => context(folder).manifest();

/** The React apps a declared workspace holds: manifests under its patterns that depend on react or next. */
async function appsOf(root: string, workspace: Workspace): Promise<App[]> {
  const selectors = workspace.patterns.map(pattern => `${pattern.replace(/\/$/, '')}/package.json`);
  if (!selectors.length) return [];
  // A submodule under apps/ is an app of this workspace and its own project inside; only the static folders are skipped here.
  const manifests = await glob(selectors, { cwd: root, ignore: staticIgnore, absolute: true, followSymbolicLinks: false });
  const apps: App[] = [];
  const { resolvedTailwind } = await import('../setup-messages.js');
  for (const file of manifests.sort()) {
    if (file === resolve(root, 'package.json')) continue;
    const folder = dirname(file), child = context(folder).manifest();
    if (!child || child instanceof Error) continue;
    const dependencies = { ...child.dependencies, ...child.devDependencies, ...child.peerDependencies };
    if (!dependencies.react && !dependencies.next) continue;
    const path = relative(root, folder).replaceAll('\\', '/');
    // Do not list a nested package twice when its parent already owns an app.
    if (apps.some(app => path.startsWith(app.path + '/'))) continue;
    const version = await resolvedTailwind(folder).catch(() => null);
    const declared = dependencies.tailwindcss?.match(/\d+/)?.[0];
    apps.push({ path, kind: dependencies.next ? 'Next.js' : dependencies.vite ? 'Vite' : 'library', tailwind: version?.split('.')[0] ?? declared ?? null });
  }
  return apps;
}

/** The facts for the project at `start`, memoised for the process (R5). Never throws (section 3 invariant). */
export function projectFacts(start: string, overrides: Overrides = {}): Promise<ProjectFacts> {
  const key = `${resolve(start)}\0${JSON.stringify(overrides)}`;
  let pending = facts.get(key);
  if (!pending) { pending = compute(start, overrides); facts.set(key, pending); pending.catch(() => facts.delete(key)); }
  return pending;
}

async function compute(start: string, overrides: Overrides): Promise<ProjectFacts> {
  let root: Fact<string>;
  if (overrides.root !== undefined) {
    const folder = resolve(overrides.root);
    root = known(folder, 'override', [{ file: 'package.json', line: 1, text: context(folder).exists('package.json') ? '--root' : '--root: no package.json here' }]);
  } else {
    const found = findRoot(start);
    root = found === null ? unknown([{ file: '.', line: 1, text: 'no package.json here or above, up to the home folder' }]) :
      known(found, found === resolve(start) ? 'declared' : 'inferred', [{ file: 'package.json', line: 1, text: found === resolve(start) ? 'package.json' : `walked up ${relative(start, found) || '.'}` }]);
  }
  const folder = root.value ?? resolve(start);
  const workspace = workspaceAt(folder);
  const apps: Fact<App[]> = workspace.value ? known(await appsOf(folder, workspace.value), 'inferred', workspace.evidence) :
    workspace.source === 'unknown' ? unknown(workspace.evidence) : known<App[]>([], 'inferred', workspace.evidence);
  const checkouts = await scanCheckouts(folder);
  return {
    root, boundary: boundaryOf(folder), repo: repoOf(folder), workspace, apps, packageManager: packageManagerOf(folder),
    checkouts: known(checkouts, checkouts.length ? (checkouts.every(item => item.source === 'declared') ? 'declared' : 'observed') : 'inferred', checkouts.length ? checkouts.map(item => item.evidence) : [{ file: '.', line: 1, text: 'no nested checkout' }]),
  };
}

