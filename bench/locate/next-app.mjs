// A generated Next 16 app (app router) that renders the same screen files, one client page per screen at /s/NN, with
// Tailwind v4 through @tailwindcss/postcss and withPlumb from the package's own build. Modelled on
// e2e/blueprint-next-performance.test.mjs and e2e/next-install.test.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { commonAncestor, here, nodeModulesHome, repo, spawnHost } from './lib.mjs';
import { apiBody, copyShowcaseSource } from './showcase.mjs';

const POSTCSS_VERSION = '4.3.3'; // matches the repo's tailwindcss / @tailwindcss/vite

// @tailwindcss/postcss is not a dependency of the repo; install it once beside the bench, never into the repo's node_modules.
export function ensureTailwindPostcss() {
  const tools = join(here, '.tools');
  const installed = join(tools, 'node_modules/@tailwindcss/postcss');
  if (existsSync(installed)) return tools;
  spawnSync('mkdir', ['-p', tools]);
  const result = spawnSync('npm', ['install', '--prefix', tools, `@tailwindcss/postcss@${POSTCSS_VERSION}`, '--no-audit', '--no-fund', '--ignore-scripts', '--package-lock=false'], { encoding: 'utf8' });
  if (result.status !== 0 || !existsSync(installed)) throw new Error('Could not install @tailwindcss/postcss for the Next hosts:\n' + result.stderr + result.stdout);
  return tools;
}

export async function writeNextApp(dest, showcase, { bundler }) {
  const w = async (path, text) => { await mkdir(dirname(join(dest, path)), { recursive: true }); await writeFile(join(dest, path), text); };
  await copyShowcaseSource(showcase, dest);
  await w('package.json', JSON.stringify({ name: 'locate-bench-next', private: true, type: 'module', dependencies: { next: '^16.4.0', react: '^19.3.0', 'react-dom': '^19.3.0' } }));
  const tools = ensureTailwindPostcss();
  // plugins resolve from the app; the tools folder holds @tailwindcss/postcss and its own dependencies
  await mkdir(join(dest, 'node_modules/@tailwindcss'), { recursive: true });
  await symlink(join(tools, 'node_modules/@tailwindcss/postcss'), join(dest, 'node_modules/@tailwindcss/postcss'), 'dir');
  await mkdir(join(dest, 'node_modules/@unlocalhosted'), { recursive: true });
  await symlink(repo, join(dest, 'node_modules/@unlocalhosted/react-plumber'), 'dir');
  await w('postcss.config.mjs', "export default { plugins: { '@tailwindcss/postcss': {} } };\n");
  const root = commonAncestor(repo, nodeModulesHome(), tools);
  await w('next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(root)} } });
`);
  await w('plumber.config.mjs', "export default { css: 'src/theme.css', source: ['src/**/*.{jsx,js,css}', 'app/**/*.jsx'] };\n");
  await w('app/layout.jsx', `import { PlumbOverlay } from '@unlocalhosted/react-plumber/next';
import '../src/theme.css';
export default function Layout({ children }) { return <html lang="en"><body>{children}<PlumbOverlay /></body></html>; }
`);
  await w('app/page.jsx', "export default function Home() { return <main>locate bench</main>; }\n");
  await w('app/%5F_plumb/[...path]/route.plumb.ts', "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next'; export const runtime = 'nodejs'; export const { GET, POST } = createPlumbRoute({ watch: false });\n");
  // the showcase's /api, for screens 66 and 77
  const api = JSON.stringify({ activity: apiBody('/activity'), other: apiBody('/x') });
  await w('app/api/[...path]/route.js', `const bodies = ${api};
export const dynamic = 'force-dynamic';
export async function GET(request) {
  await new Promise((done) => setTimeout(done, 120));
  return Response.json(new URL(request.url).pathname.startsWith('/api/activity') ? bodies.activity : bodies.other);
}
export const POST = GET;
`);
  for (const screen of showcase.screens) {
    await w(`app/s/${screen.id}/page.jsx`, `'use client';
import Screen from '../../../src/principles/screens/${screen.file}';
export default function Page() { return <div id="bench-root" data-example><Screen side="broken" onStatus={() => {}} /></div>; }
`);
  }
  return { bundler };
}

export async function startNext(dest, bundler) {
  const env = { NEXT_TELEMETRY_DISABLED: '1', PLUMB_CACHE_DIR: join(dest, '.plumb-cache') };
  const host = await spawnHost({
    file: join(repo, 'node_modules/next/dist/bin/next'), args: ['dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'],
    cwd: dest, env: { ...env, NODE_ENV: undefined }, label: 'next ' + bundler,
    ready: (logs) => (/Ready in/.test(logs) ? /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0] : null),
  });
  return host;
}
