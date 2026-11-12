// A theme that names its corners and shadows by size (sm, md, lg) says no job: nothing tells plumber which size is a
// card's and which a button's. The corners and shadows passes then propose nothing, and say why, rather than guess a
// job from the order of the sizes (docs/backlog.md, decided 2026-11-12: "Corners in a theme named by size: propose
// nothing"). The same page with job names gets its moves. Real Vite, real Chromium, the overlay's own readers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { fixture } from './helpers/craft-headless.mjs';

const PAGE = `export function App() {
  return (
    <main className="p-8 bg-white">
      <section className="rounded-[14px] shadow-md border border-gray-200 p-6 bg-white"><h2>Revenue</h2><p>Up 12% on last month.</p></section>
      <button className="mt-4 rounded-[5px] bg-gray-900 text-white px-4 py-2">Export</button>
    </main>
  );
}
`;
const bySize = `@theme { --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.06); --shadow-lg: 0 8px 24px rgb(0 0 0 / 0.12); }`;
const byJob = `@theme { --radius-control: 6px; --radius-card: 12px; --shadow-card: 0 1px 3px rgb(0 0 0 / 0.08); }`;

async function read(t, styles) {
  // its own stylesheet: the demo's names corners and shadows by job already
  const { url } = await fixture(t, PAGE, { files: { 'styles.css': `@import "tailwindcss";\n${styles}\n` } });
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__plumb.ready());
  return page.evaluate(async () => {
    const R = await import('/__plumb/src/radius.js'), E = await import('/__plumb/src/elevation.js');
    const corners = R.proposeRadii(R.readRadii(), await R.loadRadii(true)), shadows = E.proposeShadows(E.readShadows(), await E.loadShadows(true));
    const say = (p) => ({ moves: p.moves.map((m) => `${m.role} ${m.to.cls}`), kept: p.kept.map((k) => k.why ?? `on ${k.on}`) });
    return { corners: say(corners), shadows: say(shadows) };
  });
}

test('a theme whose corners and shadows are named by size gets no moves, and is told why; named by job, the card and the button take theirs', { timeout: 240000 }, async (t) => {
  const size = await read(t, bySize);
  assert.deepEqual(size.corners.moves, [], JSON.stringify(size));
  assert.ok(size.corners.kept.some((why) => /names no radius for a card/.test(why)), JSON.stringify(size));
  assert.ok(size.corners.kept.some((why) => /names no radius for a control/.test(why)), JSON.stringify(size));
  assert.deepEqual(size.shadows.moves, [], JSON.stringify(size));

  const job = await read(t, byJob);
  assert.ok(job.corners.moves.includes('card rounded-card'), JSON.stringify(job));
  assert.ok(job.corners.moves.includes('control rounded-control'), JSON.stringify(job));
  assert.deepEqual(job.shadows.moves, ['card shadow-card'], JSON.stringify(job));
});
