// The homepage: a page built on its own design system, with Plumb's overlay on it so a visitor can inspect it.
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import gfm from 'remark-gfm';
import { plumb } from '../dist/hosts/vite.js';

export default ({ mode, command = 'serve' }) => ({
  root: import.meta.dirname,
  // MDX first: docs pages compile to JSX before anything else sees them
  plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [gfm] }) }, tailwindcss(), plumb({ config: 'plumber.config.mjs',
    demo: mode === 'record-replay' ? undefined : { replay: 'src/hero/replay.js', guard: true } })],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') }, dedupe: ['react', 'react-dom'] },
  oxc: { jsx: { runtime: 'automatic', development: command === 'serve' } },
  server: { host: '127.0.0.1', port: 4327, strictPort: true },
});
