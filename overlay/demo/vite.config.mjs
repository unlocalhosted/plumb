// The overlay's working host: a small settings page on the real Vite plugin, built from the local package.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { plumb } from '../../dist/hosts/vite.js';

export default {
  root: import.meta.dirname,
  // React's Fast Refresh, as an app made from Vite's React template has: a fix lands as a hot update and the page
  // keeps its state. Without it every write reloaded the demo (docs/briefs/no-reload-writes.md).
  plugins: [plumb(), react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 4311, strictPort: true },
};
