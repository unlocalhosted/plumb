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
