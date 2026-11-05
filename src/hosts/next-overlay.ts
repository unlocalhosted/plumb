import { createElement, Fragment } from 'react';
import type { ReactElement } from 'react';
import { state } from './next-state.js';

// The host's hot updates start a new module generation for the overlay, the way hosts/vite.ts hooks vite:afterUpdate:
// Next's dev client takes its updates over a WebSocket at /_next/hmr (webpack and Turbopack alike); a second socket on
// it hears the same "built", "sync", server-component and Turbopack update messages. It connects without the page's
// request id: a socket with that id would replace the page's own client and take its updates. Next applies the
// update right after it says so, hence the short settle before the overlay invalidates what it knew.
const updates = `import { invalidateSourceMaps } from '/__plumb/src/sourcemap.js';
const kinds = new Set(['built', 'sync', 'serverComponentChanges', 'turbopack-message', 'clientChanges']);
let timer, socket, synced = false;
const connect = () => {
  try { socket = new WebSocket(\`\${location.protocol === 'https:' ? 'wss' : 'ws'}://\${location.host}/_next/hmr\`); } catch { return; }
  socket.onmessage = (event) => {
    let message; try { message = JSON.parse(event.data); } catch { return; }
    // the first sync: the host's client has compared its bundle hash (a changed one reloads the page); the overlay's ready waits for it
    if ((message?.type ?? message?.action) === 'sync' && !synced) { synced = true; dispatchEvent(new Event('plumb:host-synced')); }
    if (!kinds.has(message?.type ?? message?.action)) return;
    clearTimeout(timer); timer = setTimeout(invalidateSourceMaps, 80);
  };
  socket.onclose = () => { setTimeout(connect, 1500); };
};
connect();
`;

/** Render the script's process token without importing any server implementation. */
export function PlumbOverlay(): ReactElement | null {
  if (process.env.NODE_ENV === 'production') return null;
  return createElement(Fragment, null,
    createElement('script', { type: 'module', src: '/__plumb/client.js', 'data-plumb-token': state().token,
      'data-plumb-next-dist': process.env.PLUMBER_NEXT_DIST_DIR ?? process.env.PLUMB_NEXT_DIST_DIR }),
    createElement('script', { type: 'module', dangerouslySetInnerHTML: { __html: updates } }));
}
