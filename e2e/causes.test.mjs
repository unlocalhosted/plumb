// Every cause ends in one action, through the session server's real HTTP boundary: Keep it (POST accept records the
// sites as exceptions, as the CLI does), Make it yours (a Tailwind default's variable and value, written into the theme
// as they are, end the finding), Add to theme (the namespace, utility and value that give an off-scale value a class).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
export const App = () => <>
  <p id="type" className="leading-relaxed font-medium">text</p>
  <div id="gutter" className="px-[clamp(1rem,4vw,2.5rem)] tracking-[0.1em]" />
  <div id="bleed" className="-mx-[clamp(1rem,4vw,2.5rem)]" />
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.causes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const lineOf = (id) => source.split('\n').findIndex((l) => l.includes(`id="${id}"`)) + 1;
  const site = async (id) => { const r = await call('site', { file: 'src/App.tsx', line: lineOf(id), column: 3 }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body; };
  const cli = () => {
    const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8', timeout: 30_000, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout);
    return JSON.parse(result.stdout);
  };
  const hash = async () => (await call('props', { file: 'src/App.tsx', line: lineOf('type'), column: 3 })).body.hash;
  return { root, call, site, lineOf, cli, hash };
}
const at = (findings, text) => findings.filter(f => f.sites.some(s => s.text === text));

test('Keep it: POST accept records each site as an exception, as plumber accept does; the next read reports them so', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const before = await api.site('type');
  const finding = at(before.findings, 'leading-relaxed')[0];
  assert.ok(finding, JSON.stringify(before.findings.map(f => f.title)));
  assert.equal(finding.sites.find(s => s.text === 'leading-relaxed').ledger.status, 'new');
  const sites = finding.sites.filter(s => s.text === 'leading-relaxed').map(({ file, line, column, text }) => ({ file, line, column, text }));
  const noWhy = await api.call('accept', { rule: finding.rule, sites, why: '' }, 'POST');
  assert.equal(noWhy.status, 400); assert.match(noWhy.body.error, /why/);
  const accepted = await api.call('accept', { rule: finding.rule, sites, why: 'Relaxed leading is this page’s voice.' }, 'POST');
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  assert.deepEqual(accepted.body, { accepted: 1 });
  const ledger = await readFile(join(api.root, '.plumber/ledger.jsonl'), 'utf8');
  const exception = ledger.split('\n').map(line => { try { return JSON.parse(line); } catch { return null; } }).find(entry => entry?.kind === 'exception');
  assert.ok(exception, ledger);
  assert.equal(exception.rule, finding.rule); assert.equal(exception.why, 'Relaxed leading is this page’s voice.');
  const after = await api.site('type');
  const kept = at(after.findings, 'leading-relaxed')[0];
  assert.equal(kept.sites.find(s => s.text === 'leading-relaxed').ledger.status, 'exception');
  assert.equal(at(after.findings, 'font-medium')[0].sites.find(s => s.text === 'font-medium').ledger.status, 'new');
});

test('Make it yours: a framework finding names the default’s variable and value; written into the theme, the finding is gone everywhere', { timeout: 90000 }, async (t) => {
  const api = await project(t);
  const before = await api.site('type');
  const leading = at(before.findings, 'leading-relaxed')[0], weight = at(before.findings, 'font-medium')[0];
  assert.equal(leading.rule, 'provenance/type/framework');
  assert.deepEqual(leading.adopt, { name: '--leading-relaxed', value: '1.625' });
  assert.deepEqual(weight.adopt, { name: '--font-weight-medium', value: '500' });
  const spec = (await api.call('spec', {})).body;
  assert.equal(spec.tokens.file, 'src/styles.css');
  let hash = spec.tokens.hash;
  for (const adopt of [leading.adopt, weight.adopt]) {
    const written = await api.call('token', { file: spec.tokens.file, hash, name: adopt.name, value: adopt.value, why: 'Tailwind’s default, made ours.' }, 'POST');
    assert.equal(written.status, 200, JSON.stringify(written.body));
    assert.equal(written.body.written, true);
    hash = written.body.hash;
  }
  const css = await readFile(join(api.root, 'src/styles.css'), 'utf8');
  assert.match(css, /--leading-relaxed: 1\.625;/); assert.match(css, /--font-weight-medium: 500;/);
  const after = await api.site('type');
  assert.deepEqual(after.findings.filter(f => f.sites.some(s => ['leading-relaxed', 'font-medium'].includes(s.text))).map(f => f.rule), []);
  const report = api.cli();
  assert.deepEqual(report.findings.filter(f => f.sites.some(s => s.file.endsWith('/App.tsx') && ['leading-relaxed', 'font-medium'].includes(s.text))).map(f => f.rule), []);
  assert.ok(report.declarations.some(d => d.site.text === 'leading-relaxed' && d.resolved === '1.625'));
});

test('Add to theme: an off-scale value with no close token names the namespace, utility and value that give it a class; written and swapped, both places resolve', { timeout: 90000 }, async (t) => {
  const api = await project(t);
  const gutter = await api.site('gutter'), bleed = await api.site('bleed');
  const px = at(gutter.findings, 'px-[clamp(1rem,4vw,2.5rem)]')[0], tracking = at(gutter.findings, 'tracking-[0.1em]')[0], mx = at(bleed.findings, '-mx-[clamp(1rem,4vw,2.5rem)]')[0];
  assert.deepEqual(px.newToken, { namespace: '--spacing', utility: 'px', value: 'clamp(1rem, 4vw, 2.5rem)' });
  assert.deepEqual(tracking.newToken, { namespace: '--tracking', utility: 'tracking', value: '0.1em' });
  assert.deepEqual(mx.newToken, { namespace: '--spacing', utility: 'mx', value: 'clamp(1rem, 4vw, 2.5rem)' });
  assert.ok(!px.choices?.length && !tracking.choices?.length && !mx.choices?.length);
  const spec = (await api.call('spec', {})).body;
  const written = await api.call('token', { file: spec.tokens.file, hash: spec.tokens.hash, name: `${px.newToken.namespace}-gutter`, value: px.newToken.value, why: 'The page gutter.' }, 'POST');
  assert.equal(written.status, 200, JSON.stringify(written.body));
  assert.match(await readFile(join(api.root, 'src/styles.css'), 'utf8'), /--spacing-gutter: clamp\(1rem, 4vw, 2\.5rem\);/);
  const swapped = await api.call('swaps', { file: 'src/App.tsx', hash: await api.hash(), edits: [
    { line: api.lineOf('gutter'), column: 3, from: 'px-[clamp(1rem,4vw,2.5rem)]', to: 'px-gutter' },
    { line: api.lineOf('bleed'), column: 3, from: '-mx-[clamp(1rem,4vw,2.5rem)]', to: '-mx-gutter' },
  ] }, 'POST');
  assert.equal(swapped.status, 200, JSON.stringify(swapped.body));
  assert.deepEqual(swapped.body.refused, []);
  const text = await readFile(join(api.root, 'src/App.tsx'), 'utf8');
  assert.ok(text.includes('className="px-gutter tracking-[0.1em]"') && text.includes('className="-mx-gutter"'), text);
  for (const [id, token] of [['gutter', 'px-gutter'], ['bleed', '-mx-gutter']]) {
    const view = await api.site(id);
    const declaration = view.declarations.find(d => d.site.text === token && d.prop === 'margin-inline' || d.site.text === token && d.prop === 'padding-inline');
    assert.ok(declaration, JSON.stringify(view.declarations.map(d => [d.site.text, d.prop, d.value])));
    assert.match(declaration.value, /var\(--spacing-gutter\)/);
    assert.deepEqual(at(view.findings, token).map(f => f.rule), [], JSON.stringify(at(view.findings, token).map(f => f.title)));
  }
  // a shadow is one declaration too, up to 160 characters
  const shadow = await api.call('token', { file: spec.tokens.file, hash: (await api.call('spec', {})).body.tokens.hash, name: '--shadow-lifted', value: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -8px rgb(0 0 0 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.4)', why: 'Lifted surfaces.' }, 'POST');
  assert.equal(shadow.status, 200, JSON.stringify(shadow.body));
});
