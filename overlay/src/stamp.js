/* ─────────────────────────────────────────────────────────
 * STAMP · React Plumber overlay
 *
 * A stamp is where an element was written, put on the element by the build:
 *
 *   data-plumb-source="apps/web/src/Card.tsx:12:4#3f9a1c0b7e2d"
 *                      └ source ────────────┘ │  │ └ hash
 *                      └ place ───────────────────┘
 *
 *  source   the file's path from the REPOSITORY root, each segment URI-encoded. Not the project's path: in a
 *           monorepo, or a project in a folder of a repository, the two differ
 *  place    source:line:column, the line of code. It stays the same when the file is edited elsewhere
 *  hash     twelve hex digits of the file's text when it was stamped; it changes with every edit of the file
 *
 * This file is the only place in the overlay that knows the attribute's name or the stamp's shape; the server's twin
 * is src/stamp.ts. A stamp taken apart anywhere else is the bug this file exists to end.
 *
 *  STAMP_ATTRIBUTE          the attribute's name (observers, clones, fiber props)
 *  STAMPED                  a selector for every stamped element
 *  stampOf(el)              the element's stamp, or null
 *  placeOf(el)              the element's place (no hash), or null
 *  parseStamp(text)         { source, line, column, hash, place }, or null when the text is not a stamp
 *  sameStamp(stamp)         a selector for the elements drawn by that line of that build of the file
 *  stampNames(stamp, file)  whether the stamp's file is `file`, given as the server names it (from the project root)
 *  atPlace(place)           a selector for the elements drawn by that line, whatever the file's hash is now
 * ───────────────────────────────────────────────────────── */

export const STAMP_ATTRIBUTE = 'data-plumb-source';
export const STAMPED = `[${STAMP_ATTRIBUTE}]`;

const SHAPE = /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/;

export const stampOf = (el) => el?.getAttribute?.(STAMP_ATTRIBUTE) ?? null;

// the part before the hash; text that is not a full stamp is cut the same way, as every caller did before
const placeIn = (text) => (typeof text === 'string' ? text.split('#')[0] : null);
export const placeOf = (el) => placeIn(stampOf(el));

export function parseStamp(text) {
  const m = typeof text === 'string' ? SHAPE.exec(text) : null;
  return m ? { source: m[1], line: Number(m[2]), column: Number(m[3]), hash: m[4], place: `${m[1]}:${m[2]}:${m[3]}` } : null;
}

// The stamp counts its file from the repository root; the server's answers count from the project root. They are the
// same file when one path ends with the other. Three callers each had a version of this; one compared from the start
// of the string and so never matched in a project below its repository's root.
export function stampNames(stamp, file) {
  const parsed = typeof stamp === 'string' ? parseStamp(stamp) : stamp;
  if (!parsed || typeof file !== 'string' || !file) return false;
  let source = parsed.source;
  try { source = decodeURIComponent(source); } catch { /* as written */ }
  return source === file || source.endsWith('/' + file) || file.endsWith('/' + source);
}

export const sameStamp = (stamp) => `[${STAMP_ATTRIBUTE}="${CSS.escape(stamp)}"]`;
export const atPlace = (place) => `[${STAMP_ATTRIBUTE}^="${CSS.escape(place)}#"]`;
