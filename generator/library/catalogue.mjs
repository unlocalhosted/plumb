// The catalogue of library parts the generator may install: every item in each library's public registry (the free
// set: Arc's open core, beUI's free components), with the jobs it can do and the content it needs, read from its name,
// title and description. Registries are fetched once and kept locally (generator/library/cache/, not committed).
//   node generator/library/catalogue.mjs   → generator/library/catalogue.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('./', import.meta.url));
export const LIBRARIES = [
  { lib: 'arc', registry: 'https://uiarc.dev/r/registry.json', item: (n) => `https://uiarc.dev/r/${n}.json`, page: (n, t) => `https://uiarc.dev/components/${t === 'registry:block' ? 'blocks/' : ''}${n}`,
    terms: 'Arc open core: free and open source; only free items are in its public registry (uiarc.dev/pricing)' },
  { lib: 'beui', registry: 'https://beui.dev/r/registry.json', item: (n) => `https://beui.dev/r/${n}.json`, page: (n) => `https://beui.dev/components/${n}`,
    terms: 'beUI free components: installed with the shadcn CLI, "the source is yours"; Pro items are not in the registry (beui.dev)' },
];
// a job (the brief's fixed list) a part can do, by the words that name it
const JOBS = [
  ['price', /\b(price|pricing|billing|money|currency|amount|cost)\b/],
  ['value', /\b(number|counter|digit|ticker|metric|stat|odometer|count ?up|gauge|meter)\b/],
  ['action', /\b(button|cta|call to action|copy|confirm|submit|action)\b/],
  ['status', /\b(badge|status|presence|tag|chip|indicator|live)\b/],
  ['proof', /\b(list|checklist|feature|features|benefit|testimonial|comparison|compare|included)\b/],
  ['position', /\b(stepper|steps|progress|timeline|stage|stages|tier|tiers|ladder|onboarding)\b/],
  ['navigation', /\b(pagination|tabs|breadcrumb|carousel|segmented|menu|nav|more)\b/],
  ['media', /\b(image|avatar|illustration|icon|globe|chart|sparkline|graph|visual|card stack)\b/],
  ['input', /\b(input|toggle|switch|select|slider|picker|field|checkbox|radio|combobox)\b/],
  ['help', /\b(tooltip|hover card|popover|hint|help)\b/],
  ['identity', /\b(heading|title|text reveal|text morph|shimmer|headline)\b/],
];
// content a part can't work without, so it is only offered where the product has it
const NEEDS = [
  ['a number that changes', /\b(number|counter|digit|ticker|odometer|count ?up|roll)\b/],
  ['two billing periods', /\b(monthly|yearly|annual|billing)\b/],
  ['ordered stages', /\b(stepper|steps|stage|stages|timeline|progress)\b/],
  ['people', /\b(avatar|presence|team|people|member)\b/],
  ['a data series', /\b(chart|sparkline|series|graph|heatmap)\b/],
  ['several plans', /\b(plans|plan comparison|comparison table)\b/],
];
const words = (it) => `${it.name.replace(/-/g, ' ')} ${it.title ?? ''} ${it.description ?? ''}`.toLowerCase();

export async function buildCatalogue() {
  await mkdir(`${here}cache`, { recursive: true });
  const parts = [];
  for (const L of LIBRARIES) {
    const file = `${here}cache/${L.lib}.json`;
    let reg; try { reg = JSON.parse(await readFile(file, 'utf8')); } catch {
      reg = await (await fetch(L.registry, { headers: { 'user-agent': 'Mozilla/5.0' } })).json(); await writeFile(file, JSON.stringify(reg));
    }
    for (const it of reg.items ?? []) {
      if (!/registry:(ui|component|block)/.test(it.type)) continue;
      const w = words(it);
      parts.push({ lib: L.lib, name: it.name, title: it.title ?? it.name, description: it.description ?? '', kind: it.type.split(':')[1],
        jobs: JOBS.filter(([, re]) => re.test(w)).map(([j]) => j), needs: NEEDS.filter(([, re]) => re.test(w)).map(([n]) => n),
        deps: it.dependencies ?? [], item: L.item(it.name), page: L.page(it.name, it.type), terms: L.terms });
    }
  }
  return parts;
}

export async function loadCatalogue() {
  try { return JSON.parse(await readFile(`${here}catalogue.json`, 'utf8')); } catch { const c = await buildCatalogue(); await writeFile(`${here}catalogue.json`, JSON.stringify(c, null, 1)); return c; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const c = await buildCatalogue();
  await writeFile(`${here}catalogue.json`, JSON.stringify(c, null, 1));
  const by = {}; for (const p of c) for (const j of p.jobs) by[j] = (by[j] ?? 0) + 1;
  console.log(`${c.length} parts (${c.filter((p) => p.lib === 'arc').length} Arc, ${c.filter((p) => p.lib === 'beui').length} beUI); untagged ${c.filter((p) => !p.jobs.length).length}`);
  console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([j, n]) => `${j} ${n}`).join(' · '));
}
