// The sloppy Ledger: the same app with no rules accepted, so plumber finds everything (demos). plumber is loaded
// from this repo's build, so the example always runs the plumber you just built (npm run build at the repo root).
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { plumb } from '../../dist/hosts/vite.js';
import { demoReset } from '../demo-reset.js';

export default defineConfig({
  // React Fast Refresh right after plumb(): a fix lands in place instead of reloading the page
  plugins: [tailwindcss(), plumb(), react(), demoReset()],
  cacheDir: '.vite-cache',
  server: { host: '127.0.0.1', port: 4341, strictPort: true },
});
