import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { Session } from './index.js';
import type { SessionOptions } from './index.js';
import type { CheckOptions } from '../index.js';
import { errorMessage, UsageError } from '../errors.js';

export interface ServeInfo { port: number; pid: number; token: string; root: string; config: string | null; protocol: 1 }
export const tokenHeader = 'x-plumb-token';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function text(params: Record<string, unknown>, name: string, optional = false): string | undefined {
  const value = params[name];
  if (value === undefined && optional) return;
  if (typeof value !== 'string' || (!optional && !value.trim())) throw new UsageError(`${name} must be a non-empty string.`);
  return value;
}
function position(params: Record<string, unknown>, name: string, optional = false): number | undefined {
  const value = params[name];
  if (value === undefined && optional) return;
  const n = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) throw new UsageError(`${name} must be a positive integer.`);
  return n;
}
export async function dispatch(session: Session, method: string, raw: unknown = {}): Promise<unknown> {
  if (!object(raw)) throw new UsageError('Parameters must be a JSON object.');
  const params = raw;
  if (method === 'report') {
    const options: Pick<CheckOptions, 'base' | 'changed' | 'strictLedger'> = {};
    if (params.base !== undefined) options.base = text(params, 'base')!;
    for (const key of ['changed', 'strictLedger'] as const) if (params[key] !== undefined) {
      const value = params[key];
      if (typeof value !== 'boolean') throw new UsageError(`${key} must be a boolean.`);
      options[key] = value;
    }
    return session.report(options);
  }
  if (method === 'site') return session.site(text(params, 'file')!, position(params, 'line')!, position(params, 'column', true));
  if (method === 'why') return session.why(text(params, 'file')!, position(params, 'line')!);
  if (method === 'decisions') return session.decisions();
  if (method === 'health') return session.health();
  if (method === 'try') {
    if (typeof params.code !== 'string') throw new UsageError('code must be a string.');
    const lang = text(params, 'lang', true), as = text(params, 'as', true);
    if (lang !== undefined && lang !== 'tsx' && lang !== 'css') throw new UsageError('lang must be tsx or css.');
    if (as !== undefined && !as.trim()) throw new UsageError('as must be a non-empty source path.');
    return session.try(params.code, { ...(lang === undefined ? {} : { lang }), ...(as === undefined ? {} : { as }) });
  }
  throw new UsageError(`Unknown method: ${method}.`);
}

export async function serve(options: SessionOptions & { port?: number } = {}): Promise<{ session: Session; server: Server; info: ServeInfo; close(): Promise<void> }> {
  const port = options.port ?? 0;
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new UsageError('Port must be an integer from 0 to 65535.');
  const root = resolve(options.root ?? process.cwd()), path = resolve(root, '.plumb/serve.json');
  // A live PID owns its discovery file. Never overwrite another daemon.
  try {
    const old = JSON.parse(await readFile(path, 'utf8')) as ServeInfo;
    let alive = false;
    if (Number.isSafeInteger(old.pid) && old.pid > 0) try { process.kill(old.pid, 0); alive = true; } catch (error) { alive = (error as NodeJS.ErrnoException).code === 'EPERM'; }
    if (alive) throw new UsageError('A server is already running for this project. Use its .plumb/serve.json connection.');
    await rm(path);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const session = await Session.create({ ...options, root });
  const token = randomBytes(32).toString('hex');
  const server = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store');
    const supplied = request.headers[tokenHeader];
    if (typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) {
      response.writeHead(401); response.end(JSON.stringify({ error: 'A valid x-plumb-token header is required.' })); return;
    }
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const method = url.pathname.slice(1);
      const expected = method === 'try' ? 'POST' : 'GET';
      if (!['report', 'site', 'try', 'decisions', 'why', 'health'].includes(method)) { response.writeHead(404); response.end(JSON.stringify({ error: 'Endpoint not found.' })); return; }
      if (request.method !== expected) { response.setHeader('Allow', expected); response.writeHead(405); response.end(JSON.stringify({ error: `Use ${expected} for this endpoint.` })); return; }
      let params: unknown = Object.fromEntries(url.searchParams);
      if (method === 'report' && object(params)) for (const key of ['changed', 'strictLedger']) if (params[key] !== undefined) {
        if (!['true', 'false'].includes(String(params[key]))) throw new UsageError(`${key} must be true or false.`);
        params[key] = params[key] === 'true';
      }
      if (method === 'try') {
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 1024 * 1024) throw new UsageError('Snippet exceeds the 1 MiB request limit.');
          chunks.push(Buffer.from(chunk));
        }
        try { params = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new UsageError('Request body must be valid JSON.'); }
      }
      const result = await dispatch(session, method, params);
      response.end(JSON.stringify(result));
    } catch (error) { response.writeHead(error instanceof UsageError ? 400 : 500); response.end(JSON.stringify({ error: errorMessage(error) })); }
  });
  server.requestTimeout = 10_000; server.headersTimeout = 10_000;
  try {
    await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); ready(); }); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Server has no TCP address.');
    const info: ServeInfo = { port: address.port, pid: process.pid, token, root, config: options.config === undefined ? null : resolve(root, options.config), protocol: 1 };
    await mkdir(resolve(root, '.plumb'), { recursive: true, mode: 0o700 });
    await writeFile(path, JSON.stringify(info) + '\n', { flag: 'wx', mode: 0o600 });
    let closed = false;
    return { session, server, info, async close() {
      if (closed) return; closed = true;
      server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await session.close();
      try { const current = JSON.parse(await readFile(path, 'utf8')) as ServeInfo; if (current.token === token) await rm(path); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    } };
  } catch (error) { server.close(); await session.close(); throw error; }
}

/** JSON-RPC 2.0, one JSON object per line. stdout contains responses only. */
export async function serveStdio(options: SessionOptions = {}, input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
  const session = await Session.create(options);
  const lines = createInterface({ input, crlfDelay: Infinity });
  const write = (value: object) => new Promise<void>((done, reject) => output.write(JSON.stringify(value) + '\n', error => error ? reject(error) : done()));
  try {
    for await (const line of lines) {
      let request: unknown;
      try { request = JSON.parse(line); } catch { await write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Request must be valid JSON.' } }); continue; }
      if (!object(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string' || request.id !== undefined && request.id !== null && typeof request.id !== 'string' && typeof request.id !== 'number') {
        await write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request must be a JSON-RPC 2.0 object with a method.' } }); continue;
      }
      try {
        const method = request.method.replace(/^plumb\./, '');
        if (!['report', 'site', 'try', 'decisions', 'why', 'health'].includes(method)) {
          if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Unknown method: ${request.method}.` } }); continue;
        }
        const result = await dispatch(session, method, request.params ?? {});
        if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, result });
      } catch (error) { if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: errorMessage(error) } }); }
    }
  } finally { lines.close(); await session.close(); }
}
