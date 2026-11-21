// The icon a suggestion carries, chosen by meaning from the product's own icon set. The shipped button's picture is
// kept only when it means the action (crafting attention's arrow); a picture that names something else (algorecall's
// slab shows the lesson's topic) is not copied onto "Start review". Every icon name in the set and the button's action
// are embedded by the jev service (local-evidence on vm-agent, all-MiniLM-L6-v2), and the nearest name wins.
//   PLUMBER_MEANING_URL=http://127.0.0.1:18080 node generator/style/icon.mjs [product]
//     → generator/playground/atoms/icons/<product>.json   (vectors cached in generator/style/icons/<set>.vectors.json)
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { MOMENTS } from '../data/standards.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const [product = 'algorecall'] = process.argv.slice(2);
const URL_ = process.env.PLUMBER_MEANING_URL ?? 'http://127.0.0.1:18080';
const { product: P } = await import(`../products/${product}.mjs`);
const root = { algorecall: '/Users/vijaysingh/unlocalhosted/algorecall' }[product] ?? '/Users/vijaysingh/unlocalhosted/craftingattention/app';
const atom = P.atoms[0], moment = MOMENTS[`${product}/${atom.id}`];

// the product's icon set: the library its source imports most
const pkg = JSON.parse(await readFile(`${root}/package.json`, 'utf8'));
const SETS = { 'lucide-react': { dir: 'node_modules/lucide-react/dist/esm/icons' } };
const set = Object.keys(SETS).find((s) => pkg.dependencies?.[s] || pkg.devDependencies?.[s]);
if (!set) throw new Error(`${product}: no icon set we can read (${Object.keys(SETS).join(', ')})`);
const names = (await readdir(`${root}/${SETS[set].dir}`)).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));

const embed = async (texts) => { const out = [];
  for (let i = 0; i < texts.length; i += 32) { const r = await fetch(`${URL_}/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texts: texts.slice(i, i + 32).map((text, j) => ({ id: String(i + j), text })) }) });
    if (!r.ok) throw new Error(`jev /embed ${r.status}`); out.push(...(await r.json()).results.map((x) => x.vector)); }
  return out; };
// each icon as its name and the tags Lucide publishes for it (lucide-static's tags.json, same version), so it is
// matched on what it means (play: start, run) and not only on the words in its name (list-start)
let TAGS = {}; try { TAGS = JSON.parse(await readFile(`${here}icons/${set}.tags.json`, 'utf8')); } catch {}
const words = (n) => `${n.replace(/-/g, ' ')}${TAGS[n]?.length ? `: ${TAGS[n].join(', ')}` : ''}`;
const cache = `${here}icons/${set}.vectors.json`; await mkdir(`${here}icons`, { recursive: true });
let C = {}; try { C = JSON.parse(await readFile(cache, 'utf8')); } catch {}
const missing = names.filter((n) => C[n]?.text !== words(n)); // re-embedded when its text changes
if (missing.length) { const vs = await embed(missing.map(words)); missing.forEach((n, i) => { C[n] = { text: words(n), v: vs[i].map((x) => +x.toFixed(5)) }; }); await writeFile(cache, JSON.stringify(C)); }
const V = Object.fromEntries(names.map((n) => [n, C[n].v]));

// the action, in the words the button and its moment use
// the action in the product's own sense of its words: alone, “review” reads as a star rating
const action = `${atom.label}: ${moment?.name ?? ''}, in ${P.about ?? P.name}`;
const [q] = await embed([action]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
// an icon on a button shows the action, never the topic (Material: an icon in a button clarifies the action). So the
// field is first narrowed to the icons Lucide itself files under the action's kind, and only then ranked by meaning:
// without it, embeddings matched “review” to a half star, and with the product's sense to a code chat bubble
const ROLE = { commit: ['arrows', 'multimedia', 'navigation'] };
let CAT = {}; try { CAT = JSON.parse(await readFile(`${here}icons/${set}.categories.json`, 'utf8')); } catch {}
const kinds = ROLE[atom.job], fits = (n) => !kinds || !CAT[n] || CAT[n].some((k) => kinds.includes(k));
const ranked = names.filter(fits).map((n) => ({ name: n, score: +dot(q, V[n]).toFixed(3) })).sort((a, b) => b.score - a.score);
// the shipped icon keeps its place when it is from the set and means the action nearly as well as the best name
const shippedName = atom.shippedIcon ?? null;
const shipped = shippedName && V[shippedName] ? { name: shippedName, score: +dot(q, V[shippedName]).toFixed(3) } : null;
const pick = shipped && shipped.score >= ranked[0].score - 0.05 ? { ...shipped, why: 'the shipped icon, which means the action' } : { ...ranked[0], why: `the nearest in meaning to “${action}” of the ${ranked.length} ${set} icons filed under ${kinds?.join(', ') ?? 'any kind'}` };

// its drawing, as the library draws it
const req = createRequire(`${root}/package.json`);
const React = req('react'), { renderToStaticMarkup } = req('react-dom/server');
const Comp = (await import(`${root}/${SETS[set].dir}/${pick.name}.js`)).default;
const svg = renderToStaticMarkup(React.createElement(Comp, { size: '1em', strokeWidth: 2, 'aria-hidden': true }));
await writeFile(fileURLToPath(new URL(`../playground/atoms/icons/${product}.json`, import.meta.url)), JSON.stringify({ product, atom: atom.id, set, action, pick: { name: pick.name, score: pick.score, why: pick.why }, nearest: ranked.slice(0, 8), svg }, null, 1));
console.log(`${product}: “${action}” → ${pick.name} (${pick.score}) · next: ${ranked.slice(1, 8).map((r) => `${r.name} ${r.score}`).join(', ')}`);
