// A playground that renders a product's own component from its own source, beside the same component with library
// parts installed. Every package resolves from the product's install, so there is one React.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const CA = '/Users/vijaysingh/unlocalhosted/craftingattention/app';
const req = createRequire(CA + '/package.json');
const { default: react } = await import(req.resolve('@vitejs/plugin-react'));
const { default: tailwindcss } = await import(req.resolve('@tailwindcss/vite'));
const here = fileURLToPath(new URL('./', import.meta.url));
const mod = (p) => CA + '/node_modules/' + p;
export default {
  root: here, publicDir: CA + '/public', plugins: [react(), tailwindcss()],
  resolve: { alias: [
    { find: '@/lib/originApi', replacement: here + 'stubs/originApi.js' },
    { find: '@tanstack/react-router', replacement: here + 'stubs/router.jsx' },
    { find: /^@\//, replacement: CA + '/src/' },
    { find: /^(react|react-dom|motion|clsx|tailwind-merge)(\/.*)?$/, replacement: mod('$1$2') },
  ], dedupe: ['react', 'react-dom'] },
  server: { fs: { allow: [here, CA, '/Users/vijaysingh/unlocalhosted/craftingattention'] } },
};
