export class UsageError extends Error {}

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
