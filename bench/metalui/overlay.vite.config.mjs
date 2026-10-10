// MetalUI's docs site with the Plumb overlay added, without changing MetalUI: its own Vite config, plus plumb().
// Plumb's root is the repo (theme, tokens and sources live above apps/docs); its config is the benchmark's.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { plumb } from '../../dist/hosts/vite.js';

const metalui = '/Users/vijaysingh/unlocalhosted/metalui';
const vite = await import(pathToFileURL(createRequire(metalui + '/package.json').resolve('vite')).href);
const docs = await vite.loadConfigFromFile({ command: 'serve', mode: 'development' }, metalui + '/apps/docs/vite.config.ts', metalui + '/apps/docs');

export default vite.mergeConfig(docs.config, {
  root: metalui + '/apps/docs',
  plugins: [plumb({ root: metalui, config: new URL('./overlay.plumb.config.ts', import.meta.url).pathname })],
  server: { host: '127.0.0.1', port: 4320, strictPort: true },
});
