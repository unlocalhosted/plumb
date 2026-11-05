// The nextapps corpus: real open-source Next apps cloned (shallow, at a pinned SHA) into .corpus/, never committed.
// Each app is copied into .work (sources only; node_modules stay where pnpm put them) and run through withPlumb:
//   stamped = withPlumb(config, { stamp: true })   the loader's stamps are the ground truth, and the third column
//   plain   = withPlumb(config, { stamp: false })  what a user gets today
// The copy gets three bench-only edits, listed in the report: the app's next.config is renamed and wrapped, the root
// layout gets <PlumbOverlay />, and a route file serves /__plumb. Nothing in .corpus is touched.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { cp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { commonAncestor, freeMemoryPercent, here, nodeModulesHome, repo, spawnHost, workRoot } from './lib.mjs';

export const corpusRoot = join(here, '.corpus');

export const nextApps = {
  tailwindcss: {
    name: 'tailwindcss.com', clone: 'tailwindcss', sha: '7f92c22', dir: '.', ownBundler: 'turbopack', next: '16.2.6',
    routes: ['/', '/docs/padding', '/docs/installation/using-vite', '/showcase', '/partners'],
    note: 'Licence is education-only: no code from this app is committed, only numbers. /blog is not measured: the unmodified app\'s own dev server runs out of heap there (6 GB, in JSON.parse), with or without Plumber; /partners replaces it.',
  },
  magicui: {
    name: 'magicui', clone: 'magicui', sha: '37ce829', dir: 'apps/www', ownBundler: 'webpack', next: '15.5.28',
    routes: ['/', '/docs', '/docs/components/marquee', '/blog', '/showcase'],
    env: { NEXT_PUBLIC_APP_URL: 'http://localhost:3000' },
    note: 'next.config sets experimental.inlineCss: true.',
  },
  shadcn: {
    name: 'shadcn/ui (apps/v4)', clone: 'shadcn', sha: '8a35366', dir: 'apps/v4', ownBundler: 'turbopack', next: '16.4.2',
    routes: ['/', '/examples/dashboard', '/docs/components/button', '/charts/area', '/blocks'],
    env: { NEXT_PUBLIC_V0_URL: 'https://v0.dev', NEXT_PUBLIC_APP_URL: 'http://localhost:4000' },
    note: 'Needs generated styles/ from `registry:build --style all`; the bench runs `next dev` directly (its dev script also starts icons:dev).',
  },
};

// Waits until memory is not under pressure (20% free), up to 5 minutes; the harness's guard, applied before every heavy step.
export async function waitForMemory(log = () => {}) {
  for (let i = 0; i < 60; i++) {
    const free = freeMemoryPercent();
    if (free >= 20) return free;
    if (i === 0) log(`only ${free}% memory free; waiting`);
    await delay(5000);
  }
  throw new Error('memory stayed under 20% free for 5 minutes');
}

const CONFIG_NAMES = ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs', 'next.config.mts'];

// Copies the app (and, for a monorepo, its whole repo) without node_modules/.git/.next, then links every node_modules
// back to the clone's, and applies the three listed edits.
export async function prepareCopy(key, destRoot) {
  const def = nextApps[key];
  const source = join(corpusRoot, def.clone);
  const dest = join(destRoot, def.clone);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  const rsync = spawnSync('rsync', ['-a', '--exclude', 'node_modules', '--exclude', '.git', '--exclude', '.next', '--exclude', '.turbo', source + '/', dest + '/'], { encoding: 'utf8' });
  if (rsync.status !== 0) throw new Error('rsync failed: ' + rsync.stderr);
  // a git repo again, so Tailwind's source scan honours .gitignore (without it, it scans the linked node_modules)
  spawnSync('git', ['init', '-q'], { cwd: dest });
  // every node_modules of the clone (root, apps/*, packages/*), linked in place
  const links = [];
  const visit = (rel, depth) => {
    const here = join(source, rel);
    if (existsSync(join(here, 'node_modules'))) links.push(join(rel, 'node_modules'));
    if (depth >= 2) return;
    for (const name of readdirSync(here)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const child = join(here, name);
      if (statSync(child).isDirectory() && (rel === '' || rel === 'apps' || rel === 'packages')) visit(join(rel, name), depth + 1);
    }
  };
  visit('', 0);
  for (const rel of links) { await mkdir(dirname(join(dest, rel)), { recursive: true }); await symlink(join(source, rel), join(dest, rel), 'dir').catch(() => {}); }
  const app = join(dest, def.dir);
  const edits = [];
  // 1. next.config wrapped
  const configName = CONFIG_NAMES.find((n) => existsSync(join(app, n)));
  if (!configName) throw new Error('no next.config in ' + app);
  const ext = configName.slice('next.config.'.length);
  await rename(join(app, configName), join(app, `next.config.orig.${ext}`));
  const dist = new URL('../../dist/hosts/next-config.js', import.meta.url).href;
  const wrapper = `import * as original from '${/^m?ts$/.test(ext) ? './next.config.orig' : `./next.config.orig.${ext}`}';
const base = original.default ?? original;
export default async (phase, context) => {
  const { withPlumb } = await new Function('u', 'return import(u)')(${JSON.stringify(dist)}); // a real import(), whatever the config's own transpiler does
  const config = typeof base === 'function' ? await base(phase, context) : base;
  const wrapped = withPlumb(config, { stamp: process.env.PLUMB_BENCH_STAMP === '1' });
  return { ...wrapped, turbopack: { ...wrapped.turbopack, root: ${JSON.stringify(commonAncestor(repo, nodeModulesHome(), corpusRoot))} } };
};
`;
  await writeFile(join(app, configName), wrapper);
  edits.push(`${relative(dest, join(app, configName))}: renamed to next.config.orig.${ext}; a bench wrapper imports it, calls withPlumb(config, { stamp }) and sets turbopack.root`);
  // 2. root layout gets the overlay
  const layoutPath = ['app/layout.tsx', 'src/app/layout.tsx', 'app/layout.jsx', 'src/app/layout.jsx'].map((p) => join(app, p)).find(existsSync);
  const layout = await readFile(layoutPath, 'utf8');
  if (!/<\/body>/.test(layout)) throw new Error('root layout has no </body>: ' + layoutPath);
  await writeFile(layoutPath, `import { PlumbOverlay } from '@unlocalhosted/react-plumber/next/overlay';\n` + layout.replace(/<\/body>/, '<PlumbOverlay /></body>'));
  edits.push(`${relative(dest, layoutPath)}: one import line added at the top and <PlumbOverlay /> before </body>`);
  // 3. the /__plumb route
  const routeBase = layoutPath.includes('/src/app/') ? 'src/app' : 'app';
  await mkdir(join(app, routeBase, '%5F_plumb/[...path]'), { recursive: true });
  await writeFile(join(app, routeBase, '%5F_plumb/[...path]/route.plumb.ts'), "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next';\nexport const runtime = 'nodejs';\nexport const { GET, POST } = createPlumbRoute({ watch: false });\n");
  edits.push(`${routeBase}/%5F_plumb/[...path]/route.plumb.ts: added (serves /__plumb)`);
  // env stubs
  const envFile = ['.env.example'].map((n) => join(app, n)).find(existsSync);
  if (envFile) await writeFile(join(app, '.env.local'), await readFile(envFile, 'utf8'));
  // The package, linked into the clone's own node_modules (a scratch folder, like a user's `npm install` would), because
  // Turbopack does not look for it above the app.
  const pkgLink = join(source, def.dir, 'node_modules/@unlocalhosted/react-plumber');
  if (!existsSync(pkgLink)) { await mkdir(dirname(pkgLink), { recursive: true }); await symlink(repo, pkgLink, 'dir'); }
  return { app, edits };
}

// stamp: false (plain), 'full' (every JSX opening, as stampJSX does) or 'host' (DOM tags only; the fallback when full stamping breaks rendering)
export async function startNextApp(key, app, bundler, stamp) {
  const def = nextApps[key];
  const major = Number(def.next.split('.')[0]);
  const flag = bundler === 'turbopack' ? ['--turbopack'] : major >= 16 ? ['--webpack'] : [];
  const env = { NEXT_TELEMETRY_DISABLED: '1', PLUMB_CACHE_DIR: join(app, '.plumb-cache'), PLUMB_BENCH_STAMP: stamp ? '1' : '0', PLUMB_STAMP_HOST_ONLY: stamp === 'host' ? '1' : '0', NODE_OPTIONS: '--max-old-space-size=6144', NEXT_FONT_GOOGLE_MOCKED_RESPONSES: join(here, 'font-mock.cjs'), NODE_ENV: undefined, ...(def.env ?? {}) };
  return spawnHost({
    file: join(app, 'node_modules/next/dist/bin/next'), args: ['dev', ...flag, '--hostname', '127.0.0.1', '--port', '0'],
    cwd: app, env, label: `${def.name} ${bundler} ${stamp ? 'stamped' : 'plain'}${stamp === 'host' ? ' (host tags only)' : ''}`, timeoutMs: 300_000,
    ready: (logs) => (/Ready in/.test(logs) ? /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0] : null),
  });
}
export { workRoot };
