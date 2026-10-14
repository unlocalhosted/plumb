// The homepage: a page built on its own design system, with Plumber's overlay on it so a visitor can inspect it.
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import gfm from 'remark-gfm';
import { plumb } from '../dist/hosts/vite.js';

export default ({ mode, command = 'serve' }) => {
  // Vite's build() leaves NODE_ENV set in API callers that next create a dev
  // server. Keep React's dependency runtime and our JSX transform in agreement.
  process.env.NODE_ENV = command === 'build' ? 'production' : 'development';
  return {
    root: import.meta.dirname,
    // Concurrent dev servers must not overwrite each other's optimized runtimes.
    cacheDir: path.resolve(import.meta.dirname, 'node_modules/.vite-site', String(process.pid)),
    // MDX first: docs pages compile to JSX before anything else sees them
    plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [gfm] }) }, tailwindcss(), plumb({ config: 'plumber.config.mjs',
      demo: mode === 'record-replay' ? undefined : { replay: 'src/hero/replay.js', guard: true } })],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') }, dedupe: ['react', 'react-dom'] },
    oxc: { jsx: { runtime: 'automatic', development: command === 'serve' } },
    server: { host: '127.0.0.1', port: 4327, strictPort: true },
  };
};
