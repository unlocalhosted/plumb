// The playground's build, shared by every product: the product's own Vite plugins, its `@` alias, and every package
// resolved from its install, so a library part and the product's component share one React and one motion. A package
// the product doesn't have (crafting-ui has no lucide-react) comes from the next install that does.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const PLUMB = fileURLToPath(new URL('../../', import.meta.url));
// the playground as plumber's project: the library parts (vendor/) and the atoms pages are its own source, so plumber
// stamps and judges them; with each product's folder as the root they were outside it, and left unjudged
const PLAYGROUND = fileURLToPath(new URL('./', import.meta.url));
const SPARE = ['/Users/vijaysingh/unlocalhosted/craftingattention/app', '/Users/vijaysingh/unlocalhosted/algorecall'];
const PKGS = ['react', 'react-dom', 'motion', 'clsx', 'tailwind-merge', 'lucide-react'];

export async function playground({ here, root, src = 'src', aliases = [], allow = [] }) {
  const req = createRequire(root + '/package.json');
  const { default: react } = await import(req.resolve('@vitejs/plugin-react'));
  const { default: tailwindcss } = await import(req.resolve('@tailwindcss/vite'));
  // plumber itself, as the products load it: its overlay on the page (Alt+B), judging the atoms live as you use them
  const { plumb } = await import(`${PLUMB}dist/hosts/vite.js`);
  const from = (p) => [root, ...SPARE].find((r) => existsSync(`${r}/node_modules/${p}`)) + '/node_modules/' + p;
  return {
    root: here, publicDir: root + '/public', plugins: [plumb({ root: PLAYGROUND }), react(), tailwindcss()],
    resolve: { alias: [
      ...aliases,
      { find: /^@\//, replacement: `${root}/${src}/` },
      ...PKGS.map((p) => ({ find: new RegExp(`^${p}(\\/.*)?$`), replacement: from(p) + '$1' })),
    ], dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: [here, fileURLToPath(new URL('./', import.meta.url)), root, ...SPARE, PLUMB, ...allow] } },
  };
}
