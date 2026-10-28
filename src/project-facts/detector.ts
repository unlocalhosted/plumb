import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import type { Claim, Evidence } from './facts.js';
import { evidence, unknownClaim } from './facts.js';

export interface PackageJson {
  name?: string;
  packageManager?: unknown;
  workspaces?: unknown;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/** What a detector may look at: one folder, read through a per-pass cache. Reads are sync so facts can serve sync callers. */
export interface Context {
  root: string;
  /** The file's text, or undefined when it does not exist. Any other failure is an Error. */
  read(file: string): string | undefined | Error;
  /** Whether a file or folder is there. Only detectors may ask this (R6); they still claim nothing from presence alone (R1). */
  exists(file: string): boolean;
  /** The root's package.json parsed once; undefined when absent; an Error when unreadable (R2). */
  manifest(): PackageJson | undefined | Error;
  /** All dependency ranges of the root manifest, every section merged. */
  dependencies(): Record<string, string>;
  /** Stylesheets under the root's source folders (bounded, membership applied); only the styling detectors read them. */
  cssFiles?: string[];
  /** Source modules under the root's source folders (bounded, membership applied); detectors scan them for import sites. */
  sourceFiles?: string[];
  /** A file relative to the root, for evidence. */
  file(path: string): string;
  evidence(file: string, line: number, text: string): Evidence;
}

export type Claims = Record<string, Claim<unknown>[]>;
export interface Detector {
  id: string;
  /** Files it may open, relative to the folder; declared for doctor. */
  reads: string[];
  detect(ctx: Context): Claims;
}

export function createContext(root: string, lists: { cssFiles?: string[]; sourceFiles?: string[] } = {}): Context {
  const files = new Map<string, string | undefined | Error>();
  let parsed: PackageJson | undefined | Error | null = null;
  const ctx: Context = {
    root, ...lists,
    read(file) {
      const path = isAbsolute(file) ? file : join(root, file);
      if (!files.has(path)) {
        try { files.set(path, readFileSync(path, 'utf8')); }
        catch (error) { files.set(path, (error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR' ? undefined : error as Error); }
      }
      return files.get(path);
    },
    exists(file) {
      try { statSync(isAbsolute(file) ? file : join(root, file)); return true; } catch { return false; }
    },
    manifest() {
      if (parsed !== null) return parsed;
      const text = ctx.read('package.json');
      if (text === undefined || text instanceof Error) return parsed = text;
      try {
        const value: unknown = JSON.parse(text);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SyntaxError('Expected an object');
        return parsed = value as PackageJson;
      } catch (error) { return parsed = error as Error; }
    },
    dependencies() {
      const manifest = ctx.manifest();
      if (!manifest || manifest instanceof Error) return {};
      return { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies };
    },
    file: path => (isAbsolute(path) ? relative(root, path) : path).replaceAll('\\', '/') || '.',
    evidence: (file, line, text) => evidence(ctx.file(file), line, text),
  };
  return ctx;
}

/** The claim a detector makes when a file it reads will not parse: nothing decided, the reason kept. */
export const unreadable = (ctx: Context, file: string, error: unknown, detector: string) =>
  unknownClaim(ctx.file(file) === 'package.json' ? [ctx.evidence(file, 1, `could not parse package.json: ${error instanceof SyntaxError ? 'not valid JSON' : String((error as Error).message ?? error)}`)] : [ctx.evidence(file, 1, `could not parse: ${String((error as Error).message ?? error)}`)], detector);

/** Line of the first match of `pattern` in `text`, 1-based; 1 when absent. */
export function lineOf(text: string, pattern: RegExp | string): number {
  const index = typeof pattern === 'string' ? text.indexOf(pattern) : text.search(pattern);
  return index < 0 ? 1 : text.slice(0, index).split('\n').length;
}

/** Run a registry over one context and gather claims per fact, in registry order. */
export function runRegistry(registry: readonly Detector[], ctx: Context): Claims {
  const claims: Claims = {};
  for (const detector of registry) {
    let result: Claims;
    try { result = detector.detect(ctx); }
    catch (error) { result = { [detector.id.split('.')[0]!]: [unknownClaim([ctx.evidence(detector.reads[0] ?? 'package.json', 1, `${detector.id}: ${String((error as Error).message ?? error)}`)], detector.id)] }; }
    for (const [fact, list] of Object.entries(result)) (claims[fact] ??= []).push(...list);
  }
  return claims;
}

/** The first source file that imports or requires a module matching `specifier`, with its line: the evidence a person can open. */
export function importSite(ctx: Context, specifier: RegExp): Evidence | undefined {
  for (const file of ctx.sourceFiles ?? []) {
    const text = ctx.read(file);
    if (typeof text !== 'string') continue;
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!;
      const match = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/.exec(line);
      if (match && specifier.test(match[1]!)) return ctx.evidence(file, index + 1, line.trim().slice(0, 80));
    }
  }
  return undefined;
}
