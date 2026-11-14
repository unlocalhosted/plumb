// Plumb's dev client: the overlay, plus the locate/site pair the integration tests drive directly.
import { locate } from './src/locate.js';
import { request } from './src/api.js';
import { mountOverlay } from './src/widget.js';
import { craftRun } from './src/craft-run.js';
import { readGuides } from './src/guides.js';
import { readNotes, showRoast, hideRoast, toggleRoast } from './src/roast.js';

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
  // The lines things sit on, across the whole screen, and what is off them.
  guides: { read: readGuides },
  // A principal designer's notes on the screen, one at a time, each with its fix (Alt+G).
  roast: { read: readNotes, show: showRoast, hide: hideRoast, toggle: toggleRoast },
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
