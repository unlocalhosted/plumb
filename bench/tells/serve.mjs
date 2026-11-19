// Serve the sloppy screens with the plumber plugin and keep them up, to look at the tells in the overlay.
//   ~/.claude/bin/dev-server <plumb>/bench/tells node bench/tells/serve.mjs     (port 4340; the app is deleted on stop)
import { cp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const here = fileURLToPath(new URL('./', import.meta.url));
const repo = join(here, '../../');
const root = join(repo, 'fixtures/.tells-app'); // never git-ignored: plumber finds an app's files through git
await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
await cp(join(here, 'App.jsx'), join(root, 'src/App.jsx'));
const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
  oxc: { jsx: { runtime: 'automatic', development: true } }, server: { host: '127.0.0.1', port: 4340, strictPort: true } });
await server.listen();
console.log('tells screens at http://127.0.0.1:4340/');
const stop = async () => { await server.close(); await rm(root, { recursive: true, force: true }); process.exit(0); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
