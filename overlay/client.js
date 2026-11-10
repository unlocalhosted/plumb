// Plumb's dev client: the overlay, plus the locate/site pair the integration tests drive directly.
import { locate } from './src/locate.js';
import { request } from './src/api.js';
import { mountOverlay } from './src/widget.js';
import { craftRun } from './src/craft-run.js';
import { hostSynced, whenHydrated } from './src/hydration.js';

window.__plumb = {
  locate,
  async site(element) {
    const location = await locate(element);
    if (!location) return null;
    return request('site', { file: location.file, line: location.line, column: location.column });
  },
  overlay: mountOverlay(),
  // The craft engine over the whole page, as plain JSON (plumber craft).
  craft: options => craftRun(window.__plumb.overlay, options),
  // Resolves once Plumb has finished its first read of the project (the dev server never waits for it) and the page is
  // one that can be read: React has hydrated it, and on Next the host's client has had its first sync (a reload on a
  // changed bundle hash restarts the overlay with the page). Both bounded, so a page without React still resolves.
  async ready(interval = 100) {
    for (;;) {
      const health = await request('health', {}).catch(() => null);
      if (health?.status === 'ready') {
        const hydrated = await whenHydrated({ timeout: 30000 });
        await hostSynced();
        return { ...health, hydrated };
      }
      if (health?.status === 'failed') throw new Error(health.diagnostic ?? 'Plumb failed to start.');
      await new Promise(r => setTimeout(r, interval));
    }
  },
};

const health = await request('health', {});
console.debug('[plumb] overlay connected', health);
