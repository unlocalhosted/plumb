// A showcase-shaped Vite dev server in its own process (port 0): Tailwind v4 + plumb(), as overlay/showcase/vite.config.mjs.
//   node vite-host.mjs '{"root":"…","stamp":true,"allow":["…"]}'
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { createServer } from 'vite';
import { plumb } from '../../dist/hosts/vite.js';
import { apiBody } from './showcase.mjs';

const { root, stamp, allow = [] } = JSON.parse(process.argv[2]);
process.env.PLUMB_CACHE_DIR ??= join(root, '.plumb-cache');

// the showcase's quarry-api middleware, which screens 66 and 77 fetch from
const api = {
  name: 'quarry-api',
  configureServer(server) {
    server.middlewares.use('/api', (req, res) => {
      setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(apiBody(req.url))); }, 120);
    });
  },
};

const server = await createServer({
  root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'warn',
  plugins: [tailwindcss(), plumb({ stamp, watch: false }), api],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  // everything the screens import is pre-bundled up front, so no mid-run "optimized dependencies changed" reload
  optimizeDeps: { entries: ['index.html'], include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@radix-ui/react-dropdown-menu', '@unlocalhosted/dither-icons'] },
  server: { host: '127.0.0.1', port: 0, strictPort: false, watch: null, fs: { allow: [root, ...allow] } },
});
await server.listen();
const close = async () => { await server.close().catch(() => {}); process.exit(0); };
process.on('SIGTERM', close); process.on('SIGINT', close); process.on('disconnect', close);
process.send?.({ type: 'listening', origin: `http://127.0.0.1:${server.httpServer.address().port}` });
