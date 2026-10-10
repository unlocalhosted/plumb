export class UsageError extends Error {}

export function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim();
}

/** Keep expected usage errors concise; retain the original frames for crashes. */
export function errorDiagnostic(error: unknown): string {
  return error instanceof Error && !(error instanceof UsageError) ? error.stack ?? error.message : errorMessage(error);
}
