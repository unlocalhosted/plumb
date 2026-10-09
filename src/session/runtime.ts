/** Optional analysis host. The CLI's cold pipeline remains the reference. */
export interface AnalysisRuntime {
  phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T>;
  sync<T>(name: string, inputs: unknown[], compute: () => T): T;
}
