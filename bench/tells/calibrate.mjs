// Scores the labelled pairs with the cuts plumber uses, against the embedding service at PLUMBER_MEANING_URL.
//   PLUMBER_MEANING_URL=http://127.0.0.1:18080 node bench/tells/calibrate.mjs
import { MEANING_CUTS, STOCK_LINES, hasSpecific } from '../../overlay/src/pack-tells.js';
import { CALIB, HELD } from './meaning-pairs.mjs';

const url = process.env.PLUMBER_MEANING_URL;
if (!url) { console.error('Set PLUMBER_MEANING_URL to the embedding service.'); process.exit(2); }
async function embed(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const r = await (await fetch(new URL('/embed', url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texts: texts.slice(i, i + 32).map((text, k) => ({ id: String(i + k), text })) }) })).json();
    out.push(...r.results.map((x) => x.vector));
  }
  return out;
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
for (const [name, set] of [['calibration', CALIB], ['held out', HELD]]) {
  const v = await embed([...STOCK_LINES, ...set.flatMap(([, h, s]) => [h, s])]);
  const stock = v.slice(0, STOCK_LINES.length), rest = v.slice(STOCK_LINES.length);
  const tally = { tp: 0, fp: 0, fn: 0, tn: 0 };
  set.forEach(([label, h, s], i) => {
    const close = dot(rest[2 * i], rest[2 * i + 1]), stocky = Math.max(...stock.map((x) => dot(x, rest[2 * i + 1])));
    const said = !hasSpecific(s) && (close >= MEANING_CUTS.echo || (close >= MEANING_CUTS.near && stocky >= MEANING_CUTS.stock));
    tally[said ? (label === 'R' ? 'tp' : 'fp') : (label === 'R' ? 'fn' : 'tn')]++;
    if (said !== (label === 'R')) console.log(`  wrong: ${label} ${close.toFixed(2)} ${stocky.toFixed(2)} ${h} | ${s}`);
  });
  console.log(name, tally);
}
