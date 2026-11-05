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
  const browserOrigin = (request: Request, url: URL): string => {
    const referer = request.headers.get('referer');
    if (referer) { try { return new URL(referer).origin; } catch { /* not a URL: fall through */ } }
    const host = request.headers.get('host');
    return host ? `${request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')}://${host}` : url.origin;
  };
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/__plumb/client.js' && !url.searchParams.has('direct')) {
      try {
        const at = await sidecar(browserOrigin(request, url));
        const bridge = `// React Plumber: the overlay from its sidecar, or from this route when the sidecar cannot be reached\ntry { await import(${JSON.stringify(`${at}/__plumb/client.js`)}); } catch { await import('/__plumb/client.js?direct=1'); }\n`;
        return new Response(bridge, { status: 200, headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' } });
      } catch { /* no sidecar: the route serves the client itself */ }
    }
    return route(request);
  };
}
