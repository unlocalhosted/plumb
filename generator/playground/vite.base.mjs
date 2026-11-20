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

// the owner's keep or drop on each suggestion, with the reason: the first answer key for training (button-poc.md,
// stage 8). POST appends one line to generator/data/labels/owner.jsonl; GET returns every line so the page shows them.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
const LABELS = fileURLToPath(new URL('../data/labels/', import.meta.url));
const ownerVerdicts = () => ({ name: 'owner-verdicts', configureServer(server) {
  server.middlewares.use('/__owner-verdict', (req, res) => {
    if (req.method === 'POST') { let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      try { const v = JSON.parse(body); mkdirSync(LABELS, { recursive: true });
        appendFileSync(`${LABELS}owner.jsonl`, JSON.stringify({ ...v, at: new Date().toISOString() }) + '\n'); res.end('{"ok":true}'); }
      catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: String(e) })); } }); return; }
    let lines = []; try { lines = readFileSync(`${LABELS}owner.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch {}
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(lines));
  }); } });

export async function playground({ here, root, src = 'src', aliases = [], allow = [] }) {
  const req = createRequire(root + '/package.json');
  const { default: react } = await import(req.resolve('@vitejs/plugin-react'));
  const { default: tailwindcss } = await import(req.resolve('@tailwindcss/vite'));
  // plumber itself, as the products load it: its overlay on the page (Alt+B), judging the atoms live as you use them
  const { plumb } = await import(`${PLUMB}dist/hosts/vite.js`);
  const from = (p) => [root, ...SPARE].find((r) => existsSync(`${r}/node_modules/${p}`)) + '/node_modules/' + p;
  return {
    root: here, publicDir: root + '/public', plugins: [plumb({ root: PLAYGROUND }), ownerVerdicts(), react(), tailwindcss()],
    resolve: { alias: [
      ...aliases,
      { find: /^@\//, replacement: `${root}/${src}/` },
      ...PKGS.map((p) => ({ find: new RegExp(`^${p}(\\/.*)?$`), replacement: from(p) + '$1' })),
    ], dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: [here, fileURLToPath(new URL('./', import.meta.url)), root, ...SPARE, PLUMB, ...allow] } },
  };
}
