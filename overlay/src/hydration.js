// Whether React has attached to the page's markup. "Overlay ready" and a first click wait for it, bounded, because on
// Next the overlay's script runs before the client's first sync and before React hydrates (a server-rendered page has
// its elements, with no fibers yet), and a click then found nothing to read. The wait is only for markup React has
// not reached: app elements on the page (outside the overlay, the host's portals, and scripts and styles) and none
// with a fiber. An empty root, or a page with no app elements at all, has nothing to hydrate: a client-rendered app
// that mounts late (an auth gate, a lazy entry) is ready now, and its mount is DOM change the overlay already follows.
let hydrated = false;
const notApp = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'HEAD', 'PLUMB-OVERLAY', 'NEXTJS-PORTAL', 'NEXT-ROUTE-ANNOUNCER']);
const hasFiber = element => { for (const key in element) if (key.startsWith('__reactFiber$')) return true; return false; };
// a root React created on the client (createRoot's container): React is there; what it renders gets fibers as it comes
const isContainer = element => { for (const key in element) if (key.startsWith('__reactContainer$')) return true; return false; };
/** True when nothing is left to hydrate: a host element has a fiber, or there is no markup for React to attach to. */
export function pageHydrated() {
  if (hydrated) return true;
  let seen = 0;
  const walk = node => {
    for (let child = node.firstElementChild; child && seen < 3000; child = child.nextElementSibling) {
      if (notApp.has(child.tagName)) continue;
      if (hasFiber(child)) return true;
      // markup to attach to has content; an empty container (<div id="root">) or a client-made root is not it
      if (child.childNodes.length && !isContainer(child)) seen++;
      if (walk(child)) return true;
    }
    return false;
  };
  if (document.body && walk(document.body)) return (hydrated = true);
  return seen === 0;
}
/** Resolves true once the page is hydrated, false at the timeout or when the signal aborts; never throws. */
export function whenHydrated({ timeout = 15000, signal } = {}) {
  if (pageHydrated()) return Promise.resolve(true);
  return new Promise(resolve => {
    let timer, observer;
    const settle = value => { clearTimeout(timer); clearInterval(poll); observer?.disconnect(); signal?.removeEventListener('abort', onAbort); resolve(value); };
    const check = () => { if (pageHydrated()) settle(true); };
    const onAbort = () => settle(false);
    const poll = setInterval(check, 100);
    timer = setTimeout(() => settle(false), timeout);
    try { observer = new MutationObserver(check); observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); } catch {}
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
// On Next the host's client reloads the page once when its first "sync" carries another bundle hash than the one it
// loaded; the host script (hosts/next-overlay.ts) says when that first sync has come. Elsewhere there is nothing to wait for.
let synced = false;
addEventListener('plumb:host-synced', () => { synced = true; }, { once: true });
export const onNext = () => !!document.querySelector('script[data-plumb-next-dist]');
export function hostSynced({ timeout = 10000 } = {}) {
  if (!onNext() || synced) return Promise.resolve(true);
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), timeout);
    addEventListener('plumb:host-synced', () => { clearTimeout(timer); resolve(true); }, { once: true });
  });
}
