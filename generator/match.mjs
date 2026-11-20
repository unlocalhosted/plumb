// For each slot of a product's organism, the library parts that could fill it: they do the slot's job, and everything
// they need is content the product really has. Ranked by how closely their words match the slot's job.
import { loadCatalogue } from './library/catalogue.mjs';

// the jobs that can do a slot's work: a price is shown by anything that shows a number
const ACCEPTS = { price: ['price', 'value'], value: ['value', 'price'] };
export async function match(product, { per = 6 } = {}) {
  const cat = await loadCatalogue();
  const out = {};
  for (const slot of Object.keys(product.organism.slots)) {
    const jobs = ACCEPTS[slot] ?? [slot];
    // a part fills one slot: whole blocks are organisms of their own, and a control you type into only fills an input
    const doesIt = (p) => p.jobs.some((j) => jobs.includes(j)) && p.kind !== 'block' && (slot === 'input' || !p.jobs.includes('input'));
    const fits = cat.filter((p) => doesIt(p) && p.needs.every((n) => product.content[n]))
      .map((p) => ({ ...p, score: (jobs.includes(p.jobs[0]) ? 2 : 1) - p.jobs.length * 0.2 + (p.needs.length ? 0.5 : 0) }))
      .sort((a, b) => b.score - a.score);
    const refused = cat.filter((p) => doesIt(p) && !p.needs.every((n) => product.content[n])).length;
    out[slot] = { candidates: fits.slice(0, per), more: Math.max(0, fits.length - per), refused };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { product } = await import(`./products/${process.argv[2] ?? 'craftingattention'}.mjs`);
  for (const [slot, m] of Object.entries(await match(product))) {
    console.log(`${slot.padEnd(9)} ${m.candidates.map((p) => `${p.lib}/${p.name}`).join(', ')}${m.more ? ` (+${m.more})` : ''}  · ${m.refused} refused for missing content`);
  }
}
