// A messy page to judge plumber's decisions on: a dashboard written the way an LLM writes one over several prompts,
// in a project that has a design system (src/styles.css) the page only half follows. Not a test fixture, not a demo.
//   ~/.claude/bin/dev-server bench/messy npx vite --config bench/messy/vite.config.mjs
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../../dist/hosts/vite.js';

export default {
  root: import.meta.dirname,
  plugins: [tailwindcss(), plumb()],
  oxc: { jsx: { runtime: 'automatic', development: true } },
  server: { host: '127.0.0.1', port: 4313, strictPort: true },
};
