// Plumb's dev client: the overlay, plus the locate/site pair the integration tests drive directly.
import { locate } from './src/locate.js';
import { request } from './src/api.js';
import { mountOverlay } from './src/widget.js';
import { craftRun } from './src/craft-run.js';
import { readGuides, showGuides, hideGuides, toggleGuides } from './src/guides.js';
import { readBreaks, showBreakIt, hideBreakIt, toggleBreakIt } from './src/breakit.js';

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
  // The lines things sit on, across the whole screen (Alt+G): read and drawn, not judged yet.
  guides: { read: readGuides, show: showGuides, hide: hideGuides, toggle: toggleGuides },
  // Break the screen on purpose (Alt+S): longer words, and what breaks under them.
  breakIt: { read: readBreaks, show: showBreakIt, hide: hideBreakIt, toggle: toggleBreakIt },
  // Resolves once Plumb has finished its first read of the project (the dev server never waits for it).
  async ready(interval = 100) {
    for (;;) {
      const health = await request('health', {}).catch(() => null);
      if (health?.status === 'ready') return health;
      if (health?.status === 'failed') throw new Error(health.diagnostic ?? 'Plumb failed to start.');
      await new Promise(r => setTimeout(r, interval));
    }
  },
};

const health = await request('health', {});
console.debug('[plumb] overlay connected', health);
