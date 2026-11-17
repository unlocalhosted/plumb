#!/usr/bin/env node
// A page as the blueprint reader sees it: every stamped element's stamp, tag and classes, read from a running dev
// server in a headless browser. The result is what bench/moments/run.mjs posts to `page`.
//   node bench/moments/capture.mjs --url http://localhost:5190/ --out page.json
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const { values } = parseArgs({ options: { url: { type: 'string' }, out: { type: 'string' }, settle: { type: 'string', default: '8000' } } });
if (!values.url || !values.out) throw new Error('Give --url and --out.');
const browser = await chromium.launch();
try {
  const tab = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await tab.goto(values.url, { waitUntil: 'load', timeout: 180_000 });
  await tab.waitForTimeout(Number(values.settle));
  const items = await tab.evaluate(() => [...document.querySelectorAll('[data-plumb-source]')].map(el => {
    const classes = el.getAttribute('class');
    return { stamp: el.getAttribute('data-plumb-source'), tag: el.localName, ...(classes ? { classes } : {}) };
  }));
  const files = new Map();
  for (const { stamp } of items) { const file = stamp.replace(/:\d+:\d+#.*$/, ''); files.set(file, (files.get(file) ?? 0) + 1); }
  writeFileSync(values.out, JSON.stringify({ url: values.url, capturedAt: new Date().toISOString(), files: [...files].sort((a, b) => b[1] - a[1]), items }));
  console.log(JSON.stringify({ elements: items.length, files: files.size, busiest: [...files].sort((a, b) => b[1] - a[1]).slice(0, 3) }));
} finally { await browser.close(); }
