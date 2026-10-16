import { randomUUID } from 'node:crypto';
import { link, rename, rm, writeFile } from 'node:fs/promises';

/** Publish complete bytes from a private file on the destination filesystem.
 * Exclusive publication uses link: a competing owner is never overwritten. */
export async function atomicWrite(path: string, data: string | Uint8Array, options: { exclusive?: boolean; mode?: number } = {}): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data, { flag: 'wx', ...(options.mode === undefined ? {} : { mode: options.mode }) });
    if (options.exclusive) await link(temporary, path);
    else await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
