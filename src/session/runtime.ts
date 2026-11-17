import type { Declaration } from '../report.js';
/** Optional analysis host. The CLI's cold pipeline remains the reference. */
export interface AnalysisRuntime {
  readonly inventory?: readonly string[] | undefined;
  phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T>;
  sync<T>(name: string, inputs: unknown[], compute: () => T): T;
  /** The project's own source files when fewer are being judged (a single file): where a definition lives decides how
   * a value that reads it is judged, and a definition in another of the project's files is still the project's. */
  projectFiles?(): ReadonlySet<string> | undefined;
  /** A declaration from another file that is judged with the ones being judged, because it decides how they are judged
   * (a stylesheet reading a variable the judged file defines). */
  alsoJudged?(declaration: Declaration): boolean;
}
