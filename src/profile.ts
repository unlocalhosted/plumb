import { environment } from './paths.js';
import { performance } from 'node:perf_hooks';

/** Opt-in benchmark marks; normal checks allocate no performance entries. */
export const profiling = environment('PROFILE') === '1';
export function profileDuration(name: string, duration: number): void {
  if (profiling) performance.measure(`plumb:${name}`, { start: 0, duration });
}

/** Live counterparts of the existing profiler phases. Library/daemon runs have no listener. */
export interface Progress {
  phase: string;
  files?: number;
  current?: number;
  total?: number;
  cached?: boolean;
  entry?: string | null;
  declarations?: number;
}
const listeners = new Set<(progress: Progress) => void>();
export function profileProgress(phase: string, details: Omit<Progress, 'phase'> = {}): void {
  for (const listener of listeners) listener({ phase, ...details });
}
export function onProgress(listener: (progress: Progress) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
