// The harvest: every public shadcn registry (ui.shadcn.com/r/registries.json lists them, with their health), each
// one's index, and from it every part that does one atom's job, downloaded with its source. Stored locally only
// (library/cache/harvest, gitignored): it is other people's code, read to learn how it is built, not shipped.
//   node generator/library/harvest.mjs button   → library/cache/harvest/<registry>/<item>.json, harvest-button.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const atom = process.argv[2] ?? 'button';
const CACHE = `${here}cache/harvest/`;

// what makes a part a button, by its name, title or description; and what doesn't (range sliders, whole blocks)
const WANT = { button: /\b(button|btn|cta|call[- ]to[- ]action|hold[- ]to|slide[- ]to|swipe[- ]to|press|confirm|magnetic|ripple|shiny|shimmer[- ]button|pulse[- ]button|rainbow[- ]button|interactive[- ]hover)\b/i };
const NOT = /\b(range|slider (input|range)|volume|carousel|navbar|sidebar|page|template|landing|section|block|dashboard|form|table|chart)\b/i;

const get = async (url, ms = 15000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0 (component research)' } }); if (!r.ok) return null; return await r.json(); } catch { return null; } finally { clearTimeout(t); } };
// a few at a time, never a flood
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

await mkdir(CACHE, { recursive: true });
let dir; try { dir = JSON.parse(await readFile(`${CACHE}registries.json`, 'utf8')); } catch { dir = await get('https://ui.shadcn.com/r/registries.json', 30000); await writeFile(`${CACHE}registries.json`, JSON.stringify(dir)); }
const healthy = dir.filter((r) => r.health?.status === 'healthy' || r.health?.status === 'degraded');
console.log(`${dir.length} registries listed, ${healthy.length} healthy or degraded`);

// 1. each registry's index
let indexed = 0, failed = 0;
const found = [];
await pool(healthy, 12, async (r) => {
  const slug = r.name.replace(/^@/, '');
  const file = `${CACHE}${slug}/registry.json`;
  let idx; try { idx = JSON.parse(await readFile(file, 'utf8')); } catch { idx = await get(r.url.replace('{name}', 'registry')); if (idx) { await mkdir(`${CACHE}${slug}`, { recursive: true }); await writeFile(file, JSON.stringify(idx)); } }
  if (!idx?.items) { failed++; return; }
  indexed++;
  for (const it of idx.items) {
    const words = `${it.name} ${it.title ?? ''} ${it.description ?? ''}`;
    if (!/registry:(ui|component|example)/.test(it.type ?? 'registry:ui') || !WANT[atom].test(words.replace(/-/g, ' ')) || NOT.test(words.replace(/-/g, ' '))) continue;
    found.push({ registry: r.name, homepage: r.homepage, rank: r.ranking?.score ?? null, name: it.name, title: it.title ?? it.name, description: it.description ?? '', type: it.type, deps: it.dependencies ?? [], url: r.url.replace('{name}', it.name), slug });
  }
});
console.log(`${indexed} indexes read, ${failed} gave none; ${found.length} ${atom} parts found`);

// 2. each part's item, with its source files
let got = 0;
await pool(found, 12, async (p) => {
  const file = `${CACHE}${p.slug}/${p.name.replace(/[^\w.-]/g, '_')}.json`;
  let item; try { item = JSON.parse(await readFile(file, 'utf8')); } catch { item = await get(p.url); if (item) await writeFile(file, JSON.stringify(item)); }
  if (!item) return;
  const files = (item.files ?? []).filter((f) => f.content);
  p.file = file.replace(here, 'library/'); p.files = files.length; p.lines = files.reduce((n, f) => n + f.content.split('\n').length, 0);
  p.registryDeps = item.registryDependencies ?? []; p.cssVars = !!item.cssVars; p.examples = (item.files ?? []).filter((f) => /example|demo/i.test(f.path ?? '')).length;
  if (files.length) got++;
});
const ok = found.filter((p) => p.files);
await writeFile(`${here}cache/harvest-${atom}.json`, JSON.stringify(ok, null, 1));
console.log(`${got} parts downloaded with source (${ok.reduce((n, p) => n + p.lines, 0)} lines) from ${new Set(ok.map((p) => p.registry)).size} registries → library/cache/harvest-${atom}.json`);
