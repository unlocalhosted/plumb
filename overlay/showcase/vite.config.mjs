// Quarry, the craft showcase (docs/craft/showcase.md): its own project, so React Plumber judges it by its own theme.
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../../dist/hosts/vite.js';

export default {
  root: import.meta.dirname,
  plugins: [tailwindcss(), plumb()],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  server: { host: '127.0.0.1', port: 4312, strictPort: true },
};
