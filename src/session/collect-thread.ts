import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { collectClasses } from '../collect/classes.js';
import type { ClassHelperInput } from '../config.js';
import { RecentPrograms } from './collection.js';

// One of the threads a session's first collection runs on (collection.ts, `collectOnThreads`): the same per-file
// collection the session runs, on its share of the files, each answer sent back as soon as it is ready. The session
// does everything after it (shared strings, imports, the component shard) on its own thread, in file order.
const { files, classHelpers } = workerData as { files: string[]; classHelpers: ClassHelperInput[] };
const memory = { programs: new RecentPrograms(256), imports: new Map(), specifiers: new Map<string, string[]>(), texts: new Map() };
for (const file of files) {
  let text: string | undefined;
  try { text = readFileSync(file, 'utf8'); } catch { /* collection reports the read failure */ }
  try {
    const value = await collectClasses([file], classHelpers, new Map(text === undefined ? [] : [[file, text] as const]), undefined, undefined, undefined, memory);
    parentPort!.postMessage({ file, value, specifiers: memory.specifiers.get(file) });
  } catch (error) {
    parentPort!.postMessage({ file, error: error instanceof Error ? error.message : String(error) });
  }
}
