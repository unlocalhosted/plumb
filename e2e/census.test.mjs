// `plumber census`: the project's text on every route, measured once and kept, so the type ladder is the project's.
// Found on crafting-ui (docs/briefs/page-cleanup.md): a page proposed its own ladder (Title 21px on /stickers, 19px on
// /motion/standards); a shared component's readings were dropped by whichever page asked, so the "project" ladder
// still moved with the page; the crawl stopped at its cap without saying so. Built from crafting-ui's standards page
// (fixtures/crafting-ui-standards) and a second page in another type, both under one shared header. Real Vite,
// React, Tailwind, the real CLI and Chromium.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);
// a header every page draws, and a page whose own type differs from the standards page's
const HEADER = `export function Header() {
  return (
    <nav className="flex gap-4 text-[13px]">
      <a href="/standards" className="text-[13px]">Standards</a>
      <a href="/stickers" className="text-[13px]">Stickers</a>
    </nav>
  )
}
`;
const STICKERS = `import { Header } from '../components/Header'
export function StickersPage() {
  return (
    <main className="p-8">
      <Header />
      <h1 className="text-[21px] font-medium">Stickers</h1>
      {[1, 2, 3, 4, 5, 6].map((i) => <p key={i} className="text-[15px] leading-[1.6]">A sticker, cut from paper {i}.</p>)}
      <p className="text-[11px] uppercase tracking-[0.08em]">rev A</p>
    </main>
  )
}
`;
const APP = `import { Header } from './components/Header'
import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx'
import { StickersPage } from './pages/StickersPage.tsx'
export function App() {
  const path = location.pathname
  return path === '/stickers' ? <StickersPage /> : <><Header /><MotionStandardsPage /></>
}
`;

async function site(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.census-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/components/Header.tsx'), HEADER);
  await writeFile(join(root, 'src/pages/StickersPage.tsx'), STICKERS);
  await writeFile(join(root, 'src/App.jsx'), APP);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 }, appType: 'spa' });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
const census = (args) => run('node', [cli, 'census', ...args], { cwd: repo, env: process.env, timeout: 240000 }).then((r) => ({ code: 0, ...r }), (e) => ({ code: e.code, stdout: e.stdout, stderr: e.stderr }));

test('census reads every page it can reach, and every page then gets the same ladder of the project', { timeout: 300000 }, async (t) => {
  const { root, url } = await site(t);
  const r = await census(['--url', url, '--root', root, '--json']);
  assert.equal(r.code, 0, r.stderr);
  const said = JSON.parse(r.stdout);
  assert.deepEqual(said.routes.map((x) => x.route).sort(), ['/', '/standards', '/stickers'], 'found from / by its links');
  assert.equal(said.left, 0);
  const kept = JSON.parse(await readFile(join(root, '.plumber/cache/census.json'), 'utf8'));
  assert.ok(kept.entries.every((e) => typeof e.route === 'string' && /#[a-f0-9]{12}$/.test(e.stamp)));

  const session = await serve({ root, watch: false }); t.after(() => session.close());
  const system = async (body) => (await fetch(`http://127.0.0.1:${session.info.port}/__plumb/system`, { method: 'POST', headers: { 'x-plumb-token': session.info.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  const ladder = (res) => res.proposal.ladder.map((l) => `${l.role}=${l.sizeText ?? l.size}`).join(' ');
  const page = (route) => kept.entries.filter((e) => e.route === route);
  // page by page, the two pages disagree (what the overlay does today)
  assert.notEqual(ladder(await system({ census: page('/stickers') })), ladder(await system({ census: page('/standards') })));
  // the project's: the same from either page, though the header is drawn on all of them
  const fromStickers = ladder(await system({ census: page('/stickers'), scope: 'project', route: '/stickers' }));
  const fromStandards = ladder(await system({ census: page('/standards'), scope: 'project', route: '/standards' }));
  assert.equal(fromStickers, fromStandards);
});

test('census says when it stops short, and a changed file\'s readings are left out until it is read again', { timeout: 300000 }, async (t) => {
  const { root, url } = await site(t);
  const r = await census(['--url', url, '--root', root, '--max', '1']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /1 route, \d+ text elements/);
  assert.match(r.stdout, /… 2 more routes found and not read \(--max 1\)/);
  const { projectCensus } = await import('../dist/census.js');
  const before = await projectCensus(root);
  assert.equal(before.stale, 0);
  const header = join(root, 'src/components/Header.tsx');
  await writeFile(header, (await readFile(header, 'utf8')).replace('Standards</a>', 'The standards</a>'));
  const after = await projectCensus(root);
  assert.ok(after.stale > 0 && after.entries.every((e) => !e.stamp.includes('Header')), `stale ${after.stale}`);
});
