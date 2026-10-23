import { environment } from '../paths.js';
import { state } from './next-state.js';
import type { SessionOptions } from '../session/index.js';

export { PlumbOverlay } from './next-overlay.js';
export const runtime = 'nodejs';

/** One lazy Session per process, retained across App Router hot reloads. */
export function createPlumbRoute(options: SessionOptions = {}): { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> } {
  // A build-time branch keeps bundlers from even resolving the development import.
  const handle = process.env.NODE_ENV === 'production' ? async (): Promise<Response> => new Response(null, { status: 404 }) : async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
    const shared = state();
    // withPlumb supplies the installed module's real file URL. Native loading
    // keeps the entire Session graph external even when npm links the package
    // outside node_modules, where Next's package-name externals cannot match.
    shared.handler ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ environment('NEXT_SERVER_MODULE') ?? './next-dev.js').then(({ handler }) => handler(options, shared.token)).catch(error => {
      delete shared.handler; throw error;
    });
    return (await shared.handler)(request);
  };
  return { GET: handle, POST: handle };
}
