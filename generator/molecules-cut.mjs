// Cuts each molecule out of its live page (generator/molecules.mjs) and lays them out on one sheet, by product, each
// with what it is and the code that draws it. Screenshots stay local (generator/shots/).
//   node generator/molecules-cut.mjs
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MOLECULES } from './molecules.mjs';
import { helpers } from './sites.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
await mkdir(`${here}shots/molecules`, { recursive: true });
const browser = await chromium.launch();
const cut = [];
try {
  const byUrl = Map.groupBy(MOLECULES, (m) => m.url);
  for (const [url, list] of byUrl) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, bypassCSP: true });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(Math.max(...list.map((m) => m.wait ?? 4000)));
    await page.evaluate(() => { for (const e of document.querySelectorAll('body *')) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') e.style.setProperty('display', 'none', 'important'); } });
    for (const m of list) {
      const ok = await page.evaluate(`(() => { ${helpers}
        const slabOf = (name) => upTo([...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && e.textContent.trim() === name && upTo(e, (a) => /\\+\\d+ more/.test(a.innerText) && /Two Pointers/.test(a.innerText))), (e) => e.getBoundingClientRect().width > 400 && e.querySelector('svg, img'));
        const el = ${m.pick}; if (!el) return false;
        el.setAttribute('data-molecule', '${m.id}'); el.scrollIntoView({ block: 'center' }); return true; })()`);
      if (!ok) { console.log(`${m.house.padEnd(18)} ${m.id.padEnd(16)} not found`); continue; }
      await page.waitForTimeout(1200); // a sticker or a bubble plays as it comes into view; let it land
      const path = `${here}shots/molecules/${m.id}.png`;
      // a margin round the cut: a slab's front edge, a card's shadow and a sticker's hatch sit just outside its box
      const box = await page.locator(`[data-molecule="${m.id}"]`).first().boundingBox();
      const pad = 18;
      await page.screenshot({ path, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(1280 - Math.max(0, box.x - pad), box.width + pad * 2), height: box.height + pad * 2 } });
      cut.push({ ...m, path });
      console.log(`${m.house.padEnd(18)} ${m.id.padEnd(16)} cut`);
    }
    await page.close();
  }
  // the sheet: one band per product, each molecule at work, what it is, where it lives
  const bands = Map.groupBy(cut, (m) => m.house);
  const NAME = { craftingattention: 'Crafting attention · pricing', algorecall: 'algorecall · review stack', 'crafting-ui': 'crafting-ui · lesson tile', 'react-plumber': 'React Plumber · its section on craftingui.com' };
  const fig = async (m) => `<figure><div class="img"><img src="data:image/png;base64,${(await readFile(m.path)).toString('base64')}"></div><figcaption><b>${m.id.replace(/-/g, ' ')}</b> <i>${m.job}</i><span>${m.is}</span><code>${m.code}</code></figcaption></figure>`;
  let html = `<style>body{margin:0;padding:30px;background:#f4f2ee;font:14px/1.45 -apple-system,system-ui;color:#1d1b17}h1{font-size:20px;margin:0 0 6px}h1+p{margin:0 0 22px;color:#555}h2{font-size:16px;margin:26px 0 10px}section{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}figure{margin:0;background:#fff;border-radius:12px;padding:12px}.img{display:grid;place-items:center;min-height:110px;background:#faf9f7;border-radius:8px;padding:10px}img{max-width:100%;max-height:260px}figcaption{display:flex;flex-direction:column;gap:3px;margin-top:8px}figcaption b{text-transform:capitalize}figcaption i{color:#888;font-style:normal;font-size:12px}figcaption span{color:#333}code{font:12px ui-monospace,monospace;color:#777}</style>
    <h1>Molecules, pulled out of four real products</h1><p>Each one cut from its live page, where it does its job. None drawn for the generator.</p>`;
  for (const [house, list] of bands) html += `<h2>${NAME[house]}</h2><section>${(await Promise.all(list.map(fig))).join('')}</section>`;
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.setContent(html); await page.waitForTimeout(300);
  await page.screenshot({ path: `${here}shots/molecules-sheet.png`, fullPage: true });
  await writeFile(`${here}shots/molecules/index.json`, JSON.stringify(cut.map(({ path, ...m }) => m), null, 2));
} finally { await browser.close(); }
