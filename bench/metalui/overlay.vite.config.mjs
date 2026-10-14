// MetalUI's docs site with the React Plumber overlay added, without changing MetalUI: its own Vite config, plus plumb().
// React Plumber's root is the repo (theme, tokens and sources live above apps/docs); its config is the benchmark's.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { plumb } from '../../dist/hosts/vite.js';

const metalui = '/Users/vijaysingh/unlocalhosted/metalui';
const vite = await import(pathToFileURL(createRequire(metalui + '/package.json').resolve('vite')).href);
const docs = await vite.loadConfigFromFile({ command: 'serve', mode: 'development' }, metalui + '/apps/docs/vite.config.ts', metalui + '/apps/docs');

// plumb() goes first: it stamps JSX with its source position, so it must see the JSX before React's transform does.
const own = { ...docs.config, plugins: [plumb({ root: metalui, config: new URL('./overlay.plumber.config.ts', import.meta.url).pathname }), ...(docs.config.plugins ?? [])] };
export default vite.mergeConfig(own, {
  root: metalui + '/apps/docs',
  server: { host: '127.0.0.1', port: 4320, strictPort: true },
});
