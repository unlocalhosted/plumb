/**
 * The kinds of refusal a caller acts on, as a closed list. The sentence is for a person and may be reworded; the code
 * is the contract: the overlay, the tests and an agent branch on it, never on the sentence.
 *
 *  stale-file           the file changed after it was read: read it again, then retry
 *  stale-text           the text run changed after it was read: read it again, then retry
 *  stale-config         the config changed after its diff was shown: read readiness again
 *  undo-undone          the change was already undone: nothing to do
 *  undo-changed-later   a later write by React Plumber changed the same place: undo that one first
 *  undo-changed-by-hand the place was edited outside React Plumber: it can only be undone in the editor
 */
export const ERROR_CODES = ['stale-file', 'stale-text', 'stale-config', 'undo-undone', 'undo-changed-later', 'undo-changed-by-hand'] as const;
export type ErrorCode = typeof ERROR_CODES[number];

export class UsageError extends Error {
  readonly code?: ErrorCode;
  constructor(message?: string, code?: ErrorCode) { super(message); if (code) this.code = code; }
}

/** The code an error carries, when it has one. */
export const errorCode = (error: unknown): ErrorCode | undefined => (error instanceof UsageError ? error.code : undefined);
/** `{ code }` to spread into an answer or a message between threads; nothing when the error has no code. */
export const withCode = (error: unknown): { code?: ErrorCode } => { const code = errorCode(error); return code ? { code } : {}; };

export function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim();
}

/** Admission deadline expired before a read could run. */
export class BusyError extends Error { constructor() { super("Session is busy. Retry the read."); } }

/** Keep expected usage errors concise; retain the original frames for crashes. */
export function errorDiagnostic(error: unknown): string {
  return error instanceof Error && !(error instanceof UsageError) ? error.stack ?? error.message : errorMessage(error);
}

/** User-facing boundaries never expose filesystem or Node parser internals. */
export function userMessage(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  const path = (error as NodeJS.ErrnoException | null)?.path;
  if (code === 'ENOENT' || code === 'ENOTDIR') return `${path ?? 'The requested file'}: no such file or folder.`;
  if (code === 'EACCES' || code === 'EPERM') return `${path ?? 'The requested file'}: permission denied.`;
  if (code === 'EISDIR') return `${path ?? 'The requested file'} is a folder; choose a file.`;
  if (code === 'EROFS') return `${path ?? 'The requested file'} is on a read-only filesystem.`;
  if (code === 'ENOSPC') return 'There is no disk space left to write this file.';
  if (code === 'EMFILE' || code === 'ENFILE') return 'Too many files are open. Close unused processes and try again.';
  if (code === 'EADDRINUSE') return 'The port is already in use.\n  → plumber serve --port 0';
  if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
    return (error instanceof Error ? error.message : String(error)).split(/\n| imported from |Require stack:/)[0]!.replace(/Cannot find (?:package|module)/, 'Could not load');
  }
  return errorMessage(error).replace(/(?:ENOENT|ENOTDIR|EACCES|EPERM|EISDIR)[^\n]*?(?:, (?:stat|open|scandir) )?(['"])(.*?)\1/g,
    (_, _quote, file) => `${file}: could not read this file or folder`);
}

export function formatUserError(error: unknown): string {
  // Structured setup messages and manual wiring retain useful line breaks.
  const message = error instanceof UsageError ? error.message : userMessage(error);
  const [first = '', ...rest] = message.split('\n');
  return `${first.startsWith('✗ ') || first.startsWith('This is a workspace') ? '' : '✗ '}${userMessage(new Error(first))}\n` +
    rest.map(line => `${line ? line.startsWith('  ') ? line : '  ' + line : ''}\n`).join('');
}
