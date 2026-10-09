import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { CheckOptions } from '../index.js';
import type { Report } from '../report.js';
import type { TryOptions } from '../try.js';
import { errorMessage, UsageError } from '../errors.js';
import { Session } from './index.js';
import { tokenHeader } from './server.js';
import type { ServeInfo } from './server.js';

async function connection(options: Pick<CheckOptions, 'root' | 'config'>): Promise<ServeInfo | undefined> {
  const root = resolve(options.root ?? process.cwd());
  try {
    const info = JSON.parse(await readFile(resolve(root, '.plumb/serve.json'), 'utf8')) as ServeInfo;
    if (info.protocol !== 1 || info.root !== root || !Number.isSafeInteger(info.port) || info.port < 1 || info.port > 65535 ||
        !Number.isSafeInteger(info.pid) || info.pid < 1 || typeof info.token !== 'string' || !/^[a-f0-9]{64}$/.test(info.token) ||
        info.config !== (options.config === undefined ? null : resolve(root, options.config))) return;
    return info;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return; throw error; }
}
export async function serverRequest<T>(method: string, params: Record<string, unknown>, options: Pick<CheckOptions, 'root' | 'config'> = {}): Promise<T | undefined> {
  const info = await connection(options); if (!info) return;
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${info.port}/${method}${method === 'try' ? '' : `?${query}`}`, {
      method: method === 'try' ? 'POST' : 'GET', headers: { [tokenHeader]: info.token, ...(method === 'try' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'try' ? { body: JSON.stringify(params) } : {}), signal: AbortSignal.timeout(5000),
    });
  } catch { return; }
  if (response.status === 401 || response.status === 404) return;
  const value: unknown = await response.json();
  if (!response.ok) throw new UsageError((value as { error: string }).error);
  return value as T;
}
export function clientTry(code: string, options: TryOptions = {}): Promise<Report | undefined> { return serverRequest('try', { code, lang: options.lang, as: options.as }, options); }
export function clientReport(options: CheckOptions = {}): Promise<Report | undefined> { return serverRequest('report', { base: options.base, changed: options.changed, strictLedger: options.strictLedger }, options); }

/** Poll the daemon's revision; use a local session when discovery is absent. */
export async function watchReports(options: CheckOptions, emit: (report: Report) => void | Promise<void>, signal: AbortSignal, diagnostic?: (error: unknown) => void): Promise<void> {
  let local: Session | undefined;
  let revision: string | undefined;
  let lastError: string | undefined;
  try {
    while (!signal.aborted) {
      try {
        const health = await serverRequest<{ revision: number; pid: number; diagnostic?: string }>('health', {}, options);
        if (health) {
          if (health.diagnostic) throw new UsageError(health.diagnostic);
          if (local) { await local.close(); local = undefined; revision = undefined; }
          const next = `${health.pid}:${health.revision}`;
          if (next !== revision) { const report = await clientReport(options); if (report) { await emit(report); revision = next; } }
        } else {
          if (!local) { local = await Session.create(options); revision = undefined; }
          await local.refresh();
          const health = await local.health(); const next = `local:${health.revision}`;
          if (next !== revision) { await emit(await local.report(options)); revision = next; }
        }
      lastError = undefined;
      } catch (error) {
        if (signal.aborted) break;
        const message = errorMessage(error); if (message !== lastError) diagnostic?.(error); lastError = message;
      }
      try { await delay(100, undefined, { signal }); } catch (error) { if (!signal.aborted) throw error; }
    }
  } finally { await local?.close(); }
}
