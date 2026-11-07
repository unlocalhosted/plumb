// @ts-check
// Repo root, `.state/config.json`, and file discovery (spec sections 0 and 7.4).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

export class UsageError extends Error {
  /** @param {string} code @param {string} message @param {Record<string, unknown>} [extra] */
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

/** @param {string} cwd @param {string | undefined} rootFlag */
export function findRoot(cwd, rootFlag) {
  if (rootFlag) {
    const root = resolve(cwd, rootFlag);
    if (!existsSync(join(root, '.state', 'config.json'))) throw new UsageError('no-config', `No .state/config.json in ${rootFlag}.`);
    return root;
  }
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, '.state', 'config.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new UsageError('no-config', 'No .state/config.json in this directory or any parent; pass --root <dir>.');
    dir = parent;
  }
}

/** @param {string} root */
export function loadConfig(root) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(root, '.state', 'config.json'), 'utf8'));
  } catch (error) {
    throw new UsageError('no-config', `.state/config.json is not valid JSON: ${/** @type {Error} */ (error).message}`);
  }
  const include = Array.isArray(raw.include) ? raw.include.map(String) : [];
  const exclude = Array.isArray(raw.exclude) ? raw.exclude.map(String) : [];
  if (!include.length) throw new UsageError('no-config', '.state/config.json has no `include` patterns.');
  return { include, exclude };
}

/** @param {string} path */
export function slashes(path) {
  return sep === '/' ? path : path.split(sep).join('/');
}

/** Repo-relative, forward-slash path of a file given on the command line. @param {string} root @param {string} cwd @param {string} file */
export function relPath(root, cwd, file) {
  return slashes(relative(root, resolve(cwd, file)));
}

/** @param {{ include: string[], exclude: string[] }} config */
export async function includeMatcher(config) {
  const { default: picomatch } = await import('picomatch');
  const inc = picomatch(config.include);
  const exc = config.exclude.length ? picomatch(config.exclude) : () => false;
  return (/** @type {string} */ rel) => inc(rel) && !exc(rel);
}

/** Every file in `include` minus `exclude`, repo-relative, sorted. @param {string} root @param {{ include: string[], exclude: string[] }} config */
export async function discover(root, config) {
  const { glob } = await import('tinyglobby');
  const files = await glob(config.include, { cwd: root, ignore: config.exclude, onlyFiles: true });
  return files.map(slashes).sort();
}

/** Only the included files whose text contains `@machine`, with their text. @param {string} root @param {string[]} files */
export function withMachines(root, files) {
  /** @type {{ file: string, text: string }[]} */
  const out = [];
  for (const file of files) {
    const abs = join(root, file);
    if (!statSync(abs, { throwIfNoEntry: false })?.isFile()) continue;
    const text = readFileSync(abs, 'utf8');
    if (text.includes('@machine')) out.push({ file, text });
  }
  return out;
}
