import { createElement, Fragment } from 'react';
import type { ReactElement } from 'react';
import { state } from './next-state.js';
import { nextHost } from './next-host.js';

// The host's hot updates start a new module generation for the overlay, the way hosts/vite.ts hooks vite:afterUpdate:
// Next's dev client takes its updates over a WebSocket, at /_next/hmr from Next 16 and /_next/webpack-hmr before it
// (webpack and Turbopack alike); a second socket on it hears the same "built", "sync", server-component and Turbopack
// update messages. The version is the page's own (window.next.version): on Next 15 the old path alone heard nothing,
// so a save there never reached the overlay (journey 109). It connects without the page's
// request id: a socket with that id would replace the page's own client and take its updates. Next applies the
// update right after it says so, hence the short settle before the overlay invalidates what it knew.
const updates = `import { invalidateSourceMaps } from '/__plumb/src/sourcemap.js';
const kinds = new Set(['built', 'sync', 'serverComponentChanges', 'turbopack-message', 'clientChanges']);
let timer, socket, synced = false, path = null;
// Next's client sets window.next as it boots, which can be after this module runs: asked again for up to 5 s, then the
// newest path
const pathOf = (tries = 0) => new Promise((done) => {
  const v = window.next?.version;
  if (v || tries >= 50) return done(!v || parseInt(v, 10) >= 16 ? '/_next/hmr' : '/_next/webpack-hmr');
  setTimeout(() => done(pathOf(tries + 1)), 100);
});
const connect = async () => {
  path ??= await pathOf();
  try { socket = new WebSocket(\`\${location.protocol === 'https:' ? 'wss' : 'ws'}://\${location.host}\${path}\`); } catch { return; }
  socket.onmessage = (event) => {
    let message; try { message = JSON.parse(event.data); } catch { return; }
    // the first sync: the host's client has compared its bundle hash (a changed one reloads the page); the overlay's ready
    // waits for it. Turbopack's sync carries no hash (it never reloads on one) and comes only after Next has asked the npm
    // registry for its latest version, which kept ready() waiting its whole 10 s on Next 16 (journey 112): there,
    // "turbopack-connected", sent at once, is the same news
    const kind = message?.type ?? message?.action;
    if ((kind === 'sync' || kind === 'turbopack-connected') && !synced) { synced = true; dispatchEvent(new Event('plumb:host-synced')); }
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
      'data-plumb-next-dist': nextHost('distDir') }),
    createElement('script', { type: 'module', dangerouslySetInnerHTML: { __html: updates } }));
}
