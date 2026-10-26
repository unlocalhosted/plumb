import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { createServer } from 'vite';
import { plumb } from '../dist/hosts/vite.js';
import { Session } from '../dist/session/index.js';
import { createWebHandler } from '../dist/session/server.js';

const repo = resolve('.');
const config = `import { defineConfig } from 'vite';
import { plumb as inspect } from '@unlocalhosted/react-plumber/vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [inspect(), react()], server: { hmr: true, watch: { usePolling: true, awaitWriteFinish: true } } });
`;
function run(root, args, input = '', expected = 0, env = {}) {
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args, '--root', root], { cwd: repo, encoding: 'utf8', input, env: { ...process.env, PLUMBER_WATCH_ENV: 'wsl', ...env }, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, expected, result.stderr + result.stdout);
  return result.stdout;
}
async function fixture(t, host = config, sources = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.readiness-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  await writeFile(join(root, 'vite.config.mjs'), host);
  for (const [file, source] of Object.entries(sources)) await writeFile(join(root, file), source);
  run(root, ['init', '--force']);
  return root;
}
async function api(t, root, runtime) {
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  const handler = createWebHandler(session, { token: 'readiness-secret', ...(runtime ? { readiness: runtime } : {}) });
  const request = (path, body, auth = true, method = body === undefined ? 'GET' : 'POST') => handler(new Request(`http://localhost/__plumb/${path}`, { method, headers: { ...(auth ? { 'x-plumb-token': 'readiness-secret' } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
  const report = async () => { const response = await request('readiness'); assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
  return { request, report };
}
const item = (report, id) => { const requirement = report.requirements.find(item => item.id === id); assert.ok(requirement, id); return requirement; };
const runtime = { host: 'vite', development: true, plugin: true, fastRefresh: true, hmr: true, polling: true };

async function startConfig(t, root) {
  await mkdir(join(root, 'node_modules/@unlocalhosted'), { recursive: true });
  await symlink(repo, join(root, 'node_modules/@unlocalhosted/react-plumber')).catch(error => { if (error.code !== 'EEXIST') throw error; });
  await symlink(join(repo, 'node_modules/vite'), join(root, 'node_modules/vite')).catch(error => { if (error.code !== 'EEXIST') throw error; });
  const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  try {
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    const transformed = await fetch(`${base}/src/App.tsx`);
    assert.equal(transformed.status, 200, await transformed.clone().text());
    assert.match(await transformed.text(), /createElement|jsx|jsxDEV/);
    let response;
    for (let i = 0; i < 100; i++) {
      response = await fetch(`${base}/__plumb/readiness`);
      if (response.status !== 503) break;
      await new Promise(done => setTimeout(done, 30));
    }
    assert.equal(response.status, 200, await response.clone().text());
    return { server, ready: await response.json() };
  } finally {
    // Close before fixture deletion; deleting a watched config can restart Vite.
    await server.close();
  }
}

test('Refresh install follows lockfile; rerun offers import diff immediately after Plumber', async t => {
  for (const [manager, lock] of [['npm', 'package-lock.json'], ['pnpm', 'pnpm-lock.yaml'], ['yarn', 'yarn.lock'], ['bun', 'bun.lock']]) {
    await t.test(manager, async t => {
      // Outside the repo: its installed React plugin must not leak into resolution.
      const root = await mkdtemp(join(tmpdir(), 'plumber-refresh-'));
      t.after(() => rm(root, { recursive: true, force: true }));
      await mkdir(join(root, 'src'));
      await mkdir(join(root, 'node_modules/@tailwindcss'), { recursive: true });
      await symlink(join(repo, 'node_modules/react'), join(root, 'node_modules/react'));
      await symlink(join(repo, 'node_modules/@tailwindcss/vite'), join(root, 'node_modules/@tailwindcss/vite'));
      await writeFile(join(root, 'package.json'), '{"type":"module"}');
      await writeFile(join(root, lock), manager === 'npm' ? '{}' : '');
      await writeFile(join(root, 'plumber.config.mjs'), "export default { source: ['src/**'] };");
      await writeFile(join(root, 'src/styles.css'), '.box { padding: 13px; }');
      await writeFile(join(root, 'src/App.tsx'), 'export default function App() { return <div className="box">Ready</div>; }');
      const file = join(root, 'vite.config.mjs');
      await writeFile(file, config.replace("import react from '@vitejs/plugin-react';", "import tailwindcss from '@tailwindcss/vite';").replace('inspect(), react()', 'tailwindcss(), inspect()'));
      const { report, request } = await api(t, root);
      let ready = await report(), fix = item(ready, 'write.refresh').fix;
      assert.equal(item(ready, 'write.refresh').status, 'missing');
      assert.equal(fix.kind, 'step');
      assert.equal(fix.command, `${manager} ${manager === 'npm' ? 'install' : 'add'} -D @vitejs/plugin-react`);
      assert.match(fix.instruction, /rerun plumber doctor.*config diff/);
      const before = await readFile(file, 'utf8');
      assert.match(run(root, ['fix', 'write.refresh']), /config diff/);
      assert.equal(await readFile(file, 'utf8'), before);
      const doctor = run(root, ['doctor'], '', 1);
      assert.ok(doctor.includes(fix.command));
      assert.doesNotMatch(doctor, /\$\{EDITOR|\$EDITOR/);
      // Simulate completed install without invoking any package manager.
      await mkdir(join(root, 'node_modules/@vitejs'), { recursive: true });
      await symlink(join(repo, 'node_modules/@vitejs/plugin-react'), join(root, 'node_modules/@vitejs/plugin-react'));
      ready = await report(); fix = item(ready, 'write.refresh').fix;
      assert.equal(fix.kind, 'diff', JSON.stringify(fix));
      assert.match(fix.diff, /import plumberReact from '@vitejs\/plugin-react'/);
      assert.match(fix.diff, /tailwindcss\(\), inspect\(\), plumberReact\(\)/);
      assert.match(run(root, ['doctor'], '', 1), /plumber fix write.refresh/);
      const applied = await request('readiness/fix', { id: 'write.refresh', hash: fix.hash, confirm: true, allowDirty: true });
      assert.equal(applied.status, 200, await applied.clone().text());
      assert.equal(item(await report(), 'write.refresh').status, 'ok');
      const live = await startConfig(t, root);
      assert.equal(item(live.ready, 'write.refresh').status, 'ok');
    });
  }
});

test('Fast Refresh diff is offered on its own when the config has no plugins at all, and Plumber then goes in front', async t => {
  const root = await fixture(t, "import { defineConfig } from 'vite';\nexport default defineConfig({ server: { hmr: true, watch: { usePolling: true, awaitWriteFinish: true } } });\n");
  const file = join(root, 'vite.config.mjs'), { request, report } = await api(t, root);
  let ready = await report(), refresh = item(ready, 'write.refresh');
  assert.equal(refresh.status, 'missing');
  assert.match(refresh.loses, /reloads the whole page and loses its state/);
  assert.equal(refresh.fix.kind, 'diff', JSON.stringify(refresh.fix));
  assert.match(refresh.fix.diff, /\+import plumberReact from '@vitejs\/plugin-react'/);
  assert.match(refresh.fix.diff, /\+.*plugins: \[plumberReact\(\)\]/);
  const applied = await request('readiness/fix', { id: 'write.refresh', hash: refresh.fix.hash, confirm: true, allowDirty: true });
  assert.equal(applied.status, 200, await applied.clone().text());
  ready = await report();
  assert.equal(item(ready, 'write.refresh').status, 'ok');
  assert.equal(item(ready, 'locate.plugin').status, 'missing');
  run(root, ['fix', 'locate.plugin', '--yes']);
  assert.match(await readFile(file, 'utf8'), /plugins: \[plumb\(\), plumberReact\(\)\]/);
  ready = await report();
  assert.equal(item(ready, 'locate.order').status, 'ok');
  assert.equal(item(ready, 'write.refresh').status, 'ok');
});

test('HMR and polling diffs survive Vite startup for every writable server shape', async t => {
  for (const setting of ['', 'server: {}', 'server: { watch: null }', 'server: { watch: {} }', 'server: { watch: { ignored: ["**/generated/**"], interval: 900, awaitWriteFinish: false } }']) {
    await t.test(setting || 'no server', async t => {
      const root = await fixture(t, config.replace('server: { hmr: true, watch: { usePolling: true, awaitWriteFinish: true } }', setting));
      const { request, report } = await api(t, root);
      const fix = item(await report(), 'write.watcher').fix;
      assert.equal(fix.kind, 'diff');
      assert.match(fix.diff, /interval: 100/);
      assert.match(fix.diff, /usePolling: true/);
      assert.match(fix.diff, /awaitWriteFinish/);
      const doctor = run(root, ['doctor'], '', 1);
      assert.match(doctor, /plumber fix write.watcher/);
      assert.doesNotMatch(doctor, /\$\{EDITOR|\$EDITOR/);
      const applied = await request('readiness/fix', { id: 'write.watcher', hash: fix.hash, confirm: true, allowDirty: true });
      assert.equal(applied.status, 200, await applied.clone().text());
      const live = await startConfig(t, root);
      assert.equal(live.server.config.server.watch.usePolling, true);
      assert.equal(live.server.config.server.watch.interval, 100);
      assert.deepEqual(live.server.config.server.watch.awaitWriteFinish, { stabilityThreshold: 200, pollInterval: 100 });
      if (setting.includes('ignored')) assert.deepEqual(live.server.config.server.watch.ignored, ['**/generated/**']);
    });
  }
  await t.test('hmr false', async t => {
    const root = await fixture(t, config.replace('hmr: true', 'hmr: false'));
    const { report, request } = await api(t, root);
    const fix = item(await report(), 'write.hmr').fix;
    assert.equal(fix.kind, 'diff');
    assert.match(run(root, ['doctor'], '', 1), /plumber fix write.hmr/);
    const applied = await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true, allowDirty: true });
    assert.equal(applied.status, 200, await applied.clone().text());
    const live = await startConfig(t, root);
    assert.equal(item(live.ready, 'write.hmr').status, 'ok');
    assert.notEqual(live.server.config.server.hmr, false);
  });
});

test('HMR removal preserves surrounding config without whitespace or comma debris', async t => {
  const cases = [
    ["{ hmr: false, host: '127.0.0.1', port: 0 }", "{ host: '127.0.0.1', port: 0 }"],
    ["{ host: '127.0.0.1', hmr: false, port: 0 }", "{ host: '127.0.0.1', port: 0 }"],
    ["{ host: '127.0.0.1', port: 0, hmr: false }", "{ host: '127.0.0.1', port: 0 }"],
    ["{ host: '127.0.0.1', port: 0, hmr: false, }", "{ host: '127.0.0.1', port: 0 }"],
    ['{ hmr: false }', '{}'],
    ['{\n    hmr: false,\n    port: 0\n  }', '{\n    port: 0\n  }'],
    ["{\n    host: '127.0.0.1',\n    hmr: false,\n    port: 0\n  }", "{\n    host: '127.0.0.1',\n    port: 0\n  }"],
    ['{\n    port: 0,\n    hmr: false\n  }', '{\n    port: 0\n  }'],
    ['{\n    port: 0,\n    hmr: false,\n  }', '{\n    port: 0\n  }'],
    ['{\n    hmr: false,\n  }', '{\n  }'],
    ['{\r\n    port: 0,\r\n    hmr: false,\r\n  }', '{\r\n    port: 0\r\n  }'],
  ];
  for (const [before, after] of cases) await t.test(JSON.stringify(before), async t => {
    const original = config.replace('server: { hmr: true, watch: { usePolling: true, awaitWriteFinish: true } }', `server: ${before}`);
    const root = await fixture(t, original), { report, request } = await api(t, root);
    const fix = item(await report(), 'write.hmr').fix;
    assert.equal(fix.kind, 'diff');
    const response = await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true, allowDirty: true });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(await readFile(join(root, 'vite.config.mjs'), 'utf8'), original.replace(`server: ${before}`, `server: ${after}`));
    assert.equal(item(await report(), 'write.hmr').status, 'ok');
  });
});

test('JSX order allows Tailwind first; React first offers a minimal diff that starts Vite', async t => {
  const imports = "import tailwindcss from '@tailwindcss/vite';\n";
  for (const [plugins, expected] of [['tailwindcss(), inspect(), react()', 'ok'], ['tailwindcss(), react(), inspect()', 'missing']]) {
    await t.test(plugins, async t => {
      const root = await fixture(t, imports + config.replace('inspect(), react()', plugins));
      const { report, request } = await api(t, root, runtime);
      let ready = await report();
      const order = item(ready, 'locate.order');
      assert.equal(order.status, expected);
      const doctor = run(root, ['doctor'], '', expected === 'ok' ? 0 : 1);
      assert.match(doctor, new RegExp(`${expected === 'ok' ? 'ok' : 'fix'} React Plumber .*\\[locate.order\\]`));
      assert.doesNotMatch(doctor, /must be first/);
      if (expected === 'missing') {
        assert.equal(order.fix.kind, 'diff');
        assert.match(doctor, /plumber fix locate.order/);
        const applied = await request('readiness/fix', { id: order.id, hash: order.fix.hash, confirm: true, allowDirty: true });
        assert.equal(applied.status, 200, await applied.clone().text());
        const written = await readFile(join(root, 'vite.config.mjs'), 'utf8');
        assert.match(written, /\[tailwindcss\(\), inspect\(\), react\(\)/);
        ready = await report();
      }
      for (const id of ['locate', 'preview', 'blueprint']) assert.equal(ready.capabilities.find(item => item.id === id).status, 'full', id);
      assert.notEqual(ready.capabilities.find(item => item.id === 'write').status, 'off');
      const live = await startConfig(t, root);
      assert.equal(item(live.ready, 'locate.order').status, 'ok');
    });
  }
});

test('live-style path and alias imports recognize Plumber order and offer Refresh immediately after it', async t => {
  for (const [specifier, binding, plugins, expected] of [
    ['../../dist/hosts/vite.js', 'plumb', 'plumb({ watch: false }), tailwindcss()', 'ok'],
    ['../../dist/hosts/vite.js', 'plumb as inspect', 'tailwindcss(), inspect({ watch: false })', 'ok'],
    ['plumber-vite-alias', 'plumb as inspect', 'inspect({ watch: false }), tailwindcss()', 'ok'],
    ['../../dist/hosts/vite.js', 'plumb', 'react(), plumb({ watch: false }), tailwindcss()', 'missing'],
  ]) await t.test(`${binding} from ${specifier}: ${plugins}`, async t => {
    const root = await mkdtemp(join(repo, 'fixtures/.apply-live-style-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
    await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    if (specifier === 'plumber-vite-alias') {
      const alias = join(root, 'node_modules/plumber-vite-alias');
      await mkdir(alias, { recursive: true });
      await writeFile(join(alias, 'package.json'), '{"type":"module","exports":"./vite.js"}');
      await writeFile(join(alias, 'vite.js'), `export { plumb } from '${join(repo, 'dist/hosts/vite.js')}';`);
    }
    const original = `import { ${binding} } from '${specifier}';\nimport tailwindcss from '@tailwindcss/vite';\n${expected === 'missing' ? "import react from '@vitejs/plugin-react';\n" : ''}export default {\n  plugins: [${plugins}],\n  oxc: { jsx: { runtime: 'automatic', development: true } },\n  server: { host: '127.0.0.1', port: 0, hmr: false }\n};\n`;
    const file = join(root, 'vite.config.mjs');
    await writeFile(file, original);
    run(root, ['init', '--force']);
    const { report, request } = await api(t, root);
    const before = await report();
    assert.equal(item(before, 'locate.plugin').status, 'ok');
    assert.equal(item(before, 'locate.order').status, expected);
    const id = expected === 'missing' ? 'locate.order' : 'write.refresh';
    const fix = item(before, id).fix;
    assert.equal(fix.kind, 'diff');
    assert.equal(await readFile(file, 'utf8'), original, 'preview is read-only');
    const response = await request('readiness/fix', { id, hash: fix.hash, confirm: true, allowDirty: true });
    assert.equal(response.status, 200, await response.clone().text());
    const written = await readFile(file, 'utf8');
    if (id === 'write.refresh') {
      assert.match(written, /import \w+ from '@vitejs\/plugin-react'/);
      assert.match(written, /(?:plumb|inspect)\(\{ watch: false \}\), \w+\(\)/);
      assert.equal(item(await report(), 'write.refresh').status, 'ok');
    }
    assert.equal(item(await report(), 'locate.order').status, 'ok');
    const server = await createServer({ root, logLevel: 'silent', server: { watch: null } });
    try {
      await server.listen();
      const base = `http://127.0.0.1:${server.httpServer.address().port}`;
      assert.equal((await fetch(`${base}/src/App.jsx`)).status, 200);
      let response;
      for (let i = 0; i < 100; i++) {
        response = await fetch(`${base}/__plumb/readiness`);
        if (response.status !== 503) break;
        await new Promise(done => setTimeout(done, 30));
      }
      assert.equal(response.status, 200);
      const ready = await response.json();
      assert.equal(item(ready, 'locate.order').status, 'ok');
      assert.equal(item(ready, 'write.refresh').status, 'ok');
    } finally { await server.close(); }
  });
});

test('Babel JSX plugins block order; MDX pre plugins do not', async t => {
  for (const [module, expected] of [['vite-plugin-babel', 'missing'], ['@mdx-js/rollup', 'ok'], ['@vitejs/plugin-react-swc', 'missing']]) {
    await t.test(module, async t => {
      const root = await fixture(t, `import transform from '${module}';\n` + config.replace('inspect(), react()', "transform({ enforce: 'pre' }), inspect(), react()"));
      const { report } = await api(t, root);
      assert.equal(item(await report(), 'locate.order').status, expected);
      const doctor = run(root, ['doctor'], '', expected === 'ok' ? 0 : 1);
      assert.match(doctor, new RegExp(`${expected === 'ok' ? 'ok' : 'fix'} React Plumber .*\\[locate.order\\]`));
    });
  }
});

test('doctor and read-only route cover every capability and token family with evidence and copyable fixes', async t => {
  const root = await fixture(t), { request, report } = await api(t, root, runtime);
  const before = await readFile(join(root, 'vite.config.mjs'), 'utf8');
  const ready = await report();
  assert.equal(ready.schemaVersion, 1);
  assert.equal(ready.requirements.length, 25);
  assert.deepEqual(ready.capabilities.map(item => item.id), ['read', 'remember', 'fast', 'locate', 'preview', 'write', 'blueprint', 'system']);
  assert.equal(ready.capabilities.find(item => item.id === 'system').available, false);
  for (const requirement of ready.requirements) {
    assert.deepEqual(Object.keys(requirement), ['id', 'capability', 'status', 'title', 'evidence', 'loses', 'fix', ...(requirement.derived ? ['derived'] : [])]);
    assert.ok(['ok', 'missing', 'unknown'].includes(requirement.status));
    assert.ok(requirement.evidence.every(item => typeof item.file === 'string' && Number.isInteger(item.line) && item.line > 0 && typeof item.text === 'string'));
    assert.ok(requirement.loses);
    if (requirement.status !== 'ok') assert.ok(requirement.fix?.kind && (requirement.fix.command || requirement.fix.diff));
    assert.doesNotMatch(JSON.stringify(requirement.fix), /\$\{EDITOR|\$EDITOR/);
  }
  for (const id of ['read.styles', 'remember.baseline', 'fast.config', 'locate.plugin', 'locate.order', 'locate.react-dev', 'locate.host', 'preview.locate', 'write.locate', 'write.refresh', 'write.hmr', 'blueprint.locate', 'blueprint.host', 'system.blueprint']) assert.equal(item(ready, id).status, 'ok', id);
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z']) assert.equal(item(ready, `read.tokens.${family}`).status, 'ok');
  assert.equal(item(ready, 'system.preset').status, 'missing');
  assert.equal(item(ready, 'system.state').status, 'ok');
  assert.match(item(ready, 'system.state').title, /^(?:A system|Tailwind's scale|No system yet).*\.$/);
  assert.equal(await readFile(join(root, 'vite.config.mjs'), 'utf8'), before, 'GET cannot edit config');
  assert.equal((await request('readiness', undefined, false)).status, 401);
  assert.equal((await request('readiness', {})).status, 405);
  assert.equal((await request('readiness/fix', undefined)).status, 405);
  assert.equal((await request('readiness/anything')).status, 404);
  const output = run(root, ['doctor']);
  assert.match(output, /^Readiness: \d+ setup gaps? ·/);
  assert.ok(output.indexOf('Readiness:') < output.indexOf('Diagnostics'));
  assert.match(output, /React development build needs verification/);
  assert.match(output, /unavailable\s+System panel/);
  for (const requirement of ready.requirements) assert.equal(output.includes(`[${requirement.id}]`), !requirement.derived && requirement.capability !== 'system', requirement.id);
});

test('numeric spacing base agrees in doctor, readiness GET and check coverage', async t => {
  const root = await fixture(t, config, {
    'src/styles.css': '@import "tailwindcss";\n@theme {\n  --spacing: 4px;\n}\n',
    'src/App.tsx': 'import "./styles.css"; export function App() { return <div className="p-4 gap-2" />; }',
  });
  const checked = JSON.parse(run(root, ['check', '--json']));
  assert.ok(checked.coverage.spacing.total > 0);
  assert.equal(checked.coverage.spacing.fromDecisions, checked.coverage.spacing.total);
  assert.equal(checked.coverage.spacing.findings, 0);
  assert.ok(!checked.decisions.some(token => token.family === 'spacing'), 'base alone, no named spacing tokens');
  const { report } = await api(t, root);
  const spacing = item(await report(), 'read.tokens.spacing');
  assert.equal(spacing.status, 'ok');
  assert.equal(spacing.fix, null);
  assert.deepEqual(spacing.evidence, [{ file: 'src/styles.css', line: 3, text: '--spacing' }]);
  assert.match(run(root, ['doctor']), /ok spacing tokens are ready \[read\.tokens\.spacing\]/);
});

test('framework-only tokens stay missing across every judged family', async t => {
  const root = await fixture(t, config, {
    'src/styles.css': `@import "tailwindcss";
@theme { --spacing: initial; }
.box { padding: 13px; color: #123456; border-radius: 11px; font-size: 19px; transition: opacity 137ms; box-shadow: 1px 1px 3px #123; z-index: 7; }
`,
    'src/App.tsx': 'import "./styles.css"; export function App() { return <div className="box" />; }',
  });
  const checked = JSON.parse(run(root, ['check', '--json']));
  const { report } = await api(t, root);
  const ready = await report(), doctor = run(root, ['doctor'], '', 1);
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z']) {
    assert.ok(checked.coverage[family].total > 0, family);
    assert.equal(checked.coverage[family].fromDecisions, 0, family);
    assert.ok(checked.findings.some(finding => finding.rule === 'config/no-tokens' && finding.family === family), family);
    assert.equal(item(ready, `read.tokens.${family}`).status, 'missing', family);
    assert.match(doctor, new RegExp(`fix Your theme has no ${family} tokens \\[read\\.tokens\\.${family}\\]`));
  }
});

test('project tokens agree across every judged family', async t => {
  const root = await fixture(t, config, {
    'src/styles.css': `@import "tailwindcss";
@theme {
  --spacing-comfy: 16px;
  --color-brand: #123456;
  --radius-card: 11px;
  --text-copy: 19px;
  --duration-quick: 137ms;
  --shadow-card: 1px 1px 3px #123;
  --z-modal: 7;
}
.box { padding: var(--spacing-comfy); color: var(--color-brand); border-radius: var(--radius-card); font-size: var(--text-copy); transition: opacity var(--duration-quick); box-shadow: var(--shadow-card); z-index: var(--z-modal); }
`,
    'src/App.tsx': 'import "./styles.css"; export function App() { return <div className="box" />; }',
  });
  const checked = JSON.parse(run(root, ['check', '--json']));
  const { report } = await api(t, root);
  const ready = await report(), doctor = run(root, ['doctor']);
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z']) {
    assert.ok(checked.coverage[family].total > 0, family);
    assert.equal(checked.coverage[family].fromDecisions, checked.coverage[family].total, family);
    assert.equal(item(ready, `read.tokens.${family}`).status, 'ok', family);
    assert.equal(item(ready, `read.tokens.${family}`).evidence[0].file, 'src/styles.css', family);
    assert.match(doctor, new RegExp(`ok ${family} tokens are ready \\[read\\.tokens\\.${family}\\]`));
  }
});

test('derived causes stay in route JSON; doctor counts causes and excludes unavailable system gaps', async t => {
  const root = await fixture(t, config.replace('inspect(), react()', 'react(), inspect()').replace('hmr: true', 'hmr: false'));
  const { report } = await api(t, root, runtime);
  let ready = await report();
  const derived = ['preview.locate', 'write.locate', 'blueprint.locate', 'system.blueprint'];
  for (const id of derived) {
    const requirement = item(ready, id);
    assert.equal(requirement.derived, true);
    assert.equal(requirement.status, 'missing');
    assert.equal(requirement.cause, 'locate.order');
    assert.equal(requirement.fix.command, 'plumber fix locate.order');
  }
  assert.equal(ready.schemaVersion, 1);
  assert.equal(ready.capabilities.find(item => item.id === 'system').available, false);
  assert.equal(item(ready, 'system.preset').status, 'missing');
  let doctor = run(root, ['doctor'], '', 1);
  assert.match(doctor, /^Readiness: 2 setup gaps · 1 check needs verification/);
  for (const id of [...derived, 'system.preset']) assert.ok(!doctor.includes(`[${id}]`), id);
  run(root, ['fix', 'locate.order', '--yes']);
  ready = await report();
  for (const id of derived) {
    assert.equal(item(ready, id).status, 'ok');
    assert.equal(item(ready, id).derived, true);
    assert.ok(!Object.hasOwn(item(ready, id), 'cause'));
  }
  run(root, ['fix', 'write.hmr', '--yes']);
  doctor = run(root, ['doctor']);
  assert.match(doctor, /^Readiness: 0 setup gaps · 1 check needs verification/);
  assert.match(doctor, /unavailable\s+System panel/);
  assert.equal(item(await report(), 'system.preset').status, 'missing');
});

test('every config diff is previewed, consent-gated, dirty-checked and applied one at a time', async t => {
  const root = await fixture(t, config.replace('[inspect(), react()]', '[react(), inspect()]').replace('hmr: true', 'hmr: false').replace('usePolling: true', 'usePolling: false'));
  const file = join(root, 'vite.config.mjs'), { request, report } = await api(t, root);
  const original = await readFile(file, 'utf8');
  let ready = await report();
  for (const id of ['locate.order', 'write.hmr']) assert.equal(item(ready, id).status, 'missing');
  assert.equal(item(ready, 'locate.react-dev').status, 'unknown');
  const fix = item(ready, 'write.hmr').fix;
  assert.equal(fix.kind, 'diff');
  assert.equal(fix.file, 'vite.config.mjs');
  assert.match(fix.diff, /-.*hmr: false/);
  assert.equal((await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true }, false)).status, 401);
  assert.equal((await request('readiness/fix', { id: 'write.hmr', hash: fix.hash })).status, 400);
  assert.equal((await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: false })).status, 400);
  const dirty = await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true });
  assert.equal(dirty.status, 400); assert.match((await dirty.json()).error, /uncommitted/);
  assert.equal(await readFile(file, 'utf8'), original);
  const applied = await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true, allowDirty: true });
  assert.equal(applied.status, 200, await applied.clone().text());
  const result = await applied.json();
  assert.deepEqual(Object.keys(result), ['id', 'file', 'diff', 'hash']);
  assert.equal(result.diff, fix.diff);
  assert.equal(result.hash, createHash('sha256').update(await readFile(file, 'utf8')).digest('hex'));
  assert.doesNotMatch(await readFile(file, 'utf8'), /hmr: false/);
  assert.match(await readFile(file, 'utf8'), /\[react\(\), inspect\(\)\]/, 'one diff only');
  assert.equal((await request('readiness/fix', { id: 'locate.order', hash: fix.hash, confirm: true, allowDirty: true })).status, 400, 'stale hash refused');
  assert.equal(item(await report(), 'write.hmr').status, 'ok');
  const diff = run(root, ['fix', 'locate.order'], 'n\n');
  assert.match(diff, /--- vite.config.mjs/); assert.match(diff, /Apply this diff to the dirty config\? \[y\/N\]/); assert.match(diff, /No files changed/);
  assert.match(await readFile(file, 'utf8'), /\[react\(\), inspect\(\)\]/);
  assert.match(run(root, ['fix', 'locate.order'], 'yes\n'), /Wrote vite.config.mjs/);
  assert.match(await readFile(file, 'utf8'), /\[inspect\(\),\s*react\(\)/);
  assert.match(run(root, ['fix', 'write.hmr']), /No change needed/);
  run(root, ['fix', '../../outside', '--yes'], '', 2);
});

test('missing plugin and Fast Refresh get separate diffs; WSL polling fix includes awaitWriteFinish', async t => {
  const root = await fixture(t, config.replace('plugins: [inspect(), react()]', 'plugins: []').replace('watch: { usePolling: true, awaitWriteFinish: true }', 'watch: {}'));
  const file = join(root, 'vite.config.mjs'), { request, report } = await api(t, root);
  let ready = await report();
  assert.equal(item(ready, 'locate.plugin').status, 'missing');
  assert.equal(item(ready, 'write.refresh').status, 'missing');
  for (const id of ['locate.order', 'preview.locate', 'write.locate', 'blueprint.locate', 'system.blueprint']) assert.equal(item(ready, id).status, 'missing', id);
  for (const id of ['locate', 'preview', 'write', 'blueprint']) assert.equal(ready.capabilities.find(item => item.id === id).status, 'off', id);
  assert.equal(ready.capabilities.find(item => item.id === 'system').available, false);
  run(root, ['fix', 'locate.plugin', '--yes']);
  ready = await report();
  assert.equal(item(ready, 'locate.plugin').status, 'ok');
  assert.equal(item(ready, 'locate.order').status, 'ok');
  assert.equal(item(ready, 'write.refresh').fix.kind, 'diff');
  run(root, ['fix', 'write.refresh', '--yes']);
  assert.match(await readFile(file, 'utf8'), /inspect\(\), react\(\)/);
  const doctor = run(root, ['doctor'], '', 1);
  assert.match(doctor, /wsl needs file polling/);
  assert.match(doctor, /plumber fix write.watcher/);
  // API environment explicitly simulates WSL; no filesystem/platform assumption.
  const previous = process.env.PLUMBER_WATCH_ENV;
  process.env.PLUMBER_WATCH_ENV = 'wsl';
  try {
    ready = await report();
    assert.equal(item(ready, 'write.watcher').status, 'missing');
    const fix = item(ready, 'write.watcher').fix;
    assert.match(fix.diff, /awaitWriteFinish/);
    const applied = await request('readiness/fix', { id: 'write.watcher', hash: fix.hash, confirm: true, allowDirty: true });
    assert.equal(applied.status, 200, await applied.clone().text());
    assert.equal(item(await report(), 'write.watcher').status, 'ok');
    assert.match(await readFile(file, 'utf8'), /usePolling: true, interval: 100, awaitWriteFinish:/);
  } finally { if (previous === undefined) delete process.env.PLUMBER_WATCH_ENV; else process.env.PLUMBER_WATCH_ENV = previous; }
});

test('no baseline, no tokens, executable config, unobserved host are named without unsafe diffs', async t => {
  const root = await fixture(t);
  await rm(join(root, '.plumber/ledger.jsonl'));
  await rm(join(root, 'vite.config.mjs'));
  await writeFile(join(root, 'plumber.config.ts'), `const css = 'src/styles.css'; export default { css };`);
  await writeFile(join(root, 'src/styles.css'), '.box { padding: 13px; color: #123456; border-radius: 11px; font-size: 19px; transition: opacity 137ms; box-shadow: 1px 1px 3px #123; z-index: 7; }');
  const { report } = await api(t, root);
  const ready = await report();
  assert.equal(item(ready, 'read.styles').status, 'ok');
  assert.equal(item(ready, 'remember.baseline').status, 'missing');
  assert.equal(item(ready, 'remember.baseline').fix.command, 'plumber baseline');
  assert.equal(item(ready, 'fast.config').status, 'missing');
  assert.equal(item(ready, 'locate.host').status, 'unknown');
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z']) assert.equal(item(ready, `read.tokens.${family}`).status, 'missing', family);
  const output = run(root, ['doctor'], '', 1);
  assert.match(output, /Every finding counts as new/);
  assert.match(output, /plumber baseline/);
  assert.match(output, /no spacing tokens/);
  assert.match(output, /cannot reuse the whole report/);
});

test('composed configs stay unknown; symlinked config can never become a writable diff', async t => {
  const root = await fixture(t, `import { defineConfig } from 'vite'; export default defineConfig(() => ({ plugins: [] }));`);
  const { request, report } = await api(t, root);
  let ready = await report();
  for (const id of ['locate.plugin', 'locate.order', 'write.refresh', 'write.hmr']) assert.equal(item(ready, id).status, 'unknown');
  await rm(join(root, 'vite.config.mjs'));
  const outside = join(root, '..', `${root.split('/').at(-1)}-outside.mjs`);
  t.after(() => rm(outside, { force: true }));
  await writeFile(outside, config.replace('hmr: true', 'hmr: false'));
  await symlink(outside, join(root, 'vite.config.mjs'));
  ready = await report();
  assert.equal(item(ready, 'write.hmr').status, 'missing');
  assert.equal(item(ready, 'write.hmr').fix.kind, 'step');
  const response = await request('readiness/fix', { id: 'write.hmr', hash: 'anything', confirm: true, allowDirty: true, file: outside, diff: 'malicious' });
  assert.equal(response.status, 400);
  assert.equal(await readFile(outside, 'utf8'), config.replace('hmr: true', 'hmr: false'));
});

test('live Vite route uses resolved HMR and refresh settings through the same allow-list and origin checks', async t => {
  const root = await fixture(t, config.replace('hmr: true', 'hmr: false'));
  const server = await createServer({ root, configFile: false, plugins: [plumb({ watch: false })], server: { port: 0, hmr: false } });
  t.after(() => server.close());
  await server.listen();
  const address = server.httpServer.address(), base = `http://localhost:${address.port}`;
  let response;
  for (let i = 0; i < 100; i++) {
    response = await fetch(`${base}/__plumb/readiness`);
    if (response.status !== 503) break;
    await new Promise(done => setTimeout(done, 30));
  }
  assert.equal(response.status, 200);
  const ready = await response.json();
  assert.equal(item(ready, 'write.hmr').status, 'missing');
  assert.equal(item(ready, 'write.refresh').status, 'missing', 'resolved plugins override static react import');
  assert.equal(item(ready, 'locate.react-dev').status, 'ok');
  assert.equal((await fetch(`${base}/__plumb/readiness`, { headers: { Origin: 'http://evil.test' } })).status, 403);
  const fix = item(ready, 'write.hmr').fix;
  const response2 = await fetch(`${base}/__plumb/readiness/fix`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'write.hmr', hash: fix.hash, confirm: true, allowDirty: true }) });
  assert.equal(response2.status, 200, await response2.clone().text());
  assert.equal((await fetch(`${base}/__plumb/readiness/fix/anything`)).status, 404);
});

test('chosen preset completes the system prerequisites; clean config applies without dirty approval', async t => {
  const root = await fixture(t, config.replace('hmr: true', 'hmr: false'));
  const plumberConfig = join(root, 'plumber.config.ts');
  await writeFile(plumberConfig, (await readFile(plumberConfig, 'utf8')).replace('export default {', `export default { presets: [{ name: 'fixture', decisions: [] }],`));
  const git = args => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git(['init', '-q']); git(['add', 'vite.config.mjs']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'host config']);
  const { request, report } = await api(t, root, { ...runtime, hmr: false });
  const ready = await report(), fix = item(ready, 'write.hmr').fix;
  assert.equal(item(ready, 'system.preset').status, 'ok');
  assert.equal(item(ready, 'system.blueprint').status, 'ok');
  assert.equal(ready.capabilities.find(item => item.id === 'system').status, 'full');
  assert.equal(fix.dirty, false);
  const applicable = spawnSync('git', ['apply', '--check', '-p0'], { cwd: root, input: fix.diff, encoding: 'utf8' });
  assert.equal(applicable.status, 0, applicable.stderr);
  const response = await request('readiness/fix', { id: 'write.hmr', hash: fix.hash, confirm: true });
  assert.equal(response.status, 200, await response.clone().text());
  assert.doesNotMatch(await readFile(join(root, 'vite.config.mjs'), 'utf8'), /hmr: false/);
});

test('uninstalled React, unsupported host and unsupported Tailwind are independently diagnosed', async t => {
  const { tmpdir } = await import('node:os');
  const root = await mkdtemp(join(tmpdir(), 'plumber-readiness-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: { dev: 'react-scripts start' } }));
  await writeFile(join(root, 'plumber.config.mjs'), `export default { source: ['src/**'] };`);
  await writeFile(join(root, 'src/styles.css'), '.box { padding: 13px; }');
  const { report } = await api(t, root);
  let ready = await report();
  assert.equal(item(ready, 'read.styles').status, 'ok');
  assert.equal(item(ready, 'locate.react-dev').status, 'missing');
  assert.equal(item(ready, 'locate.host').status, 'missing');
  assert.equal(item(ready, 'blueprint.host').status, 'missing');
  const output = run(root, ['doctor'], '', 1);
  assert.match(output, /React does not resolve/);
  assert.match(output, /npm install react react-dom/);
  await writeFile(join(root, 'vite.config.mjs'), 'export default (() => ({ plugins: [] }))();');
  ready = await report();
  assert.equal(item(ready, 'locate.plugin').status, 'unknown');
  for (const id of ['preview.locate', 'write.locate', 'blueprint.locate', 'system.blueprint']) {
    assert.equal(item(ready, id).status, 'missing');
    assert.equal(item(ready, id).cause, 'locate.react-dev', 'missing cause wins over earlier unknown requirements');
  }
  await mkdir(join(root, 'node_modules/tailwindcss'), { recursive: true });
  await writeFile(join(root, 'node_modules/tailwindcss/package.json'), JSON.stringify({ name: 'tailwindcss', version: '3.4.19' }));
  await writeFile(join(root, 'src/styles.css'), '@import "tailwindcss";');
  ready = await report();
  assert.equal(item(ready, 'read.styles').status, 'missing');
  assert.equal(item(ready, 'read.styles').fix.command, 'npx @tailwindcss/upgrade');
  assert.match(run(root, ['doctor'], '', 1), /needs Tailwind 4; this project has 3.4.19/);
});

test('live readiness survives failed analysis startup and never widens the route allow-list', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'node_modules/tailwindcss'), { recursive: true });
  await writeFile(join(root, 'node_modules/tailwindcss/package.json'), '{"name":"tailwindcss","version":"3.4.19"}');
  const server = await createServer({ root, configFile: false, plugins: [plumb({ watch: false })], server: { port: 0, watch: null } });
  t.after(() => server.close()); await server.listen();
  const base = `http://localhost:${server.httpServer.address().port}`;
  let response;
  for (let i = 0; i < 100; i++) {
    response = await fetch(`${base}/__plumb/readiness`);
    if (response.status !== 503) break;
    await new Promise(done => setTimeout(done, 30));
  }
  assert.equal(response.status, 200, await response.clone().text());
  const ready = await response.json();
  assert.equal(item(ready, 'read.styles').status, 'missing');
  assert.equal(item(ready, 'write.watcher').status, 'missing');
  assert.match(item(ready, 'read.styles').title, /3.4.19/);
  assert.equal((await fetch(`${base}/__plumb/readiness/nope`)).status, 404);
});

test('new React import avoids local bindings; shown diff applies without a trailing newline', async t => {
  const root = await fixture(t, config.replace("import react from '@vitejs/plugin-react';\n", 'const plumberReact = 1;\n').replace('inspect(), react()', 'inspect()').trimEnd());
  const { report } = await api(t, root);
  const ready = await report(), fix = item(ready, 'write.refresh').fix;
  assert.equal(fix.kind, 'diff');
  assert.match(fix.diff, /import plumberReact_ from '@vitejs\/plugin-react'/);
  assert.match(fix.diff, /\\ No newline at end of file/);
  const applicable = spawnSync('git', ['apply', '--check', '-p0'], { cwd: root, input: fix.diff, encoding: 'utf8' });
  assert.equal(applicable.status, 0, applicable.stderr);
  run(root, ['fix', 'write.refresh', '--yes']);
  const written = await readFile(join(root, 'vite.config.mjs'), 'utf8');
  assert.match(written, /plugins: \[inspect\(\), plumberReact_\(\)\]/);
  assert.ok(!written.endsWith('\n'));
});

test('default plumb imports are recognized and reorderable; ignored untracked configs need dirty consent', async t => {
  const root = await fixture(t, config.replace('import { plumb as inspect }', 'import inspect').replace('[inspect(), react()]', '[react(), inspect()]'));
  await writeFile(join(root, '.gitignore'), 'vite.config.mjs\n');
  for (const args of [['init', '-q'], ['add', '.gitignore'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'ignore local host config']]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
  }
  const { request, report } = await api(t, root);
  const ready = await report(), fix = item(ready, 'locate.order').fix;
  assert.equal(item(ready, 'locate.plugin').status, 'ok');
  assert.equal(item(ready, 'locate.order').status, 'missing');
  assert.equal(fix.kind, 'diff'); assert.equal(fix.dirty, true);
  assert.equal((await request('readiness/fix', { id: 'locate.order', hash: fix.hash, confirm: true })).status, 400);
  run(root, ['fix', 'locate.order', '--yes']);
  const written = await readFile(join(root, 'vite.config.mjs'), 'utf8');
  assert.match(written, /plugins: \[inspect\(\),\s*react\(\)/);
  assert.equal((written.match(/react-plumber\/vite/g) ?? []).length, 1);
});
