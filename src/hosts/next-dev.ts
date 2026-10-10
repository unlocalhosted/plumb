import { Session } from '../session/index.js';
import type { SessionOptions } from '../session/index.js';
import { createWebHandler } from '../session/server.js';

/** Imported only by development routes; never by the production overlay component. */
export function handler(options: SessionOptions, token: string) {
  return createWebHandler(Session.create(options), { token, client: true });
}
