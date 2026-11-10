/**
 * A stamp: where an element was written, as the build writes it on the element and every other part reads it back.
 *
 *   data-plumb-source="apps/web/src/Card.tsx:12:4#3f9a1c0b7e2d"
 *                      └ source ────────────┘ │  │ └ hash
 *                                          line  column
 *
 *  - `source`  the file's `/`-separated path from the REPOSITORY root (src/source-identity.ts), each segment
 *              URI-encoded. Not from the project root: one file has one name however many apps render it.
 *  - `line`, `column`  of the JSX opening, 1-based line, 0-based column, as the parser reports them.
 *  - `hash`    the first twelve hex digits of the file's source hash when it was stamped. A reading kept from an
 *              earlier build is fresh only while the file still has this hash.
 *
 * This module is the only place that builds a stamp, takes one apart, or turns one into a file. A stamp taken apart
 * anywhere else is the bug this file exists to end: when its path changed meaning (project root to repository root),
 * the census kept reading it the old way and silently dropped every reading.
 */
import { UsageError } from './errors.js';
import { sourceHash } from './collect/cache.js';
import { sourcePath } from './source-boundary.js';
import { repositoryRoot } from './source-identity.js';

/** The attribute the build puts on every DOM tag it stamps. */
export const STAMP_ATTRIBUTE = 'data-plumb-source';

export interface Stamp {
  /** The path as written in the stamp: from the repository root, segments URI-encoded. */
  readonly source: string;
  readonly line: number;
  readonly column: number;
  /** Twelve hex digits of the file's source hash at the time it was stamped. */
  readonly hash: string;
}

const SHAPE = /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/;

/** The hash a stamp carries for a file with this text. */
export const stampHash = (text: string): string => sourceHash(text).slice(0, 12);

/** The encoded `source` of a file whose path from the repository root is `path`. */
export const stampSource = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/** The stamp as the attribute's value. */
export const formatStamp = (stamp: Stamp): string => `${stamp.source}:${stamp.line}:${stamp.column}#${stamp.hash}`;

/** A stamp read from text, or null when the text is not one. */
export function parseStamp(text: unknown): Stamp | null {
  const match = typeof text === 'string' ? SHAPE.exec(text) : null;
  return match ? { source: match[1]!, line: Number(match[2]), column: Number(match[3]), hash: match[4]! } : null;
}

/**
 * The file a stamp's `source` names, as an absolute path. `root` is the project root; the path is counted from the
 * repository root above it. Throws a UsageError when the source is not validly encoded or leaves the repository.
 */
export function stampedFile(root: string, source: string): string {
  try { return sourcePath(repositoryRoot(root), decodeURIComponent(source)); }
  catch { throw new UsageError('Source must have valid URL encoding.'); }
}
