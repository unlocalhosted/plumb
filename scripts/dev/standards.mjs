// A dev server on crafting-ui's standards page (fixtures/crafting-ui-standards) set up as a real project, for trying
// the clean-up and the setup steps by hand: node scripts/dev/standards.mjs [port] [--fresh].
// The project lives in fixtures/.dev-standards: its own package.json, vite.config.ts and an installed
// @unlocalhosted/react-plumber (a link to this checkout, as a local install is), so `plumber doctor` run in it answers
// for it, and every setup step is the edit a person would make. Created once; --fresh starts it over. The census is
// taken on start.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const repo = fileURLToPath(new URL('../../', import.meta.url)), root = join(repo, 'fixtures/.dev-standards');
const port = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 5191), fresh = process.argv.includes('--fresh');
if (fresh || !existsSync(join(root, 'package.json'))) {
  await rm(root, { recursive: true, force: true }); await mkdir(root, { recursive: true });
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  // crafting-ui's own shape: React, Tailwind v4, Vite, and the plugin React's Fast Refresh needs, installed but not used yet
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'dev-standards', private: true, type: 'module', scripts: { dev: 'vite' },
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', tailwindcss: '^4.0.0', '@tailwindcss/vite': '^4.0.0' },
    devDependencies: { vite: '^8.0.0', '@vitejs/plugin-react': '^5.0.0', '@unlocalhosted/react-plumber': 'file:../..' } }, null, 2) + '\n');
  await writeFile(join(root, 'vite.config.ts'), `import tailwindcss from '@tailwindcss/vite'
import { plumb } from '@unlocalhosted/react-plumber/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [plumb(), tailwindcss()],
  oxc: { jsx: { runtime: 'automatic', development: true } },
})
`);
  await mkdir(join(root, 'node_modules/@unlocalhosted'), { recursive: true });
  await symlink(repo.replace(/\/$/, ''), join(root, 'node_modules/@unlocalhosted/react-plumber'));
  // and its command, as npm links a package's bin
  await mkdir(join(root, 'node_modules/.bin'), { recursive: true });
  for (const [name, file] of Object.entries(JSON.parse(await readFile(join(repo, 'package.json'), 'utf8')).bin ?? {})) await symlink(join('..', '@unlocalhosted/react-plumber', file), join(root, 'node_modules/.bin', name));
}
const server = await createServer({ root, configFile: join(root, 'vite.config.ts'), cacheDir: join(root, '.vite-cache'), server: { host: '127.0.0.1', port, strictPort: true } });
await server.listen();
const url = `http://127.0.0.1:${port}/`;
// the census runs beside the server, never blocking it: this process is the one serving the pages it reads
const taken = await promisify(execFile)('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root], { cwd: repo, env: { PLUMBER_CHROMIUM: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ...process.env } });
process.stdout.write(taken.stdout);
console.log(`ready ${url}`);
