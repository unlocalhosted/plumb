// F1-04: a Shadow or Motion pick that only ADDS a class at a component usage. The usage's className reaches the
// element inside (the overlay observed it), so the caller says `forwards: true` and the class is written into
// that usage's string className. Without it the refusal stays. Real server, real HTTP.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const files = {
  'package.json': '{ "name": "fx-forwards", "private": true, "type": "module", "dependencies": { "tailwindcss": "^4.0.0" } }\n',
  'plumber.config.ts': `export default { css: 'src/styles.css', source: ['src/**/*.{ts,tsx,css}'] };\n`,
  'src/styles.css': `@import "tailwindcss";\n\n@theme {\n  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.06);\n  --shadow-md: 0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.12);\n  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);\n}\n`,
  'src/main.tsx': `import { createRoot } from 'react-dom/client';\nimport { Page } from './App';\nimport './styles.css';\ncreateRoot(document.getElementById('root')!).render(<Page />);\n`,
  'src/App.tsx': `export function Row({ className, children }: { className?: string; children?: unknown }) {
  return <div className={className}>{children}</div>;
}
export function Page() {
  return (
    <main>
      <Row className="rounded-lg p-4 bg-white">One</Row>
      <Row>Two</Row>
    </main>
  );
}
`,
};

test('a component usage that forwards className takes an added shadow or motion class in its own className, only when the caller says so', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.recipes-fwd-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) { await mkdir(dirname(join(root, name)), { recursive: true }); await writeFile(join(root, name), text); }
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const call = async (method, params) => {
    const response = await fetch(new URL('/__plumb/' + method, `http://127.0.0.1:${server.info.port}`), { method: 'POST', headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    return { status: response.status, body: await response.json() };
  };
  const original = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const offset = original.indexOf('<Row className'), before = original.slice(0, offset);
  const pos = { file: 'src/App.tsx', line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };

  for (const [pick, expect] of [[{ recipe: 'raised' }, /className="rounded-lg p-4 bg-white shadow-/], [{ recipe: 'lift' }, /className="rounded-lg p-4 bg-white [^"]*(?:transition|duration)/]]) {
    // without the observation: the refusal stays, nothing is written
    const refused = await call('recipes/preview', { ...pos, ...pick });
    assert.equal(refused.body.ok, false, JSON.stringify(refused.body));
    assert.match(refused.body.refused, /is a component/);
    assert.equal((await call('recipes/apply', { ...pos, ...pick })).status, 400);
    assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), original);

    // with it: previewed, applied, and undone exactly
    const previewed = await call('recipes/preview', { ...pos, ...pick, forwards: true });
    assert.equal(previewed.body.ok, true, JSON.stringify(previewed.body));
    assert.match(previewed.body.writes.find(w => w.role === 'element').diff, /^\+ .*<Row className="rounded-lg p-4 bg-white /m);
    assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), original);
    const done = await call('recipes/apply', { ...pos, ...pick, forwards: true });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    const after = await readFile(join(root, 'src/App.tsx'), 'utf8');
    assert.match(after, expect);
    assert.match(after, /<Row>Two<\/Row>/);
    for (const h of done.body.undo.toReversed()) assert.equal((await call('undo', { id: h.id })).status, 200);
    assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), original);
  }
});
