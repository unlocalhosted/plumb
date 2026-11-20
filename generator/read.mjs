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
      // fixed and sticky bars (site menus) would cover the row; they go before anything is measured, so the marks land true
      await page.evaluate(() => { for (const e of document.querySelectorAll('body *')) { const pos = getComputedStyle(e).position; if (pos === 'fixed' || pos === 'sticky') e.style.setProperty('display', 'none', 'important'); } });
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
        // the alignment measures (overlay/src/craft-rows.js), so the read says what holds as well as what's wrong
        const facts = new PlumbCraft.Facts();
        let line = null, unit = card;
        for (let a = card; a && a !== document.body && !line; a = a.parentElement) {
          const lines = a.parentElement ? PlumbCraft.rowsOf(a.parentElement, facts) : [];
          line = lines.find((l) => l.includes(a)) ?? null; if (line) unit = a;
        }
        const name = (e) => (e?.innerText || '').trim().split('\\n')[0].slice(0, 30);
        const lines = line ? PlumbCraft.rowLines(line, facts).map((p) => ({ part: p.part, off: Math.round(p.off * 10) / 10, cards: p.els.length, said: p.els.map(name) })) : null;
        const e = PlumbCraft.edgesOf(unit, facts), a = PlumbCraft.actionsOf(unit, facts);
        const measures = {
          row: line ? { cards: line.length, lines } : null,
          edges: e.edges.map((g) => ({ x: g.x, n: g.els.length, first: name(g.els[0]) || g.els[0].localName })), hanging: e.hanging.map((g) => ({ x: g.x, n: g.els.length })),
          actions: { filled: a.filled.map(name), main: name(a.main), full: a.full },
        };
        // draw the read on the page: row lines across the cards (mint when they hold, coral when they drift), and the
        // picked card's edges (mint for its one column, coral for each extra edge, sky dashes for hanging words)
        const MINT = '#1a9460', CORAL = '#bf3a1e', SKY = '#3391ee';
        const layer = document.createElement('div'); layer.setAttribute('data-read-marks', ''); layer.style.cssText = 'position:absolute;inset:0 auto auto 0;width:0;height:0;z-index:2147483647;pointer-events:none';
        document.body.append(layer);
        const at = (x, y) => [x + scrollX, y + scrollY];
        const mark = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;' + css; layer.append(d); return d; };
        const pill = (x, y, text, colour) => { const p = mark(\`left:\${x}px;top:\${y}px;transform:translate(-50%,-100%);background:\${colour};color:#fff;font:600 11px/1 ui-monospace,monospace;padding:3px 6px;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 2px #fff\`); p.textContent = text; };
        if (line) for (const p of PlumbCraft.rowLines(line, facts)) {
          const ok = p.off <= 2, colour = ok ? MINT : CORAL;
          p.els.forEach((e, i) => { const r = e.getBoundingClientRect(), c = line.find((k) => k.contains(e)).getBoundingClientRect(); const y = p.part === 'price' ? p.tops[i] : r.top; const [x0, y0] = at(c.left + 6, y);
            mark(\`left:\${x0}px;top:\${y0}px;width:\${c.width - 12}px;height:0;border-top:2px \${ok ? 'solid' : 'dashed'} \${colour}\`);
            if (i === 0) pill(x0 + 46, y0 - 3, \`\${p.part} \${ok ? '✓ one line' : Math.round(p.off) + 'px apart'}\`, colour); });
        }
        const ur = unit.getBoundingClientRect(), us = getComputedStyle(unit), cl = ur.left + parseFloat(us.borderLeftWidth) + parseFloat(us.paddingLeft);
        const main = [...e.edges].sort((a, b) => b.els.length - a.els.length)[0];
        for (const g of e.edges) { const ok = g === main, [x, y] = at(cl + g.x, ur.top); mark(\`left:\${x}px;top:\${y}px;width:0;height:\${ur.height}px;border-left:2px \${ok ? 'solid' : 'dashed'} \${ok ? MINT : CORAL}\`); if (!ok) pill(x, y + ur.height + 18, \`edge +\${Math.round((g.x - main.x) * 10) / 10}px\`, CORAL); }
        for (const g of e.hanging) { const [x, y] = at(cl + g.x, ur.top); mark(\`left:\${x}px;top:\${y}px;width:0;height:\${ur.height}px;border-left:1.5px dashed \${SKY};opacity:.7\`); }
        if (main) { const [x, y] = at(cl + main.x, ur.top); pill(x, y + ur.height + 18, e.edges.length === 1 ? 'one edge ✓' : 'main edge', e.edges.length === 1 ? MINT : CORAL); }
        (line ? line[0].parentElement : row).setAttribute('data-read-row', '');
        return { row: { cards: row === card ? 1 : row.children.length, w: Math.round(rb.width), h: Math.round(rb.height) }, read: els.length, findings, measures };
      })()`);
      // the row with its marks, kept local beside the other screenshots
      // boundingBox is in the window's frame; a full-page shot is clipped in the page's
      const box = await page.locator('[data-read-row]').evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
      if (box) await page.screenshot({ path: `${here}shots/read-${site.id}.png`, clip: { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 36), width: Math.min(1280 - Math.max(0, box.x - 24), box.width + 48), height: box.height + 84 }, fullPage: true });
      await writeFile(`${here}reads/${site.id}.json`, JSON.stringify({ id: site.id, url: site.url, ...read }, null, 2) + '\n');
      const inCard = read.findings.filter((f) => f.inCard);
      const byRule = {}; for (const f of inCard) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
      const M = read.measures;
      console.log(`${site.id.padEnd(16)} row lines: ${M.row ? M.row.lines.map((l) => `${l.part} ${l.off <= 2 ? 'on one line' : `${l.off}px apart`}`).join(', ') + ` (${M.row.cards} cards)` : 'no row of cards found'}`);
      console.log(`${''.padEnd(16)} edges: ${M.edges.length} (${M.edges.map((g) => `${g.x}px ×${g.n} "${g.first}"`).join(' | ')})  hanging: ${M.hanging.map((g) => `${g.x}px ×${g.n}`).join(', ') || 'none'}`);
      console.log(`${''.padEnd(16)} buttons: ${M.actions.filled.length} filled [${M.actions.filled.join(' | ')}], main "${M.actions.main}" ${M.actions.full ? 'full width' : 'own width'}`);
      console.log(`${site.id.padEnd(16)} row of ${read.row.cards} (${read.read} elements read)  ${read.findings.length} notes, ${inCard.length} on the card: ${Object.entries(byRule).map(([r, n]) => `${r.replace('craft/', '')}×${n}`).join(', ') || 'none'}`);
    } catch (e) { console.log(`${site.id.padEnd(16)} FAILED ${e.message.split('\n')[0]}`); }
    await page.close();
  }
} finally { await browser.close(); }
