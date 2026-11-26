// A throwaway app drawn from one file, served with plumber's own plugin, for the proof runs (as bench/tells/run.mjs
// does). Never git-ignored: plumber finds an app's files through git, and an ignored folder reads as an app with no
// source. One at a time: the folder is the same for every run.
import { cp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../../', import.meta.url));

export async function servePage(file) {
  const { createServer } = await import('vite');
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  const { plumb } = await import('@unlocalhosted/react-plumber/vite');
  const root = join(repo, 'fixtures/.proof-app');
  await rm(root, { recursive: true, force: true });
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(resolve(file), join(root, 'src/App.jsx'));
  // `plumber apply` reads the app the way it reads a real one, and a real one has a package.json that names React
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'proof-app', private: true, type: 'module', dependencies: { react: '*', 'react-dom': '*' } }));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  return { url: `http://127.0.0.1:${server.httpServer.address().port}/`, root, close: async () => { await server.close(); await rm(root, { recursive: true, force: true }); } };
}
