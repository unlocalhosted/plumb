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

test('apply-all runs the whole Apply on the server: theme, then swaps per file, then the ledger, each file once with its own undo', { timeout: 90000 }, async (t) => {
  const api = await project(t);
  await writeFile(join(api.root, 'src/Card.tsx'), `export const Card = () => <div id="card" className="p-[9px]" />;\n`);
  const spec = (await api.call('spec', {})).body;
  const before = await api.site('type');
  const leading = at(before.findings, 'leading-relaxed')[0];
  const cardColumn = 'export const Card = () => <div'.indexOf('<div') + 1;
  const cardProps = await api.call('props', { file: 'src/Card.tsx', line: 1, column: cardColumn });
  assert.equal(cardProps.status, 200, JSON.stringify(cardProps.body));
  const cardHash = cardProps.body.hash;
  const appHash = await api.hash();
  const request = {
    tokens: [{ file: spec.tokens.file, hash: spec.tokens.hash, name: '--spacing-gutter', value: 'clamp(1rem, 4vw, 2.5rem)', why: 'The page gutter.' }],
    swaps: [
      { file: 'src/App.tsx', hash: appHash, edits: [{ line: api.lineOf('gutter'), column: 3, from: 'px-[clamp(1rem,4vw,2.5rem)]', to: 'px-gutter' }, { line: api.lineOf('bleed'), column: 3, from: '-mx-[clamp(1rem,4vw,2.5rem)]', to: '-mx-gutter' }] },
      { file: 'src/Card.tsx', hash: cardHash, edits: [{ line: 1, column: cardColumn, from: 'p-[9px]', to: 'p-small' }] },
      { file: 'src/Card.tsx', hash: 'a'.repeat(12), edits: [{ line: 1, column: cardColumn, from: 'p-small', to: 'p-large' }] },
    ],
    accepts: [{ rule: leading.rule, sites: leading.sites.filter(s => s.text === 'leading-relaxed').map(({ file, line, column, text }) => ({ file, line, column, text })), why: 'Relaxed leading is this page’s voice.' }],
  };
  const result = await api.call('apply-all', request, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const { results, undo, labels } = result.body;
  assert.deepEqual(results.tokens, [{ name: '--spacing-gutter', ok: true }]);
  assert.deepEqual(results.swaps.map(s => [s.file, s.ok, s.applied, s.refused, s.error]), [
    ['src/App.tsx', true, [`swap:${api.lineOf('gutter')}:3`, `swap:${api.lineOf('bleed')}:3`], [], undefined],
    ['src/Card.tsx', true, [`swap:1:${cardColumn}`], [], undefined],
    ['src/Card.tsx', false, [], [], 'The file changed since the overlay read it. Read it again.'],
  ]);
  assert.deepEqual(results.accepts, [{ rule: leading.rule, ok: true, accepted: 1 }]);
  assert.deepEqual(undo.map(u => u.file), ['src/styles.css', 'src/App.tsx', 'src/Card.tsx']);
  assert.deepEqual(labels, undo.map(u => u.label));
  assert.match(await readFile(join(api.root, 'src/styles.css'), 'utf8'), /--spacing-gutter: clamp\(1rem, 4vw, 2\.5rem\);/);
  const app = await readFile(join(api.root, 'src/App.tsx'), 'utf8');
  assert.ok(app.includes('className="px-gutter tracking-[0.1em]"') && app.includes('className="-mx-gutter"'), app);
  assert.ok((await readFile(join(api.root, 'src/Card.tsx'), 'utf8')).includes('className="p-small"'));
  assert.match(await readFile(join(api.root, '.plumber/ledger.jsonl'), 'utf8'), /"kind":"exception"[^\n]*"leading-relaxed"/);
  const history = (await api.call('history')).body.writes;
  assert.deepEqual(history.map(w => w.file), ['src/Card.tsx', 'src/App.tsx', 'src/styles.css']);
  assert.ok(history.every(w => !w.stale));
  // a second token into the same file within one batch moves on from the first write's hash
  const again = await api.call('apply-all', { tokens: [
    { file: spec.tokens.file, hash: (await api.call('spec', {})).body.tokens.hash, name: '--spacing-rail', value: '2rem', why: 'The rail.' },
    { file: spec.tokens.file, hash: (await api.call('spec', {})).body.tokens.hash, name: '--spacing-well', value: '3rem', why: 'The well.' },
  ] }, 'POST');
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.deepEqual(again.body.results.tokens, [{ name: '--spacing-rail', ok: true }, { name: '--spacing-well', ok: true }]);
});

test('a whole cause: apply-all rewrites every place in the source with that class, read by the page or not', { timeout: 90000 }, async (t) => {
  const api = await project(t);
  const rows = Array.from({ length: 40 }, (_, i) => `  <li id="row-${i}" className="p-[9px]">${i}</li>`).join('\n');
  await writeFile(join(api.root, 'src/Rows.tsx'), `const pad = 'p-[9px]';\nexport const Rows = () => <ul className={\`list-none \${pad}\`}>\n${rows}\n</ul>;\n`);
  // nothing has read these rows: the cause alone names them
  const result = await api.call('apply-all', { swaps: [{ cause: { rule: 'provenance/arbitrary', text: 'p-[9px]', choice: '--spacing-small' } }] }, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const swaps = result.body.results.swaps;
  assert.deepEqual(swaps.map(s => [s.file, s.ok, s.applied.length, s.refused, s.places, s.cause]), [
    ['src/Rows.tsx', true, 41, [], 41, { rule: 'provenance/arbitrary', text: 'p-[9px]', choice: '--spacing-small' }],
  ]);
  const text = await readFile(join(api.root, 'src/Rows.tsx'), 'utf8');
  assert.equal((text.match(/className="p-small"/g) ?? []).length, 40);
  assert.ok(text.includes("const pad = 'p-small';"), 'the variable’s literal is rewritten, not its use');
  assert.ok(!text.includes('p-[9px]'));
  assert.deepEqual(result.body.undo.map(u => [u.file, u.label]), [['src/Rows.tsx', 'p-[9px] → p-small (41 places)']]);
  // a new token, then its class at every place of its cause
  const spec = (await api.call('spec', {})).body;
  const token = await api.call('apply-all', { tokens: [{ file: spec.tokens.file, hash: spec.tokens.hash, name: '--spacing-gutter', value: 'clamp(1rem, 4vw, 2.5rem)', why: 'The page gutter.', then: { cause: { rule: 'provenance/arbitrary', text: 'px-[clamp(1rem,4vw,2.5rem)]', choice: '--spacing-gutter' } } }] }, 'POST');
  assert.equal(token.status, 200, JSON.stringify(token.body));
  assert.deepEqual(token.body.results.tokens, [{ name: '--spacing-gutter', ok: true }]);
  assert.deepEqual(token.body.results.swaps.map(s => [s.file, s.ok, s.applied, s.places]), [['src/App.tsx', true, [`swap:${api.lineOf('gutter')}:${source.split('\n')[api.lineOf('gutter') - 1].indexOf('px-[') + 1}`], 1]]);
  assert.ok((await readFile(join(api.root, 'src/App.tsx'), 'utf8')).includes('className="px-gutter tracking-[0.1em]"'));
  const none = await api.call('apply-all', { swaps: [{ cause: { rule: 'provenance/arbitrary', text: 'p-[9px]', choice: '--spacing-small' } }] }, 'POST');
  assert.deepEqual(none.body.results.swaps.map(s => [s.ok, s.places, s.error]), [[false, 0, 'No place in your code has that class under that rule. Check again.']]);
});

test('a new token’s class follows only once the token is written: a cause whose rule still has other findings, and per-element swaps a refused token leaves alone', { timeout: 90000 }, async (t) => {
  const api = await project(t);
  const spec = (await api.call('spec', {})).body;
  const gutterLine = api.lineOf('gutter'), gutterColumn = source.split('\n')[gutterLine - 1].indexOf('tracking-[') + 1;
  // the rule keeps other findings (px-[clamp…], -mx-[clamp…]) after --tracking-caps is in the theme; the places are
  // those tracking-[0.1em] had before the write
  const written = await api.call('apply-all', { tokens: [{ file: spec.tokens.file, hash: spec.tokens.hash, name: '--tracking-caps', value: '0.1em', why: 'Caps.', then: { cause: { rule: 'provenance/arbitrary', text: 'tracking-[0.1em]', choice: '--tracking-caps' } } }] }, 'POST');
  assert.equal(written.status, 200, JSON.stringify(written.body));
  assert.deepEqual(written.body.results.tokens, [{ name: '--tracking-caps', ok: true }]);
  assert.deepEqual(written.body.results.swaps.map(s => [s.file, s.ok, s.applied, s.places, s.token]), [['src/App.tsx', true, [`swap:${gutterLine}:${gutterColumn}`], 1, '--tracking-caps']]);
  assert.ok((await readFile(join(api.root, 'src/App.tsx'), 'utf8')).includes('className="px-[clamp(1rem,4vw,2.5rem)] tracking-caps"'));
  // a craft suggestion has no rule: its swaps ride with the token, and a refused token (the name is taken) writes none
  const hash = (await api.call('spec', {})).body.tokens.hash, before = await readFile(join(api.root, 'src/App.tsx'), 'utf8');
  const refused = await api.call('apply-all', { tokens: [{ file: spec.tokens.file, hash, name: '--tracking-caps', value: '0.2em', why: 'Caps again.', then: { swaps: [{ file: 'src/App.tsx', hash: await api.hash(), edits: [{ line: gutterLine, column: 3, from: 'tracking-caps', to: 'tracking-wide' }] }] } }] }, 'POST');
  assert.equal(refused.status, 200, JSON.stringify(refused.body));
  assert.deepEqual(refused.body.results.tokens.map(t => [t.name, t.ok]), [['--tracking-caps', false]]);
  assert.match(refused.body.results.tokens[0].error, /already 0\.1em/);
  assert.deepEqual(refused.body.results.swaps, []);
  assert.equal(await readFile(join(api.root, 'src/App.tsx'), 'utf8'), before);
  // the same swaps behind a token that is written: written, and tied to the token
  const ok = await api.call('apply-all', { tokens: [{ file: spec.tokens.file, hash, name: '--tracking-wide', value: '0.2em', why: 'Wide.', then: { swaps: [{ file: 'src/App.tsx', hash: await api.hash(), edits: [{ line: gutterLine, column: 3, from: 'tracking-caps', to: 'tracking-wide' }] }] } }] }, 'POST');
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(ok.body.results.swaps.map(s => [s.file, s.ok, s.applied, s.token]), [['src/App.tsx', true, [`swap:${gutterLine}:3`], '--tracking-wide']]);
  assert.ok((await readFile(join(api.root, 'src/App.tsx'), 'utf8')).includes('tracking-wide"'));
});
