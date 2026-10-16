import { readFile } from 'node:fs/promises';
import { statePath } from '../paths.js';

export interface ServeInfo { port: number; pid: number; token: string; root: string; config: string | null; protocol: 1; overlay?: boolean; origin?: string }

/** Old or incomplete discovery is no connection; filesystem errors still matter. */
export async function readDiscovery(root: string): Promise<ServeInfo | undefined> {
  try {
    const info: unknown = JSON.parse(await readFile(statePath(root, 'serve.json'), 'utf8'));
    if (!info || typeof info !== 'object' || Array.isArray(info)) return;
    const value = info as ServeInfo;
    if (value.protocol !== 1 || typeof value.root !== 'string' || !(value.config === null || typeof value.config === 'string') ||
        !Number.isSafeInteger(value.port) || value.port < 1 || value.port > 65535 ||
        !Number.isSafeInteger(value.pid) || value.pid < 1 || typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token)) return;
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return;
    throw error;
  }
}
