// The overlay's working host: a small settings page on the real Vite plugin, built from the local package.
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../../dist/hosts/vite.js';

export default {
  root: import.meta.dirname,
  plugins: [tailwindcss(), plumb()],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  server: { host: '127.0.0.1', port: 4311, strictPort: true },
};
