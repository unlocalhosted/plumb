import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Session } from '../session/index.js';
import type { SessionOptions } from '../session/index.js';
import { createHandler, createWebHandler } from '../session/server.js';
import type { HandlerOptions } from '../session/server.js';

/**
 * Imported only by development routes; never by the production overlay component.
 *
 * Two doors to one Session. The App Router route is the door the page finds: it answers every /__plumb request, as it
 * always did. But a request through it pays Next's route invocation first (on a large app, Turbopack's per-request
 * work for a route handler runs to hundreds of milliseconds before the handler is even called: measured 230 ms on
 * magicui's apps/www for GET /__plumb/health, whose own work is 1 ms), so the route also opens a sidecar: a loopback
 * http server on its own port, answering the same API with the same token for the one browser origin it was opened
 * for (CORS). The client module served through the route is a bridge that loads the overlay from the sidecar, and
 * falls back to the route when the sidecar cannot be reached (another origin, a proxy). From then on a locate is a
 * lookup again: one round trip to a server that does nothing but answer.
 */
export function handler(options: SessionOptions, token: string) {
  const session = Session.create(options);
  const common: HandlerOptions = {
    token, client: true, servedRoot: process.cwd(),
    readinessProject: { root: options.root ?? process.cwd(), rootOverride: options.root !== undefined, ...(options.config === undefined ? {} : { config: options.config }) },
    readiness: { host: process.env.TURBOPACK ? 'next-turbopack' : 'next-webpack', development: process.env.NODE_ENV === 'development', plugin: true, fastRefresh: true, stamping: process.env.PLUMB_INTERNAL_UNSTAMPED !== '1' },
  };
  const route = createWebHandler(session, common);
  // one sidecar per browser origin that asked (localhost and 127.0.0.1 are two), each trusting only its origin
  const sidecars = new Map<string, Promise<string>>();
  const sidecar = (origin: string): Promise<string> => {
    let started = sidecars.get(origin);
    if (!started) {
      started = new Promise<string>((resolve, reject) => {
        const handle = createHandler(session, { ...common, origin });
        const server = createServer((request, response) => handle(request, response, () => { response.writeHead(404); response.end(); }));
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => { server.unref(); resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); });
      });
      started.catch(() => sidecars.delete(origin));
      sidecars.set(origin, started);
    }
    return started;
  };
  // the browser's origin for the page, as the browser will send it in Origin: the page's own URL (Referer) when the
  // module is loaded by the page, else the authority the request was made to (Next's request.url can spell it otherwise)
  const pageUrl = (request: Request, url: URL): URL => {
    const referer = request.headers.get('referer');
    if (referer) { try { return new URL(referer); } catch { /* not a URL: fall through */ } }
    const host = request.headers.get('host');
    return host ? new URL(`${request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')}://${host}/`) : url;
  };
  // Whether a page can reach a plain-http loopback sidecar at all, decided here so the browser never has to try and
  // log a refusal of its own: not from an https page (mixed content), and not under a Content-Security-Policy whose
  // script-src or connect-src leaves the sidecar out. The policy is read off the page itself, once per origin.
  const reachable = new Map<string, Promise<boolean>>();
  const canReach = (page: URL, request: Request, at: string): Promise<boolean> => {
    if (page.protocol !== 'http:') return Promise.resolve(false);
    let known = reachable.get(page.origin);
    if (!known) {
      known = (async () => {
        try {
          const cookie = request.headers.get('cookie');
          const response = await fetch(page, { method: 'HEAD', redirect: 'manual', headers: cookie ? { cookie } : {}, signal: AbortSignal.timeout(10000) });
          return cspAllows(response.headers.get('content-security-policy'), at);
        } catch { return false; } // the page could not be read: take the door that always answers
      })();
      reachable.set(page.origin, known);
      known.then(ok => { if (!ok) setTimeout(() => reachable.delete(page.origin), 60000).unref?.(); });
    }
    return known;
  };
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // the bridge is for the page's own <script> tag, which names the page in Referer; a fetch with no page behind it
    // (a tool, a test reading the module) gets the client itself
    if (request.method === 'GET' && url.pathname === '/__plumb/client.js' && !url.searchParams.has('direct') && request.headers.get('referer')) {
      try {
        const page = pageUrl(request, url);
        const at = await sidecar(page.origin);
        if (!await canReach(page, request, at)) return route(request);
        const bridge = `// React Plumber: the overlay from its sidecar, or from this route when the sidecar cannot be reached\ntry { await import(${JSON.stringify(`${at}/__plumb/client.js`)}); } catch { await import('/__plumb/client.js?direct=1'); }\n`;
        return new Response(bridge, { status: 200, headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
      } catch { /* no sidecar: the route serves the client itself */ }
    }
    return route(request);
  };
}

/**
 * Does this Content-Security-Policy let the page load a module from `origin` and ask it questions? No policy: yes.
 * script-src and connect-src (each falling back to default-src) must both name the origin, its host with any port,
 * a matching scheme source (http:) or everything (*). A policy that names neither directive nor default-src: yes.
 */
export function cspAllows(policy: string | null, origin: string): boolean {
  if (!policy) return true;
  const directives = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources);
  }
  const url = new URL(origin), host = url.hostname;
  const allows = (sources: string[]) => sources.some(source => {
    const value = source.replace(/^'|'$/g, '').toLowerCase();
    if (value === '*' || value === `${url.protocol}` || value === origin || value === `${host}:*` || value === `${url.protocol}//${host}:*`) return true;
    return value === host || value === `${url.protocol}//${host}` || value === url.host;
  });
  for (const name of ['script-src', 'connect-src']) {
    const sources = directives.get(name) ?? directives.get('default-src');
    if (sources && !allows(sources)) return false;
  }
  return true;
}
