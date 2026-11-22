/* NET · how the overlay asks for anything.
 *
 * Never through the page's fetch. That is the app's, and whatever wraps it (an extension, a mock, a reporter) makes
 * promises of its own from each request: one of ours that failed or was withdrawn rejected theirs, and Next's dialog
 * showed it as the app's error. It can't be caught afterwards: errors at the window reach listeners in the order they
 * were added, and the framework's were added first. An XMLHttpRequest reports by callback, so the only promise there
 * is is the one returned here, and every caller holds that.
 *
 * It answers as fetch does: a Response, a TypeError when the network fails, an AbortError when withdrawn. Every
 * request of the overlay goes through `send`; a bare fetch( in overlay/src is this bug again.
 *
 * Two places use fetch: a worker or Node, where there is no page to share one with, and the recorded demo, whose
 * replay stands in for the server by replacing fetch (hosts/vite.ts says so before the client loads).
 */
import { Scope } from './scope.js';

const NO_BODY = new Set([204, 205, 304]);
const withdrawn = () => new DOMException('The request was withdrawn.', 'AbortError');

export function send(url, init = {}) {
  if (typeof document === 'undefined' || typeof XMLHttpRequest === 'undefined' || globalThis.__plumbReplay) return fetch(url, init);
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body = null, signal, cache } = init;
    if (signal?.aborted) { reject(withdrawn()); return; }
    const xhr = new XMLHttpRequest(), out = new Scope();
    const done = (settle, value) => { out.end(); settle(value); };
    xhr.open(method, String(url));
    xhr.responseType = 'arraybuffer';
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    // fetch's `cache: 'no-store'`: a source map read again after an edit must be the new one, on a host that lets the
    // browser keep files too. Only to the page's own origin, where the header needs no preflight (the sidecar's
    // answers say no-store themselves)
    if (cache === 'no-store') {
      const to = new URL(url, location.href);
      if (to.origin === location.origin && /^https?:$/.test(to.protocol)) xhr.setRequestHeader('Cache-Control', 'no-cache');
    }
    xhr.onerror = () => done(reject, new TypeError('Failed to fetch'));
    xhr.onabort = () => done(reject, withdrawn());
    xhr.onload = () => {
      try {
        const given = new Headers();
        for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
          const at = line.indexOf(':');
          if (at > 0) given.append(line.slice(0, at).trim(), line.slice(at + 1).trim());
        }
        const response = new Response(NO_BODY.has(xhr.status) ? null : xhr.response, { status: xhr.status, headers: given });
        Object.defineProperty(response, 'url', { value: xhr.responseURL });
        done(resolve, response);
      } catch (error) { done(reject, error); } // a status or header a Response won't take
    };
    if (signal) out.listen(signal, 'abort', () => xhr.abort());
    xhr.send(body);
  });
}
