// Installs harvested parts into the sandbox so each can render on its own (stage 3 of docs/briefs/button-poc.md).
// A part's files are written at their own paths under parts/<key>/, its `@/` imports rewritten: to its own files (by
// file name), to another part of the same registry it depends on (installed beside it), or to the sandbox's standard
// shadcn pieces (lib/utils, components/ui/button). An entry renders the part's main export with words in it, or the
// author's example when the registry has one.
//   node generator/sandbox/install.mjs <how many> [--ids a,b]   → parts/<key>/, installed.json
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const lib = `${here}../library/`;
const args = process.argv.slice(2);
const want = +(args[0] ?? 20);
const only = args.includes('--ids') ? args[args.indexOf('--ids') + 1].split(',') : null;
const D = JSON.parse(await readFile(`${here}../data/buttons.json`, 'utf8'));
const harvest = Object.fromEntries(JSON.parse(await readFile(`${lib}cache/harvest-button.json`, 'utf8')).map((p) => [`${p.registry}/${p.name}`, p]));
const keyOf = (id) => id.replace(/^@/, '').replace(/[^\w-]+/g, '__');
// the order stage 2 ranked them in (data/weight.py: best by weight, one per family, at most 12 per library)
const pick = only ? D.filter((r) => only.includes(r.id)) : D.filter((r) => r.renderRank && r.renderRank <= want).sort((a, b) => a.renderRank - b.renderRank);

const readItem = async (registry, name) => { const slug = registry.replace(/^@/, ''); for (const f of [`${lib}cache/harvest/${slug}/${name.replace(/[^\w.-]/g, '_')}.json`]) { try { return JSON.parse(await readFile(f, 'utf8')); } catch {} } return null; };
const fetchItem = async (registry, name) => { const reg = JSON.parse(await readFile(`${lib}cache/harvest/registries.json`, 'utf8')).find((r) => r.name === registry); if (!reg) return null;
  try { const r = await fetch(reg.url.replace('{name}', name), { headers: { 'user-agent': 'Mozilla/5.0 (component research)' } }); return r.ok ? await r.json() : null; } catch { return null; } };
const SANDBOX = { utils: `${here}lib/utils.ts`, button: `${here}components/ui/button.tsx` };

// a library's global theme: the style, theme or base items in its index (what `shadcn init` would install), merged
const themes = new Map();
async function themeOf(registry) {
  if (themes.has(registry)) return themes.get(registry);
  const slug = registry.replace(/^@/, ''); let idx = null; try { idx = JSON.parse(await readFile(`${lib}cache/harvest/${slug}/registry.json`, 'utf8')); } catch {}
  const t = { cssVars: {}, css: {} };
  for (const it of (idx?.items ?? []).filter((i) => /registry:(style|theme|base)/.test(i.type ?? ''))) {
    const file = `${lib}cache/harvest/${slug}/__theme__${it.name.replace(/[^\w.-]/g, '_')}.json`;
    let x; try { x = JSON.parse(await readFile(file, 'utf8')); } catch { x = await fetchItem(registry, it.name); if (x) await writeFile(file, JSON.stringify(x)); }
    for (const [k, v] of Object.entries(x?.cssVars ?? {})) t.cssVars[k] = { ...(t.cssVars[k] ?? {}), ...v };
    Object.assign(t.css, x?.css ?? {});
  }
  themes.set(registry, t); return t;
}
// shadcn's `css` object to CSS text: { "@keyframes x": { "0%": {...} }, ".sel": { "prop": "v" } }
const cssText = (o, pad = '') => Object.entries(o).map(([k, v]) => typeof v === 'object' ? `${pad}${k} {\n${cssText(v, pad + '  ')}\n${pad}}` : `${pad}${k}: ${v};`).join('\n');
const STANDARD = new Set(['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring', 'radius']);
const colourNames = new Set(), themeKeys = new Map();
// shadcn's standard pieces (dropdown-menu, dialog, tooltip…), fetched on demand from shadcn's own registry the first
// time a part asks for one, into the sandbox's components/ui, imports pointed at the sandbox's own utils and button
async function standardPiece(name) {
  const to = `${here}components/ui/${name}.tsx`;
  if (existsSync(to)) return to;
  try {
    const r = await fetch(`https://ui.shadcn.com/r/styles/new-york-v4/${name}.json`, { headers: { 'user-agent': 'Mozilla/5.0 (component research)' } });
    if (!r.ok) return null;
    const item = await r.json(); const f = (item.files ?? [])[0]; if (!f?.content) return null;
    await writeFile(to, f.content.replace(/["']@\/lib\/utils["']/g, "'../../lib/utils'").replace(/["']@\/(?:registry\/[^"']+\/)?(?:components\/)?ui\/([\w-]+)["']/g, "'./$1'"));
    return to;
  } catch { return null; }
}
const declared = new Set();
const report = [];
for (const r of pick) {
  const p = harvest[r.id]; const key = keyOf(r.id), dir = `${here}parts/${key}/`;
  await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  const item = (await readItem(r.registry, p.name)) ?? {};
  // the part's files, and the registry parts it depends on (one level), all under one folder
  for (const d of item.dependencies ?? []) declared.add(d);
  const files = [...(item.files ?? [])];
  for (const dep of item.registryDependencies ?? []) {
    const name = String(dep).split('/').pop().replace(/\.json$/, ''); if (!name || ['button', 'utils'].includes(name)) continue;
    const di = /^https?:/.test(dep) ? await (await fetch(dep).catch(() => null))?.json().catch(() => null) : (await readItem(r.registry, name)) ?? (await fetchItem(r.registry, name));
    for (const f of di?.files ?? []) files.push(f);
  }
  const written = [];
  for (const f of files) { if (!f.content) continue; const path = (f.target || f.path || `${basename(f.path ?? 'part')}`).replace(/^\.?\/+/, '').replace(/^~\//, ''); const to = join(dir, path); await mkdir(dirname(to), { recursive: true }); written.push({ to, content: f.content, type: f.type }); }
  const byBase = new Map(written.map((w) => [basename(w.to).replace(/\.(tsx?|jsx?)$/, ''), w.to]));
  const rel = (from, to) => { let s = relative(dirname(from), to).replace(/\.(tsx?|jsx?)$/, ''); return s.startsWith('.') ? s : `./${s}`; };
  const wanted = new Set();
  for (const w of written) {
    const src = w.content.replace(/(from\s+|import\s*\(\s*)(["'])(@\/[^"']+|~\/[^"']+)\2/g, (m, pre, q, spec) => {
      const base = spec.split('/').pop();
      if (/\/(lib\/)?utils$|\/cn$/.test(spec)) return `${pre}${q}${rel(w.to, SANDBOX.utils)}${q}`;
      if (byBase.has(base)) return `${pre}${q}${rel(w.to, byBase.get(base))}${q}`;
      if (base === 'button') return `${pre}${q}${rel(w.to, SANDBOX.button)}${q}`;
      if (/\/ui\/[\w-]+$/.test(spec)) { wanted.add(base); return `${pre}${q}${rel(w.to, `${here}components/ui/${base}.tsx`)}${q}`; }
      return m;
    }).replace(/(from\s+)(["'])cn\2/g, (m, pre, q) => `${pre}${q}${rel(w.to, SANDBOX.utils)}${q}`);
    await writeFile(w.to, src);
  }
  // its theme: the library's, then its own and its dependencies' (later wins), scoped to this part
  const lt = await themeOf(r.registry);
  const vars = { ...(lt.cssVars.light ?? {}), ...(item.cssVars?.light ?? {}) }, theme = { ...(lt.cssVars.theme ?? {}), ...(item.cssVars?.theme ?? {}) };
  for (const k of Object.keys(vars)) if (!STANDARD.has(k)) colourNames.add(k);
  for (const [k, v] of Object.entries(theme)) themeKeys.set(k, v);
  const css = { ...lt.css, ...(item.css ?? {}) };
  // a library's own rules use Tailwind's shorthands (@apply …), which resolve only against the sandbox's stylesheet, so
  // the file points at it (@reference); its @imports (its fonts, a package's stylesheet) are the library site's, not ours
  const own = cssText(Object.fromEntries(Object.entries(css).filter(([k]) => !k.startsWith('@import')))).split('\n').filter((l) => !/^\s*@import\b/.test(l)).join('\n');
  await writeFile(`${dir}theme.css`, `@reference "../../styles.css";\n[data-part="${key}"] {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}\n${own}\n`);
  for (const n of wanted) await standardPiece(n);
  // the entry: the author's example if there is one, else the part's main export with words in it
  const main = written.find((w) => /registry:(example)/.test(w.type ?? '')) ?? written.find((w) => basename(w.to).replace(/\.(tsx?|jsx?)$/, '').toLowerCase() === p.name.toLowerCase()) ?? written.find((w) => /\.(tsx|jsx)$/.test(w.to)) ?? written[0];
  if (!main) { report.push({ id: r.id, key, ok: false, why: 'no files' }); continue; }
  const exports = [...main.content.matchAll(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z]\w*)/g)].map((m) => m[1]);
  const isDefault = /export\s+default\s+/.test(main.content);
  const camel = p.name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()).toLowerCase();
  const name = exports.find((e) => e.toLowerCase() === camel) ?? exports[0];
  const entry = `import './theme.css';
import * as M from '${rel(`${dir}entry.jsx`, main.to)}';
const C = ${name ? `M['${name}'] ?? ` : ''}M.default ?? Object.values(M).find((v) => typeof v === 'function');
export default function Demo() { return <div data-part="${key}"><C text="Get started" label="Get started">Get started</C></div>; }
`;
  await writeFile(`${dir}entry.jsx`, entry);
  const unresolved = [...new Set(written.flatMap((w) => [...w.content.matchAll(/from\s+["'](@\/[^"']+|~\/[^"']+)["']/g)].map((m) => m[1]).filter((s) => { const b = s.split('/').pop(); return !(/utils$|\/cn$/.test(s) || byBase.has(b) || b === 'button'); })))];
  report.push({ id: r.id, key, ok: true, files: written.length, entry: name ?? (isDefault ? 'default' : '?'), unresolved });
}
const tw = [...colourNames].filter((k) => !/^(font|radius|shadow|animate|spacing|text|tracking|leading)-?/.test(k)).map((k) => `  --color-${k}: var(--${k});`);
const keys = [...themeKeys].filter(([k]) => /^(font|radius|shadow|animate|ease|text|tracking|leading)-/.test(k)).map(([k, v]) => `  --${k}: ${v};`);
await writeFile(`${here}themes.generated.css`, `/* generated by install.mjs: the colour and theme names the installed parts' libraries use */\n@theme inline {\n${[...tw, ...keys].join('\n')}\n}\n`);
// the packages the installed parts declare, for the run to install beside the sandbox's own
await writeFile(`${here}declared-deps.txt`, [...declared].filter((d) => /^[@a-z0-9][\w@./-]*$/i.test(d)).join('\n') + '\n');
const prev = existsSync(`${here}installed.json`) ? JSON.parse(await readFile(`${here}installed.json`, 'utf8')) : [];
const merged = Object.values(Object.fromEntries([...prev, ...report].map((x) => [x.id, x])));
await writeFile(`${here}installed.json`, JSON.stringify(merged, null, 1));
console.log(`${report.filter((x) => x.ok).length} of ${report.length} installed; ${report.filter((x) => x.unresolved?.length).length} with imports the sandbox can't answer`);
for (const x of report.slice(0, 12)) console.log(`  ${x.ok ? '✓' : '✗'} ${x.id.slice(0, 50).padEnd(50)} ${x.entry ?? x.why}${x.unresolved?.length ? `  unresolved: ${x.unresolved.join(' ')}` : ''}`);
