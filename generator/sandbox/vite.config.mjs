import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
// a part that imports something the sandbox lacks fails on its own, at load, without stopping the page
// every part's packages are found and bundled once at startup: discovered one part at a time, the server re-bundled
// and reloaded the page mid-test (the first stage 3 run lost 168 of 304 parts to that)
export default { root: here, plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] }, // no live reloading: a recording needs none, and one part's failed import used to reload every open page mid-test
  server: { fs: { allow: [here] }, hmr: false, watch: null }, logLevel: 'warn',
  optimizeDeps: { entries: ['main.jsx', 'parts/*/entry.jsx'], holdUntilCrawlEnd: true } };
