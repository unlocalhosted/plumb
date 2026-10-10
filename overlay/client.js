// Plumb's dev client: the overlay, plus the locate/site pair the integration tests drive directly.
import { locate } from './src/locate.js';
import { request } from './src/api.js';
import { mountOverlay } from './src/widget.js';

window.__plumb = {
  locate,
  async site(element) {
    const location = await locate(element);
    if (!location) return null;
    return request('site', { file: location.file, line: location.line, column: location.column });
  },
  overlay: mountOverlay(),
};

const health = await request('health', {});
console.debug('[plumb] overlay connected', health);
