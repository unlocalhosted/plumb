// Whether React has hydrated the page: a host element with a fiber. "Overlay ready" and a first click both wait for
// it, bounded, because on Next the overlay's script runs before the client's first sync and before React hydrates
// (a server-rendered page has its elements, with no fibers yet), and a click then found nothing to read.
let hydrated = false;
export function pageHydrated() {
  if (hydrated) return true;
  const elements = document.body?.querySelectorAll('*') ?? [];
  const limit = Math.min(elements.length, 3000);
  for (let i = 0; i < limit; i++) {
    for (const key in elements[i]) if (key.startsWith('__reactFiber$')) return (hydrated = true);
  }
  return false;
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
