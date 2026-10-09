import { performance } from 'node:perf_hooks';

/** Opt-in benchmark marks; normal checks allocate no performance entries. */
export const profiling = process.env.PLUMB_PROFILE === '1';
export function profileDuration(name: string, duration: number): void {
  if (profiling) performance.measure(`plumb:${name}`, { start: 0, duration });
}
