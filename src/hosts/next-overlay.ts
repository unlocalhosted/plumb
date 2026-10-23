import { createElement } from 'react';
import type { ReactElement } from 'react';
import { state } from './next-state.js';

/** Render the script's process token without importing any server implementation. */
export function PlumbOverlay(): ReactElement | null {
  if (process.env.NODE_ENV === 'production') return null;
  return createElement('script', { type: 'module', src: '/__plumb/client.js', 'data-plumb-token': state().token,
    'data-plumb-next-dist': process.env.PLUMBER_NEXT_DIST_DIR ?? process.env.PLUMB_NEXT_DIST_DIR });
}
