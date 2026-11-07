// Shared by the sm-*.test.mjs files: a temporary repo root with its own `.state/config.json`, and the real CLI run on it.
// No module of the tool is imported here (spec section 9).
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BIN = fileURLToPath(new URL('../tools/sm/bin.mjs', import.meta.url));
export const FIXTURES = fileURLToPath(new URL('./fixtures/sm/', import.meta.url));

/** @param {...string} parts */
export function fixture(...parts) {
  return join(FIXTURES, ...parts);
}

/**
 * A temp repo root holding the given files. `files` maps a name inside the root to a fixture path (copied) or `{ text }`.
 * @param {Record<string, string | { text: string }>} files
 * @param {{ config?: object | null }} [options]
 */
export function repo(files, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'sm-'));
  if (options.config !== null) {
    mkdirSync(join(root, '.state'));
    writeFileSync(join(root, '.state', 'config.json'), JSON.stringify(options.config ?? { schema: 1, include: ['*.js', '*.ts'], exclude: [] }));
  }
  for (const [name, source] of Object.entries(files)) {
    if (typeof source === 'string') copyFileSync(source, join(root, name));
    else writeFileSync(join(root, name), source.text);
  }
  return root;
}

/** @param {string} root */
export function remove(root) {
  rmSync(root, { recursive: true, force: true });
}

/** Runs `node tools/sm/bin.mjs <args>` with the temp root as cwd. @param {string} root @param {string[]} args @param {object} [options] */
export function sm(root, args, options = {}) {
  const result = spawnSync(process.execPath, [BIN, ...args], { cwd: root, encoding: 'utf8', ...options });
  let json = null;
  try { json = JSON.parse(result.stdout); } catch { /* not JSON: the test will say so */ }
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

/** 1-based number of the first line of `file` containing `snippet`. @param {string} file @param {string} snippet */
export function lineOf(file, snippet) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const index = lines.findIndex(line => line.includes(snippet));
  if (index === -1) throw new Error(`${file} has no line containing ${JSON.stringify(snippet)}`);
  return index + 1;
}

/** The JSON text with keys sorted at every level, the way the CLI must print it. @param {unknown} value */
export function sorted(value) {
  return JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(k => [k, v[k]])) : v), 2) + '\n';
}
