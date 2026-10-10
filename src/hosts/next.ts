import { randomBytes } from 'node:crypto';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { SessionOptions } from '../session/index.js';

export const runtime = 'nodejs';
interface NextState { token: string; handler?: Promise<(request: Request) => Promise<Response>> }
const key = Symbol.for('@unlocalhosted/plumb/next');
const globals = globalThis as typeof globalThis & { [key]?: NextState };
function state(): NextState {
  return globals[key] ??= { token: randomBytes(32).toString('hex') };
}

/** One lazy Session per process, retained across App Router hot reloads. */
export function createPlumbRoute(options: SessionOptions = {}): { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> } {
  // A build-time branch keeps bundlers from even resolving the development import.
  const handle = process.env.NODE_ENV === 'production' ? async (): Promise<Response> => new Response(null, { status: 404 }) : async (request: Request): Promise<Response> => {
    if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
    const shared = state();
    shared.handler ??= import('./next-dev.js').then(({ handler }) => handler(options, shared.token)).catch(error => {
      delete shared.handler; throw error;
    });
    return (await shared.handler)(request);
  };
  return { GET: handle, POST: handle };
}

/** Server-render the process token; never expose it in the public client module. */
export function PlumbOverlay(): ReactElement | null {
  if (process.env.NODE_ENV === 'production') return null;
  return createElement('script', { type: 'module', src: '/__plumb/client.js', 'data-plumb-token': state().token });
}
