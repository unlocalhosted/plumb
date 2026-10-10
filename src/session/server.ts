import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { Session } from './index.js';
import type { SessionOptions } from './index.js';
import type { CheckOptions } from '../index.js';
import { BusyError, errorMessage, UsageError } from '../errors.js';
import { isIP } from 'node:net';
import { overlayClient, overlayModules } from '../hosts/client.js';

export interface ServeInfo { port: number; pid: number; token: string; root: string; config: string | null; protocol: 1; overlay?: boolean; origin?: string }
export interface HandlerOptions {
  token?: string; prefix?: string;
  /** Absolute directory the host serves browser source paths from. */ servedRoot?: string;
  /** Additional trusted Host authorities, including port when present. */ allowedHosts?: string[];
  /** Serve the public overlay module alongside the authenticated API. */ client?: boolean;
  /** Exact browser origin allowed to use token-authenticated routes and CORS. */ origin?: string;
}
export interface WebHandlerOptions extends HandlerOptions {
  /** Trusted socket peer from the hosting framework. Omit when using token authentication. */
  peerAddress?: string | ((request: Request) => string | undefined);
}
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
export async function dispatch(session: Session, method: string, raw: unknown = {}, options: Pick<HandlerOptions, 'servedRoot'> = {}): Promise<unknown> {
  if (!object(raw)) throw new UsageError('Parameters must be a JSON object.');
  const params = raw;
  if (method === 'report') {
    const options: Pick<CheckOptions, 'base' | 'changed' | 'strictLedger' | 'verbose' | 'ledger'> = {};
    if (params.base !== undefined) options.base = text(params, 'base')!;
    for (const key of ['changed', 'strictLedger', 'verbose', 'ledger'] as const) if (params[key] !== undefined) {
      const value = params[key];
      if (typeof value !== 'boolean') throw new UsageError(`${key} must be a boolean.`);
      options[key] = value;
    }
    return session.report(options);
  }
  if (method === 'site') return session.site(text(params, 'file')!, position(params, 'line')!, position(params, 'column', true));
  if (method === 'resolve') return session.resolveSource(text(params, 'source')!, position(params, 'line', true), position(params, 'column', true), { ...(options.servedRoot === undefined ? {} : { servedRoot: options.servedRoot }), ...(params.tag === undefined ? {} : { tag: text(params, 'tag')! }), component: params.component === '1', ...(params.hash === undefined ? {} : { hash: text(params, 'hash')! }), snapshot: params.snapshot === '1' });
  if (method === 'edits') return session.edits(text(params, 'file')!, position(params, 'line')!, position(params, 'column', true));
  if (method === 'apply') {
    if (!Array.isArray(params.edits) || !params.edits.length || params.edits.some(edit => !object(edit) || typeof edit.id !== 'string' || !edit.id.trim())) throw new UsageError('edits must be a non-empty array of edit ids.');
    return session.apply({ file: text(params, 'file')!, hash: text(params, 'hash')!, edits: params.edits.map(edit => ({ id: edit.id as string })) });
  }
  if (method === 'why') return session.why(text(params, 'file')!, position(params, 'line')!);
  if (method === 'decisions') return session.decisions();
  if (method === 'health') return session.health();
  if (method === 'refresh') return session.refresh();
  if (method === 'try') {
    if (typeof params.code !== 'string') throw new UsageError('code must be a string.');
    const lang = text(params, 'lang', true), as = text(params, 'as', true);
    if (lang !== undefined && lang !== 'tsx' && lang !== 'css') throw new UsageError('lang must be tsx or css.');
    if (as !== undefined && !as.trim()) throw new UsageError('as must be a non-empty source path.');
    if (params.verbose !== undefined && typeof params.verbose !== 'boolean') throw new UsageError('verbose must be a boolean.');
    return session.try(params.code, { ...(lang === undefined ? {} : { lang }), ...(as === undefined ? {} : { as }), ...(params.verbose === undefined ? {} : { verbose: params.verbose as boolean }) });
  }
  throw new UsageError(`Unknown method: ${method}.`);
}

interface TransportRequest {
  url: URL;
  method: string;
  header(name: string): string | undefined;
  peerAddress: string | undefined;
  body: AsyncIterable<Uint8Array>;
}
interface TransportResponse { status: number; headers: Record<string, string>; body: string }

function trustedOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && value === value.trim()) return url.origin;
  } catch {}
  throw new UsageError('Origin must be an http or https origin without credentials, path, query or fragment.');
}

/** One route/auth/body-validation core for both transports. Undefined belongs to the host app. */
function createRoute(session: Session | Promise<Session>, options: HandlerOptions) {
  let current: Session | undefined, diagnostic: string | undefined;
  if ('then' in session) void session.then(value => { current = value; }, error => { diagnostic = errorMessage(error); });
  else current = session;
  const token = options.token, prefix = options.prefix ?? '/__plumb/';
  if (!prefix.startsWith('/') || !prefix.endsWith('/') || /[?#]/.test(prefix)) throw new UsageError('Handler prefix must start and end with /.');
  if (token !== undefined && !token.trim()) throw new UsageError('Handler token must be non-empty.');
  const allowedHosts = new Set(options.allowedHosts?.map(host => host.toLowerCase()));
  const origin = options.origin === undefined ? undefined : trustedOrigin(options.origin);
  return async (request: TransportRequest): Promise<TransportResponse | undefined> => {
    const url = request.url;
    if (!url.pathname.startsWith(prefix)) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Cross-Origin-Resource-Policy': 'same-origin' };
    const respond = (status: number, value: unknown): TransportResponse => ({ status, headers, body: JSON.stringify(value) });
    const refuse = (status: number, error: string) => respond(status, { error });
    const method = url.pathname.slice(prefix.length);
    const client = options.client === true && overlayModules.includes(method);
    if (client) headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    const expected = ['try', 'apply'].includes(method) ? 'POST' : 'GET';
    const known = client || ['report', 'site', 'resolve', 'edits', 'apply', 'try', 'decisions', 'why', 'health', 'refresh'].includes(method);
    if (origin !== undefined) {
      headers.Vary = 'Origin';
      const supplied = request.header('origin');
      if (supplied !== undefined && supplied !== origin) return refuse(403, 'Origin is not allowed.');
      if (supplied === origin) headers['Access-Control-Allow-Origin'] = origin;
      if (request.method === 'OPTIONS') {
        if (supplied !== origin) return refuse(403, 'Origin is not allowed.');
        if (!known) return refuse(404, 'Endpoint not found.');
        if (request.header('access-control-request-method') !== expected) { headers.Allow = expected; return refuse(405, `Use ${expected} for this endpoint.`); }
        const requested = request.header('access-control-request-headers')?.split(',').map(header => header.trim().toLowerCase()) ?? [];
        if (requested.some(header => !['content-type', tokenHeader].includes(header))) return refuse(403, 'Request headers are not allowed.');
        headers['Access-Control-Allow-Methods'] = expected;
        headers['Access-Control-Allow-Headers'] = `Content-Type, ${tokenHeader}`;
        return { status: 204, headers, body: '' };
      }
    }
    // Module script loads cannot supply a custom header. The module contains no secrets.
    if (token !== undefined && !client) {
      const supplied = request.header(tokenHeader);
      if (supplied === undefined || Buffer.byteLength(supplied) !== Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token)))
        return refuse(401, 'A valid x-plumb-token header is required.');
    } else if (token === undefined) {
      const address = request.peerAddress ?? '', ipv4 = address.replace(/^::ffff:/i, '');
      const loopback = address === '::1' || isIP(ipv4) === 4 && ipv4.startsWith('127.');
      const host = request.header('host') ?? '';
      const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i.test(host);
      let trusted = loopback && (localHost || allowedHosts.has(host.toLowerCase()));
      try {
        const authority = new URL(`${url.protocol}//${host}`);
        trusted &&= ['http:', 'https:'].includes(url.protocol) && !/[\s/@?#\\]/.test(host) && !authority.username && !authority.password;
        const origin = request.header('origin');
        // Every write needs browser origin proof. GETs may be used by local tools.
        if (origin !== undefined || request.method === 'POST') trusted &&= origin === authority.origin;
      } catch { trusted = false; }
      if (['cross-site', 'same-site'].includes(request.header('sec-fetch-site') ?? '')) trusted = false;
      if (!trusted) return refuse(403, 'A same-origin request from a trusted loopback host is required.');
    }
    try {
      if (current && !known) return refuse(404, 'Endpoint not found.');
      if (request.method !== expected) { headers.Allow = expected; return refuse(405, `Use ${expected} for this endpoint.`); }
      if (client) { headers['Content-Type'] = method.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8'; return { status: 200, headers, body: await overlayClient(method) }; }
      if (!current) {
        const state = diagnostic === undefined ? { status: 'starting' } : { status: 'failed', diagnostic };
        if (method !== 'health') headers['Retry-After'] = '1';
        return respond(method === 'health' ? 200 : 503, state);
      }
      let params: unknown = Object.fromEntries(url.searchParams);
      if (method === 'report' && object(params)) for (const key of ['changed', 'strictLedger', 'verbose', 'ledger']) if (params[key] !== undefined) {
        if (!['true', 'false'].includes(String(params[key]))) throw new UsageError(`${key} must be true or false.`);
        params[key] = params[key] === 'true';
      }
      if (expected === 'POST') {
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of request.body) {
          size += chunk.byteLength;
          if (size > 1024 * 1024) throw new UsageError(`${method === 'try' ? 'Snippet' : 'Request'} exceeds the 1 MiB request limit.`);
          chunks.push(Buffer.from(chunk));
        }
        try { params = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new UsageError('Request body must be valid JSON.'); }
      }
      return respond(200, await dispatch(current, method, params, options));
    } catch (error) { if (error instanceof BusyError) { headers["Retry-After"] = "1"; return respond(503, { status: "busy" }); } return refuse(error instanceof UsageError ? 400 : 500, errorMessage(error)); }
  };
}

/** Framework-free Node middleware. Requests outside its prefix belong to the host app. */
export function createHandler(session: Session | Promise<Session>, options: HandlerOptions = {}): (request: IncomingMessage, response: ServerResponse, next?: () => void) => void {
  const route = createRoute(session, options);
  return (request, response, next) => {
    let url: URL;
    const protocol = 'encrypted' in request.socket && request.socket.encrypted ? 'https:' : 'http:';
    try { url = new URL(request.url ?? '/', protocol + '//127.0.0.1'); url.protocol = protocol; }
    catch { response.writeHead(400); response.end(JSON.stringify({ error: 'Request URL must be valid.' })); return; }
    void route({ url, method: request.method ?? 'GET', peerAddress: request.socket.remoteAddress,
      header: name => { const value = request.headers[name]; return typeof value === 'string' ? value : undefined; }, body: request,
    }).then(result => {
      if (!result) { if (next) next(); else { response.writeHead(404); response.end(); } return; }
      response.writeHead(result.status, result.headers); response.end(result.body);
    });
  };
}

/** Web Request/Response adapter for App Router and other Fetch-compatible hosts. */
export function createWebHandler(session: Session | Promise<Session>, options: WebHandlerOptions = {}): (request: Request) => Promise<Response> {
  const route = createRoute(session, options);
  return async request => {
    async function* body(): AsyncIterable<Uint8Array> {
      const reader = request.body?.getReader();
      if (!reader) return;
      try { while (true) { const chunk = await reader.read(); if (chunk.done) break; yield chunk.value; } }
      finally { await reader.cancel(); reader.releaseLock(); }
    }
    const url = new URL(request.url);
    const result = await route({ url, method: request.method,
      header: name => request.headers.get(name) ?? (name === 'host' ? url.host : undefined),
      peerAddress: typeof options.peerAddress === 'function' ? options.peerAddress(request) : options.peerAddress, body: body(),
    });
    return result ? new Response(result.status === 204 ? null : result.body, { status: result.status, headers: result.headers }) : new Response(null, { status: 404 });
  };
}

export async function serve(options: SessionOptions & { port?: number; overlay?: boolean; origin?: string; servedRoot?: string } = {}): Promise<{ session: Session; server: Server; info: ServeInfo; close(): Promise<void> }> {
  const port = options.port ?? 0;
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) throw new UsageError('Port must be an integer from 0 to 65535.');
  if (options.overlay && options.origin === undefined) throw new UsageError('Serve --overlay requires --origin <url>.');
  if (options.servedRoot !== undefined && !options.overlay) throw new UsageError('--served-root requires serve --overlay.');
  if (options.servedRoot?.trim() === '') throw new UsageError('Provide a non-empty path for --served-root.');
  if (options.origin !== undefined && !options.overlay) throw new UsageError('--origin requires serve --overlay.');
  const origin = options.origin === undefined ? undefined : trustedOrigin(options.origin);
  const root = resolve(options.root ?? process.cwd()), path = resolve(root, '.plumb/serve.json');
  // A live PID owns its discovery file. Never overwrite another daemon.
  try {
    const old = JSON.parse(await readFile(path, 'utf8')) as ServeInfo;
    let alive = false;
    if (Number.isSafeInteger(old.pid) && old.pid > 0) try { process.kill(old.pid, 0); alive = true; } catch (error) { alive = (error as NodeJS.ErrnoException).code === 'EPERM'; }
    if (alive) throw new UsageError('A server is already running for this project. Use its .plumb/serve.json connection.');
    await rm(path);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const { port: _port, overlay: _overlay, origin: _origin, servedRoot: _servedRoot, ...sessionOptions } = options;
  const session = await Session.create({ ...sessionOptions, root });
  const token = randomBytes(32).toString('hex');
  const handlerOptions: HandlerOptions = { token, ...(options.servedRoot === undefined ? {} : { servedRoot: resolve(options.servedRoot) }), client: options.overlay ?? false, ...(origin === undefined ? {} : { origin }) };
  const handler = createHandler(session, handlerOptions), legacy = createHandler(session, { ...handlerOptions, client: false, prefix: '/' });
  const server = createServer((request, response) => handler(request, response, () => legacy(request, response)));
  server.requestTimeout = 10_000; server.headersTimeout = 10_000;
  try {
    await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.off('error', reject); ready(); }); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Server has no TCP address.');
    const info: ServeInfo = { port: address.port, pid: process.pid, token, root, config: options.config === undefined ? null : resolve(root, options.config), protocol: 1,
      ...(options.overlay ? { overlay: true, origin: origin! } : {}) };
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
        if (!['report', 'site', 'edits', 'apply', 'try', 'decisions', 'why', 'health', 'refresh'].includes(method)) {
          if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Unknown method: ${request.method}.` } }); continue;
        }
        const result = await dispatch(session, method, request.params ?? {});
        if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, result });
      } catch (error) { if (request.id !== undefined) await write({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: errorMessage(error) } }); }
    }
  } finally { lines.close(); await session.close(); }
}
