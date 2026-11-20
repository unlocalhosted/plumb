// Each registry's GitHub stars: its homepage is read for the repository it links to (the most-linked
// github.com/owner/repo that isn't a generic one), and GitHub is asked for that repository's star count (through the
// gh CLI, signed in). Stars are a quality prior the owner asked for: well-starred libraries are more often well built.
//   node generator/library/stars.mjs   → library/cache/stars.json  { registry: { repo, stars, how } }
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const parts = JSON.parse(await readFile(`${here}../data/buttons.json`, 'utf8'));
const dir = JSON.parse(await readFile(`${here}cache/harvest/registries.json`, 'utf8'));
const wanted = new Set(parts.map((p) => p.registry));
const regs = dir.filter((r) => wanted.has(r.name));
let out = {}; try { out = JSON.parse(await readFile(`${here}cache/stars.json`, 'utf8')); } catch {}
const NOT_A_LIB = /^(shadcn-ui\/ui|vercel\/next\.js|vercel\/ai|facebook\/react|tailwindlabs\/tailwindcss|radix-ui\/primitives|motiondivision\/motion|framer\/motion|lucide-icons\/lucide|withastro|sponsors|features|topics|orgs|apps|login|signup|pricing|about|site|github)\b/i;
const get = async (url) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try { const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0 (component research)' } }); return r.ok ? await r.text() : ''; } catch { return ''; } finally { clearTimeout(t); } };
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

await pool(regs.filter((r) => !out[r.name]), 10, async (r) => {
  const html = await get(r.homepage);
  const counts = {};
  for (const m of html.matchAll(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g)) {
    const repo = `${m[1]}/${m[2].replace(/\.git$/, '')}`.replace(/[.)]+$/, '');
    if (NOT_A_LIB.test(repo) || /\.(png|svg|jpg|js|css)$/.test(repo)) continue;
    counts[repo] = (counts[repo] ?? 0) + 1;
  }
  const repo = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!repo) { out[r.name] = { repo: null, stars: null, how: html ? 'no GitHub link on its homepage' : 'homepage did not load' }; return; }
  try {
    const stars = +execFileSync('gh', ['api', `repos/${repo}`, '--jq', '.stargazers_count'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    out[r.name] = { repo, stars, how: 'homepage link' };
  } catch { out[r.name] = { repo, stars: null, how: 'repository not found on GitHub' }; }
});
await writeFile(`${here}cache/stars.json`, JSON.stringify(out, null, 1));
const found = Object.values(out).filter((s) => s.stars != null);
console.log(`${regs.length} registries: ${found.length} with stars, ${regs.length - found.length} without`);
for (const [n, s] of Object.entries(out).filter(([, s]) => s.stars != null).sort((a, b) => b[1].stars - a[1].stars).slice(0, 15)) console.log(`  ${String(s.stars).padStart(7)}  ${n.padEnd(28)} ${s.repo}`);
