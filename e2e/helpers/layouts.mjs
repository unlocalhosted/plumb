// Shared by the project-detection matrix (e2e/project-layouts.test.mjs) and the styling/library detection rows.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const cli = fileURLToPath(new URL('../../dist/cli.js', import.meta.url));
const gitEnv = { ...process.env, GIT_AUTHOR_NAME: 'plumb', GIT_AUTHOR_EMAIL: 'plumb@example.com', GIT_COMMITTER_NAME: 'plumb', GIT_COMMITTER_EMAIL: 'plumb@example.com', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
export const git = (cwd, ...args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: gitEnv });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
};
export async function put(root, files) {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), typeof text === 'string' ? text : JSON.stringify(text, null, 2) + '\n');
  }
}
export async function fixture(t, files = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'plumber-layout-')));
  const cache = await mkdtemp(join(tmpdir(), 'plumber-layout-cache-'));
  t.after(() => Promise.all([root, cache].map(path => rm(path, { recursive: true, force: true }))));
  await put(root, files);
  return { root, cache };
}
export async function snapshot(root) {
  const result = {};
  for (const item of (await readdir(root, { recursive: true, withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(item.parentPath, item.name);
    result[path] = item.isFile() ? (await readFile(path)).toString('base64') : '<folder>';
  }
  return result;
}
/** Runs the built CLI; asserts the exit code and that nothing in the project changed. */
export async function run(project, args, status = 0, cwd = project.root) {
  const before = await snapshot(project.root);
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: project.cache } });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stderr || result.stdout);
  assert.deepEqual(await snapshot(project.root), before, 'no project files or folders written');
  return result;
}
export const json = result => JSON.parse(result.stdout);

/** A single Vite + Tailwind 4 app; Tailwind resolves from this repo's node_modules through a symlink-free copy. */
export const viteApp = (extra = {}) => ({
  'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*', tailwindcss: '^4' } },
  'src/index.css': '@import "tailwindcss";\n@theme { --spacing-s4: 1rem; --color-ink: #111; }\n',
  'src/App.jsx': 'import "./index.css";\nexport const App = () => <div className="p-s4 text-ink" />;\n',
  ...extra,
});
const tailwind = fileURLToPath(new URL('../../node_modules/tailwindcss/', import.meta.url));
export async function installTailwind(root) {
  const target = join(root, 'node_modules/tailwindcss');
  await mkdir(dirname(target), { recursive: true });
  await cp(tailwind, target, { recursive: true, dereference: true });
}

// ---- Cross-cutting checks (design section 5) for every row.
const repo = fileURLToPath(new URL('../../', import.meta.url));
/** (b) every known fact carries evidence, and every evidence file exists under the root. */
export async function checkFacts(root, facts) {
  assert.equal(facts.experimental, true);
  for (const [name, fact] of Object.entries(facts)) {
    if (name === 'experimental') continue;
    assert.ok(['override', 'observed', 'declared', 'inferred', 'unknown'].includes(fact.source), `${name}.source`);
    if (fact.source === 'unknown') continue;
    assert.ok(fact.evidence.length >= 1, `${name} has evidence`);
    for (const item of fact.evidence) {
      assert.ok(typeof item.file === 'string' && Number.isInteger(item.line) && item.line > 0 && typeof item.text === 'string', `${name} evidence shape`);
      await access(join(root, item.file)).catch(() => assert.fail(`${name}: evidence file ${item.file} is missing`));
    }
  }
}
/** A Vite dev server with plumb() on the fixture, serving /__plumb/readiness. */
export async function viteReadiness(t, root, pluginOptions = '') {
  await mkdir(join(root, 'node_modules/@unlocalhosted'), { recursive: true });
  await symlink(repo, join(root, 'node_modules/@unlocalhosted/react-plumber')).catch(error => { if (error.code !== 'EEXIST') throw error; });
  await symlink(join(repo, 'node_modules/vite'), join(root, 'node_modules/vite')).catch(error => { if (error.code !== 'EEXIST') throw error; });
  await writeFile(join(root, 'vite.config.mjs'), `import { plumb } from '@unlocalhosted/react-plumber/vite';\nexport default { plugins: [plumb({ watch: false${pluginOptions} })] };\n`);
  const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: null } });
  try {
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    let response;
    for (let i = 0; i < 200; i++) {
      response = await fetch(`${base}/__plumb/readiness`);
      if (response.status !== 503) break;
      await new Promise(done => setTimeout(done, 30));
    }
    assert.equal(response.status, 200, await response.clone().text());
    return await response.json();
  } finally { await server.close(); }
}
/** (a) the same answer from every entry point: state's facts and readiness's project, host and root source aside. */
export function sameFacts(fromState, fromReadiness) {
  const strip = ({ host, root, ...rest }) => ({ ...rest, root: { ...root, source: undefined, evidence: undefined }, hostId: host.value?.id });
  assert.deepEqual(strip(fromReadiness), strip(fromState));
  assert.equal(fromReadiness.host.source, 'observed');
}

