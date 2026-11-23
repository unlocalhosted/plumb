// Photographs the share picture (app/share/page.jsx) into public/share.png. Run with the dev server up:
//   node scripts/share.mjs [http://localhost:4330]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const { chromium } = createRequire(at('../../package.json'))('playwright');
const base = process.argv[2] ?? 'http://localhost:4330';
const b = await chromium.launch();
try {
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.addInitScript(() => localStorage.setItem('plumber:scheme', 'light'));
  await p.goto(`${base}/share`, { waitUntil: 'networkidle', timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  // only the picture: the bar, the foot and the dev server's own badges stay out of it
  await p.evaluate(() => {
    for (const el of [...document.body.children, ...document.documentElement.children]) {
      if (el !== document.body && el.tagName !== 'HEAD' && !el.matches('.share') && !el.querySelector('pattern')) el.style.setProperty('display', 'none', 'important');
    }
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: at('../public/share.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log('public/share.png');
} finally { await b.close(); }
