import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CandidateCss } from '../lower/css.js';

/** Rankings depend only on the current hint set and compilable candidates.
 * Locations, marker/existence proof and grouping still run on fresh inputs. */
export async function suggestionCache(root: string, candidates: Map<string, CandidateCss>, hints: { token: string; prefix: string }[], readOnly = false) {
  const key = createHash('sha256').update(JSON.stringify(['ranking-messages-v4-isolated', hints, [...candidates].map(([token, result]) => [token, !result.unreadable && !!result.css?.trim()])])).digest('hex');
  const directory = resolve(process.env.PLUMB_CACHE_DIR ?? join(root, existsSync(join(root, 'node_modules')) ? 'node_modules/.cache/plumb' : '.plumb-cache'), 'rankings');
  const path = join(directory, `${key}.json`);
  let entries: [string, string[]][] = [];
  try { entries = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  const rankings = new Map(entries), size = rankings.size;
  return {
    rankings,
    async save(): Promise<void> {
      if (readOnly || size === rankings.size) return;
      await mkdir(directory, { recursive: true });
      const temporary = `${path}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify([...rankings])); await rename(temporary, path);
    },
  };
}
