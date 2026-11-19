// The designer's read (layer 1b): plumber's craft engine, bundled and put into each reference page, judges the
// card's whole row. Writes generator/reads/<id>.json (findings, kept local like the sidecars) and prints a summary.
//   node generator/read.mjs [id…]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sites, helpers } from './sites.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
const want = process.argv.slice(2);
await mkdir(`${here}reads`, { recursive: true });
const bundle = `${here}reads/craft.iife.js`;
execFileSync(`${here}../node_modules/.bin/rolldown`, [`${here}read-entry.js`, '--format', 'iife', '--name', 'PlumbCraft', '-o', bundle], { stdio: 'ignore' });
// the overlay finds its server from import.meta.url, which a plain script doesn't have: point it at an address that
// answers nothing, so every question to the server fails quietly and the rules judge from the page alone
const engine = (await readFile(bundle, 'utf8')).replaceAll('{}.url', '"http://plumb.invalid/overlay/src/craft.js"');

const browser = await chromium.launch();
try {
  for (const site of sites.filter((s) => !want.length || want.includes(s.id))) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, bypassCSP: true });
    try {
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3500);
      await page.addScriptTag({ content: engine });
      const read = await page.evaluate(`(async () => { ${helpers}
        const card = ${site.root}; if (!card) throw new Error('card not found');
        // the row: the smallest ancestor that holds a sibling card (clearly wider than the card)
        let row = card; while (row.parentElement && row.getBoundingClientRect().width < card.getBoundingClientRect().width * 1.6) row = row.parentElement;
        row.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 800));
        const els = [card === row ? card : row, ...row.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const craft = new PlumbCraft.Craft({ theme: new PlumbCraft.Theme({ decisions: () => [] }) });
        const items = els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'reference', line: 1, column: 1 }));
        let out = craft.enrich(items); await new Promise((r) => setTimeout(r, 1500)); out = craft.enrich(items);
        const where = (el) => { const r = el.getBoundingClientRect(), b = row.getBoundingClientRect(); return { inCard: card.contains(el), tag: el.tagName.toLowerCase(), text: (el.innerText || el.getAttribute('aria-label') || '').trim().split('\\n')[0].slice(0, 50), box: [Math.round(r.left - b.left), Math.round(r.top - b.top), Math.round(r.width), Math.round(r.height)] }; };
        const findings = out.flatMap((i) => i.marks.filter((m) => m.family === 'craft').map((m) => ({ rule: m.rule, text: m.text, because: m.because ?? m.why ?? m.title ?? '', value: m.value, confidence: m.confidence, ...where(i.el) })));
        const rb = row.getBoundingClientRect();
        return { row: { cards: row === card ? 1 : row.children.length, w: Math.round(rb.width), h: Math.round(rb.height) }, read: els.length, findings };
      })()`);
      await writeFile(`${here}reads/${site.id}.json`, JSON.stringify({ id: site.id, url: site.url, ...read }, null, 2) + '\n');
      const inCard = read.findings.filter((f) => f.inCard);
      const byRule = {}; for (const f of inCard) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
      console.log(`${site.id.padEnd(16)} row of ${read.row.cards} (${read.read} elements read)  ${read.findings.length} notes, ${inCard.length} on the card: ${Object.entries(byRule).map(([r, n]) => `${r.replace('craft/', '')}×${n}`).join(', ') || 'none'}`);
    } catch (e) { console.log(`${site.id.padEnd(16)} FAILED ${e.message.split('\n')[0]}`); }
    await page.close();
  }
} finally { await browser.close(); }
