// plumber init writes no `source`: your code is what the rule says it is, with its installed, generated and git-ignored
// filters. On a project with a git-ignored folder and an installed package: the written config has no `source`; the
// app's code is stamped, the ignored folder's and the package's are not.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }

test('init writes no source; the rule leaves out the git-ignored folder and the installed package, and stamps the app', { timeout: 120000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.init-source-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'plumber.config.ts'));
  await file(root, 'package.json', '{"name":"init-source","private":true,"type":"module"}');
  await file(root, '.gitignore', 'src/__generated__/\n');
  await file(root, 'src/__generated__/Gen.jsx', 'export function Gen() { return <b id="generated" className="p-[13px]">Generated</b>; }\n');
  await file(root, 'src/components/Hero.jsx', 'export function Hero() { return <h1 id="hero" className="mt-[10px]">Hero</h1>; }\n');
  await file(root, 'node_modules/init-lib/package.json', '{"name":"init-lib","type":"module","exports":"./index.jsx"}');
  await file(root, 'node_modules/init-lib/index.jsx', 'export function Lib() { return <u id="lib" className="p-[7px]">Lib</u>; }\n');
  spawnSync('git', ['init', '-q'], { cwd: root });
  const init = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'init', '--force', '--root', root], { cwd: repo, encoding: 'utf8', env: { ...process.env, PLUMB_CACHE_DIR: join(root, '.plumb-cache') } });
  assert.equal(init.status, 0, init.stderr + init.stdout);
  const name = (await readdir(root)).find(entry => /^plumber\.config\./.test(entry));
  assert.ok(name, 'a config was written');
  const text = await readFile(join(root, name), 'utf8');
  assert.doesNotMatch(text, /"source"|\bsource:/, text);
  // the rule, through the real host: the app's files are stamped, the ignored folder's and the package's are not
  const server = await createServer({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent', plugins: [plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-dev-runtime', 'init-lib'] },
    server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });
  t.after(() => server.close()); await server.listen();
  const stamped = async id => (await server.transformRequest(id)).code.includes('"data-plumb-source": "');
  assert.equal(await stamped('/src/App.tsx'), true, 'src/App.tsx');
  assert.equal(await stamped('/src/components/Hero.jsx'), true, 'src/components/Hero.jsx');
  assert.equal(await stamped('/src/__generated__/Gen.jsx'), false, 'the git-ignored folder');
  assert.equal(await stamped('/node_modules/init-lib/index.jsx'), false, 'the installed package');
});
