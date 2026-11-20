// Builds the recommendations' live buttons into the plumber site (web/public/research/buy-recommendations/app/).
//   node_modules/.bin/vite build --config generator/recommend/vite.config.mjs   (from crafting attention's install)
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = fileURLToPath(new URL('./', import.meta.url));
const CA = '/Users/vijaysingh/unlocalhosted/craftingattention/app';
const req = createRequire(CA + '/package.json');
const { default: react } = await import(req.resolve('@vitejs/plugin-react'));
export default { root: here, base: './', plugins: [react()],
  resolve: { alias: [{ find: /^react(-dom)?(\/.*)?$/, replacement: CA + '/node_modules/react$1$2' }], dedupe: ['react', 'react-dom'] },
  build: { outDir: fileURLToPath(new URL('../../web/public/research/buy-recommendations/app/', import.meta.url)), emptyOutDir: true } };
