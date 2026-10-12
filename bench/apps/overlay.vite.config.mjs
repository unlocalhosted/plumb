// Any Vite app with the Plumb overlay added, without changing the app: its own Vite config, plus plumb().
//   PLUMB_APP=/path/to/app [PLUMB_ROOT=/path/to/repo] [PLUMB_CONFIG=/path/to/plumb.config.ts] [PLUMB_PORT=4330]
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { plumb } from '../../dist/hosts/vite.js';

const app = process.env.PLUMB_APP;
if (!app) throw new Error('Set PLUMB_APP to the app directory.');
const vite = await import(pathToFileURL(createRequire(join(app, 'package.json')).resolve('vite')).href);
const file = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'].map(f => join(app, f)).find(existsSync);
const own = file ? (await vite.loadConfigFromFile({ command: 'serve', mode: 'development' }, file, app)).config : {};

// plumb() goes first: it stamps JSX with its source position, so it must see the JSX before React's transform does.
export default vite.mergeConfig({ ...own, plugins: [plumb({ root: process.env.PLUMB_ROOT ?? app, ...(process.env.PLUMB_CONFIG ? { config: process.env.PLUMB_CONFIG } : {}) }), ...(own.plugins ?? [])] }, {
  root: own.root ?? app,
  server: { host: '127.0.0.1', port: Number(process.env.PLUMB_PORT ?? 4330), strictPort: true },
});
