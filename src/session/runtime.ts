import type { Declaration } from '../report.js';
/** Optional analysis host. The CLI's cold pipeline remains the reference. */
export interface AnalysisRuntime {
  readonly inventory?: readonly string[] | undefined;
  phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T>;
  sync<T>(name: string, inputs: unknown[], compute: () => T): T;
  /** A judgement over the files being judged (unknown and unused variables, provenance, ownership, habits, imitation).
   * The session's judge works a file or a group at a time and can pause between them. */
  judge?<T>(name: string, inputs: unknown[], compute: () => T): Promise<T>;
  /** Asked between pieces of work: a promise when the analysis should give way (a whole-app read built in the
   * background while a page is being answered), nothing to carry on. It throws when the work is out of date. */
  readonly pause?: (() => Promise<void> | undefined) | undefined;
  /** The project's own source files when fewer are being judged (a single file): where a definition lives decides how
   * a value that reads it is judged, and a definition in another of the project's files is still the project's. */
  projectFiles?(): ReadonlySet<string> | undefined;
  /** A declaration from another file that is judged with the ones being judged, because it decides how they are judged
   * (a stylesheet reading a variable the judged file defines). */
  alsoJudged?(declaration: Declaration): boolean;
  /** Read the app-wide products (collection, the compile, the graphs, the token record, which classes exist) and judge
   * nothing: a session's start-up, which judges the open page's files one at a time and the whole app when asked. */
  readonly prepareOnly?: boolean;
}
