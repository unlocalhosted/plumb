/**
 * SOURCE FILE · the one way bytes get into a file the user owns (docs/invariants/write-path-spec.md).
 *
 * Read: the bytes, decoded as UTF-8 with a fatal decoder, so a file that is not UTF-8 is refused rather than silently
 * rewritten with U+FFFD in it; the hash of that text; its line-ending style; whether it carries a BOM; its identity.
 * Write: the path contained inside the root (lexically, through every existing ancestor's real path, through no symbolic
 * link), the hash re-checked against the bytes on disk, inserted `\n` turned into the file's own line ending, the BOM
 * kept, the bytes published by a temp file and rename so no reader ever sees a half-written file, and the result
 * re-read and verified. A transaction journals several writes and puts them back on failure; a rollback that fails is
 * returned, never swallowed.
 */
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { link, lstat, mkdir, open, realpath, rename, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { FileHandle } from 'node:fs/promises';
import { sourceHash } from '../collect/cache.js';
import { errorMessage, UsageError } from '../errors.js';

export const staleFile = 'The file changed since the overlay read it. Read it again.';
export type Eol = 'lf' | 'crlf';
export interface Identity { dev: number; ino: number }
export interface SourceText { path: string; text: string; hash: string; eol: Eol; bom: boolean; identity: Identity; mode: number }
export interface WriteOptions {
  /** the hash the plan was built from; null creates the file, which must not exist */
  expectHash: string | null;
  /** the identity the plan was read from: a file saved anew by an editor since (a new inode, even with the same bytes) is refused */
  expectIdentity?: Identity;
  next: string;
  /** the lexical boundary a path may lie in when it is wider than the root (a workspace) */
  boundary?: string;
}
export interface Written { path: string; text: string; hash: string; identity: Identity; /** what the file held, null when it was created */ before: string | null }
export interface RollbackFailure { file: string; error: string }
export interface Rollback { restored: string[]; failed: RollbackFailure[] }

const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const BOM = '﻿';
const missing = (error: unknown) => ['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException)?.code ?? '');
/** The refusals every writer shares (the overlay and the CLI already know these words). */
export const symbolic = 'Apply cannot edit symbolic links or paths outside the project root.';
export const hardLink = 'Apply requires a regular source file without hard links.';

/** The text of a source file's bytes, or a refusal: nothing is decoded lossily. */
export function decodeSource(bytes: Uint8Array, name: string): string {
  try { return decoder.decode(bytes); }
  catch { throw new UsageError(`${name} isn't UTF-8, so nothing was written. Save it as UTF-8 first.`); }
}
/** `crlf` only when every line break is one: a mixed file is left mixed, since nothing outside the edit may change. */
export function eolOf(text: string): Eol {
  let crlf = 0, lf = 0;
  for (let at = text.indexOf('\n'); at >= 0; at = text.indexOf('\n', at + 1)) { if (text[at - 1] === '\r') crlf++; else lf++; }
  return crlf && !lf ? 'crlf' : 'lf';
}
/** Inserted text in the file's line endings. */
export function withEol(text: string, eol: Eol): string { return eol === 'crlf' ? text.replace(/\r?\n/g, '\r\n') : text; }

/**
 * The path, contained: inside the boundary lexically; its nearest existing ancestor's real path where the lexical path
 * says it is (so no symbolic link anywhere on the way, and no dangling one); the file itself, when it exists, likewise.
 */
export async function containedPath(root: string, file: string, boundary = root): Promise<{ path: string; inside: string; exists: boolean }> {
  const path = resolve(root, file), inside = relative(root, path).replaceAll('\\', '/'), within = relative(boundary, path);
  const name = inside || basename(path);
  if (!inside || within === '..' || within.startsWith('../') || within.startsWith('..\\') || isAbsolute(within)) throw new UsageError(`${name} is outside the project root, so nothing was written.`);
  const real = await realpath(root);
  let ancestor = path, exists = true;
  for (;;) {
    try {
      if (await realpath(ancestor) !== resolve(real, relative(root, ancestor))) throw new UsageError(symbolic);
      return { path, inside, exists };
    } catch (error) {
      if (!missing(error)) throw error;
      const entry = await lstat(ancestor).catch(reason => { if (missing(reason)) return undefined; throw reason; });
      if (entry?.isSymbolicLink()) throw new UsageError(symbolic);
      exists = false;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
    }
  }
}

async function readAll(handle: FileHandle, size: number): Promise<Buffer> {
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < bytes.length) { const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
  return bytes.subarray(0, offset);
}
function regular(info: { isFile(): boolean; nlink: number; isSymbolicLink(): boolean }): void {
  if (info.isSymbolicLink()) throw new UsageError(symbolic);
  if (!info.isFile() || info.nlink !== 1) throw new UsageError(hardLink);
}

/** A source file read for a write: through an O_NOFOLLOW handle whose identity is the path's, decoded fatally. */
export async function readSource(root: string, file: string, boundary?: string): Promise<SourceText> {
  const { path, inside } = await containedPath(root, file, boundary);
  const identity = await lstat(path);
  regular(identity);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (info.dev !== identity.dev || info.ino !== identity.ino) throw new UsageError(staleFile);
    const text = decodeSource(await readAll(handle, info.size), inside);
    return { path, text, hash: sourceHash(text), eol: eolOf(text), bom: text.startsWith(BOM), identity: { dev: identity.dev, ino: identity.ino }, mode: identity.mode & 0o7777 };
  } finally { await handle.close(); }
}
/** The same, or undefined when there is no such file. */
export async function readSourceIfExists(root: string, file: string, boundary?: string): Promise<SourceText | undefined> {
  try { return await readSource(root, file, boundary); }
  catch (error) { if (missing(error)) return undefined; throw error; }
}

/**
 * The write. The bytes go into a private temp file beside the target (its mode copied, fsynced), and the directory
 * entry is switched by rename once the target is checked to be what the hash and identity said it was; then the path
 * is read again through a fresh O_NOFOLLOW handle and must name the inode just made, holding the bytes just written.
 * A symbolic link or hard link swapped in between check and write never receives the bytes.
 */
export async function writeSource(root: string, file: string, { expectHash, expectIdentity, next, boundary }: WriteOptions): Promise<Written> {
  const { path, inside, exists } = await containedPath(root, file, boundary);
  if (expectHash === null) {
    if (exists) throw new UsageError(`${inside} already exists, so nothing was written.`);
    await mkdir(dirname(path), { recursive: true });
    const made = await publish(path, Buffer.from(next, 'utf8'), undefined, true);
    return verify(root, path, boundary, made, next, null);
  }
  const current = await readSource(root, path, boundary);
  if (current.hash !== expectHash || expectIdentity && (current.identity.dev !== expectIdentity.dev || current.identity.ino !== expectIdentity.ino)) throw new UsageError(staleFile);
  let text = withEol(next, current.eol);
  if (current.bom && !text.startsWith(BOM)) text = BOM + text;
  const made = await publish(path, Buffer.from(text, 'utf8'), current, false);
  return verify(root, path, boundary, made, text, current.text);
}
async function publish(path: string, bytes: Buffer, current: SourceText | undefined, create: boolean): Promise<Identity> {
  const temporary = join(dirname(path), `.${basename(path)}.${randomBytes(6).toString('hex')}.plumb-tmp`);
  try {
    const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, current?.mode ?? 0o644);
    let made: Identity;
    try {
      if (current) await handle.chmod(current.mode);
      await handle.writeFile(bytes);
      await handle.sync();
      const info = await handle.stat();
      made = { dev: info.dev, ino: info.ino };
    } finally { await handle.close(); }
    if (create) await link(temporary, path);
    else {
      // the path still names what the hash was checked against
      const again = await lstat(path);
      if (again.isSymbolicLink() || again.dev !== current!.identity.dev || again.ino !== current!.identity.ino) throw new UsageError(staleFile);
      await rename(temporary, path);
    }
    return made;
  } finally { await rm(temporary, { force: true }); }
}
async function verify(root: string, path: string, boundary: string | undefined, made: Identity, text: string, before: string | null): Promise<Written> {
  const after = await readSource(root, path, boundary);
  if (after.identity.dev !== made.dev || after.identity.ino !== made.ino || after.text !== text) throw new UsageError(`${relative(root, path).replaceAll('\\', '/')} changed while it was being written. Read it again.`);
  return { path, text, hash: after.hash, identity: made, before };
}

/** Several writes made as one: on failure, the files already written go back as they were, newest first, each only
 * while it still holds what was written. What could not go back is returned; nothing is swallowed. */
export class Transaction {
  private journal: { path: string; created: boolean; before: string; hashAfter: string }[] = [];
  constructor(private readonly root: string, private readonly boundary?: string) {}
  get files(): string[] { return this.journal.map(entry => entry.path); }
  async write(file: string, options: Omit<WriteOptions, 'boundary'>): Promise<Written> {
    const written = await writeSource(this.root, file, { ...options, ...(this.boundary === undefined ? {} : { boundary: this.boundary }) });
    this.journal.push({ path: written.path, created: written.before === null, before: written.before ?? '', hashAfter: written.hash });
    return written;
  }
  async rollback(): Promise<Rollback> {
    const restored: string[] = [], failed: RollbackFailure[] = [];
    for (const entry of this.journal.toReversed()) {
      const name = relative(this.root, entry.path).replaceAll('\\', '/');
      try {
        if (entry.created) {
          const current = await readSource(this.root, entry.path, this.boundary);
          if (current.hash !== entry.hashAfter) throw new UsageError('it changed since');
          await rm(entry.path);
        } else await writeSource(this.root, entry.path, { expectHash: entry.hashAfter, next: entry.before, ...(this.boundary === undefined ? {} : { boundary: this.boundary }) });
        restored.push(name);
      } catch (error) { failed.push({ file: name, error: errorMessage(error) }); }
    }
    this.journal = [];
    return { restored, failed };
  }
  /** Run the writes; on a throw, roll back and rethrow with what could not go back in the message. */
  async run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    try { return await work(this); }
    catch (error) { throw withRollback(error, (await this.rollback()).failed); }
  }
}
/** The error a failed multi-file write surfaces: the cause, then each file that could not be put back and why. */
export function withRollback(error: unknown, failed: RollbackFailure[]): Error {
  if (!failed.length) return error instanceof Error ? error : new Error(String(error));
  const message = `${errorMessage(error)} ${failed.map(f => `${f.file} could not be put back (${f.error}); it still holds the change.`).join(' ')}`;
  const out = error instanceof UsageError ? new UsageError(message) : new Error(message);
  out.cause = error;
  return out;
}
