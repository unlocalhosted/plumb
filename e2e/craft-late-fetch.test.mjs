// The held pass for a list that mounts late: its rows are fetched after plumber's overlay is ready (a screen that
// loads its data once the page around it has settled). Before, plumber asked the page what it fetches the moment the
// overlay was ready, heard nothing, and never held a response: the skeleton was never read.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, plumber } from './helpers/craft-headless.mjs';

const APP = `import { useEffect, useState } from 'react';
function Rows() {
  const [items, setItems] = useState(null);
  useEffect(() => { fetch('/api/items').then((r) => r.json()).then(setItems); }, []);
  return <section id="late" className="flex flex-col gap-s2">{items ? items.map((i) => <article key={i.id} className="rounded-card bg-surface p-s3 text-body text-ink" style={{ height: 96 }}>{i.title}</article>) : [0, 1].map((n) => <div key={n} className="animate-pulse rounded-card bg-neutral-200" style={{ height: 40 }} />)}</section>;
}
export function App() {
  const [on, setOn] = useState(false);
  // mounts just after the overlay is ready, as a list behind a route's own loading does
  useEffect(() => { const wait = () => window.__plumb?.ready ? window.__plumb.ready().then(() => setTimeout(() => setOn(true), 50)) : setTimeout(wait, 50); wait(); }, []);
  return <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">{on ? <Rows /> : null}</main>;
}
`;

test('a list fetched after the overlay is ready still has its skeleton read', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP, { api: { items: [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }] } });
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root])).stdout);
  assert.ok(at(report, 'craft/skeleton-match').length > 0, 'the 40px skeleton under 96px rows is marked');
});
