// Quarry, the craft showcase (docs/craft/showcase.md): its own project, so React Plumber judges it by its own theme.
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../../dist/hosts/vite.js';

// Quarry's backend, as far as the showcase needs one: the activity feed and a refresh, each a short wait away
const api = {
  name: 'quarry-api',
  configureServer(server) {
    server.middlewares.use('/api', (req, res) => {
      const body = req.url.startsWith('/activity')
        ? [{ id: 1, what: 'Halden & Co. opened INV-2041', when: '2 min ago' }, { id: 2, what: 'Northfield Dental paid INV-2040', when: '1 h ago' }, { id: 3, what: 'Reminder sent for INV-2039', when: 'Yesterday' }]
        : { ok: true };
      setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); }, 120);
    });
  },
};

export default {
  root: import.meta.dirname,
  plugins: [tailwindcss(), plumb(), api],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  server: { host: '127.0.0.1', port: 4312, strictPort: true },
};
