// Captures the layer-1 cards: opens each page at 1280×900, runs capture.js on the card, writes the sidecar to
// generator/sidecars/<id>.json and a screenshot of the card to generator/shots/<id>.png (kept local, not committed).
//   node generator/capture-run.mjs [id…]
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sites, helpers } from './sites.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const want = process.argv.slice(2);
const capture = await readFile(new URL('./capture.js', import.meta.url), 'utf8');
await mkdir(`${here}sidecars`, { recursive: true }); await mkdir(`${here}shots`, { recursive: true });
const browser = await chromium.launch();
try {
  for (const site of sites.filter((s) => !want.length || want.includes(s.id))) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, bypassCSP: true });
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3500);
      await page.addScriptTag({ content: `${capture}\nwindow.captureOrganism = captureOrganism;` });
      const result = await page.evaluate(`(() => { ${helpers}
        const root = ${site.root}; if (!root) throw new Error('card not found');
        root.scrollIntoView({ block: 'center' });
        const slots = ${site.slots}; const missing = Object.entries(slots).filter(([, v]) => !v || (Array.isArray(v) && !v.length)).map(([k]) => k);
        if (missing.length) throw new Error('no element for ' + missing.join(', '));
        root.setAttribute('data-capture', '${site.id}');
        return captureOrganism(root, slots, { body: ${site.body} });
      })()`);
      // fixed and sticky bars (site menus) would cover the card in its screenshot
      await page.evaluate(() => { for (const e of document.querySelectorAll('body *')) { const pos = getComputedStyle(e).position; if ((pos === 'fixed' || pos === 'sticky') && !e.closest('[data-capture]')) e.style.visibility = 'hidden'; } });
      await page.waitForTimeout(600);
      await page.locator(`[data-capture="${site.id}"]`).screenshot({ path: `${here}shots/${site.id}.png` });
      await writeFile(`${here}sidecars/${site.id}.json`, JSON.stringify({ id: site.id, ...result }, null, 2) + '\n');
      const m = result.measured;
      console.log(`${site.id.padEnd(16)} body ${result.sidecar.body.fontSize}px  width ${m.widthRatio}×  lead ${m.lead} (${m.leadRatio})  read ${m.reading.join(' → ')}`);
      console.log(`${''.padEnd(16)} ranks ${m.weights.map((w) => `${w.job} ${w.rank} (${w.w})`).join(', ')}`);
      console.log(`${''.padEnd(16)} rows  ${m.rows.map((r) => r.join(' + ')).join(' / ')}`);
      console.log(`${''.padEnd(16)} gaps  ${m.gaps.map((g) => `${g.between}${g.row ? ' (across)' : ''} ${g.ratio}`).join(', ')}`);
    } catch (e) { console.log(`${site.id.padEnd(16)} FAILED ${e.message.split('\n')[0]}`); }
    await page.close();
  }
} finally { await browser.close(); }
