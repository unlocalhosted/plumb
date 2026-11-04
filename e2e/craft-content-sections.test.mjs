// Content alignment (#1) between the sections of a page, the case the showcase's client profile found: a tinted note
// with its own padding sits on the column like the sections around it, so its words start in by its padding. It is
// marked and told to bleed; the same note bleeding is not; a card with a shadow (an object with an edge) among the
// same sections is not. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const page = (id, note) => `
      <div className="flex flex-col gap-s4 text-body">
        <h2>Halden &amp; Co.</h2>
        <p>Billing contact: Mette Halden</p>
        ${note.replace('ID', id)}
        <p>Recent invoices</p>
      </div>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">${page('inset', '<aside id="ID" className="bg-ground px-s4 py-s3">They need a PO number on every invoice.</aside>')}${page('bleeds', '<aside id="ID" className="-mx-s4 bg-ground px-s4 py-s3">They need a PO number on every invoice.</aside>')}${page('card', '<aside id="ID" className="rounded-card bg-surface p-s1 shadow-rest">They need a PO number on every invoice.</aside>')}
    </main>
  );
}
`;

test('a tinted note among the sections of a page is told to bleed; bleeding, or a card with an edge, is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/content-align');
  assert.ok(hasLine(report, 'craft/content-align', lineOf(APP, 'inset')), `the inset note is marked: ${JSON.stringify(marks)}`);
  assert.ok(!hasLine(report, 'craft/content-align', lineOf(APP, 'bleeds')), 'the bleeding note is not');
  assert.ok(!hasLine(report, 'craft/content-align', lineOf(APP, 'card')), 'the card with a shadow is not');
});
