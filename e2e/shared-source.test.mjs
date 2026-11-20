import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const api = (page, method, params = {}, post = false) => page.evaluate(async ({ method, params, post }) => {
  const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
  const response = await fetch('/__plumb/' + method + (post ? '' : '?' + new URLSearchParams(params)), { method: post ? 'POST' : 'GET', headers: { ...(token ? { 'x-plumb-token': token } : {}), ...(post ? { 'Content-Type': 'application/json' } : {}) }, ...(post ? { body: JSON.stringify(params) } : {}) });
  return { status: response.status, body: await response.json() };
}, { method, params, post });
for (const host of ['vite', 'next']) for (const checked of [false, true])

test('source globs refuse workspace escapes and symlinks; Windows selectors select shared files', async t => {
  const { Session, check } = await import('../dist/index.js');
  const parent = await mkdtemp(join(repo, 'fixtures/.source-boundary-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/shared-source'), parent, { recursive: true });
  const root = join(parent, 'vite'), config = join(root, 'plumber.config.mjs');
  for (const pattern of ['../../**/*.jsx', '..\\..\\**\\*.jsx', '../src/**/../../**', 'C:\\outside\\**', '\\\\host\\share\\**']) {
    await writeFile(config, `export default { source: ${JSON.stringify([pattern])} };`);
    await assert.rejects(Session.create({ root, watch: false }), /repository\/workspace root/, pattern);
  }
  await symlink(join(repo, 'src'), join(parent, 'src/escape'));
  await writeFile(config, `export default { source: ['app/**', '..\\\\src\\\\**'] };`);
  const report = await check({ root });
  assert.ok(report.declarations.some(d => d.site.file === join(parent, 'src/screens/Board.jsx')));
  assert.ok(!report.declarations.some(d => d.site.file.includes('/escape/')));
  const session = await Session.create({ root, watch: false }); t.after(() => session.close());
  assert.deepEqual(await session.resolveSource('file://' + join(parent, 'src/escape/index.ts')), { library: true, untracked: '../src/escape/index.ts' });
  await assert.rejects(session.edits('../src/escape/index.ts', 1), /inside the project root/);
  await assert.rejects(session.apply({ file: '../src/escape/index.ts', hash: 'unproved', edits: [{ id: 'unproved' }] }), /inside the project root/);
  const board = join(parent, 'src/screens/Board.jsx');
  await rm(board); await symlink(join(repo, 'src/index.ts'), board);
  for (const method of ['text', 'site', 'edits']) await assert.rejects(session[method]('../src/screens/Board.jsx', 3, 30), /symbolic links/);
});
