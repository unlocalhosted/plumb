// Checks every specimen against the format in docs/briefs/organism-generator.md and prints how far apart their
// structures are.   node generator/validate.mjs [kind-folder]
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const JOBS = ['identity', 'price', 'proof', 'action', 'secondary-action', 'status', 'position', 'value', 'media', 'meta', 'input', 'navigation', 'help', 'dismiss'];
const MOVES = { 'single-out': ['which'], bind: ['a', 'b'], 'set-apart': ['group'] };
const ROLES = ['ink', 'quieter', 'the-action', 'the-action-quiet', 'link', 'chip', 'done', 'wrong'];
const LEADS = ['flat', 'clear', 'strong'];
const DENSITY = ['airy', 'balanced', 'compact'];
const GROUNDS = ['none', 'surface', 'tinted', 'inset', 'inverse'];
const EDGES = ['none', 'line'];
const SHAPES = ['none', 'small', 'medium', 'large', 'round'];
const STATUS = ['draft', 'kept'];
// an absolute value anywhere outside `source`: pixels, hex, colour functions, font names, sizes inside a slot
const ABSOLUTE = /\b\d+(\.\d+)?px\b|#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|oklch|lab)\(|font|\bInter\b|\bArial\b|Helvetica|fontSize|fontWeight/i;

const here = fileURLToPath(new URL('./specimens/', import.meta.url));
const kind = process.argv[2] || 'pricing-card';
const files = (await readdir(here + kind)).filter((f) => f.endsWith('.json')).sort();
const specimens = [];
let failed = 0;

for (const f of files) {
  const s = JSON.parse(await readFile(`${here}${kind}/${f}`, 'utf8'));
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  const jobs = (s.jobs || []).map((j) => j.job);
  need(s.id && f === `${s.id}.json`, 'id must match the file name');
  need(STATUS.includes(s.status), `status must be one of ${STATUS}`);
  need(jobs.length >= 2, 'at least two jobs');
  for (const j of jobs) need(JOBS.includes(j), `unknown job "${j}"`);
  need(new Set(jobs).size === jobs.length, 'a job is listed twice');
  need(Array.isArray(s.order) && s.order.length === jobs.length && s.order.every((j) => jobs.includes(j)), 'order must list every job once');
  const inNesting = JSON.stringify(s.nesting || {}).match(/"([a-z-]+)"/g)?.map((x) => x.slice(1, -1)).filter((x) => JOBS.includes(x)) || [];
  need(jobs.every((j) => inNesting.includes(j)), `nesting is missing ${jobs.filter((j) => !inNesting.includes(j)).join(', ')}`);
  need(s.hierarchy && jobs.filter((j) => s.hierarchy[j] === undefined && j !== 'media').length === 0, 'every text job needs a rank (media may have none)');
  need(Object.values(s.hierarchy || {}).every((r) => Number.isInteger(r) && r >= 1), 'ranks are whole numbers from 1');
  need(LEADS.includes(s.lead), `lead must be one of ${LEADS}`);
  need(s.colour && jobs.every((j) => ROLES.includes(s.colour[j])), `every job needs a colour role from ${ROLES}`);
  need(s.space && s.space.inside > 0 && s.space.between > 0 && s.space.inside < 20 && s.space.between < 20, 'space.inside and space.between are ratios to body size');
  need(s.container && GROUNDS.includes(s.container.ground) && EDGES.includes(s.container.edge) && SHAPES.includes(s.container.shape), 'container: ground, edge and shape from their lists');
  need(DENSITY.includes(s.density), `density must be one of ${DENSITY}`);
  need(s.fit && Array.isArray(s.fit.width) && s.fit.width.length === 2, 'fit.width is a [min, max] ratio to body size');
  if (s.move) {
    need(MOVES[s.move.type], `unknown move type "${s.move.type}"`);
    need(MOVES[s.move.type]?.every((a) => s.move.args?.[a] !== undefined), `move ${s.move.type} needs ${MOVES[s.move.type]}`);
    need(['organism', 'siblings'].includes(s.move.scope), 'move scope is organism or siblings');
    need(typeof s.move.words === 'string' && s.move.words.length > 10, 'a move needs its sentence');
    if (s.move.type === 'bind') need(jobs.includes(s.move.args.a) && jobs.includes(s.move.args.b), 'bind names jobs the specimen has');
  }
  need(s.kept && s.kept.why && ['owner', 'proposed'].includes(s.kept.by), 'kept needs a why and who (owner, or proposed until the owner confirms)');
  if (s.status === 'kept') need(s.kept?.by === 'owner', 'only the owner can keep a specimen');
  need(s.source && s.source.url && s.source.sidecar, 'source needs url and sidecar');
  const { source, ...grammar } = s;
  const abs = JSON.stringify(grammar).match(ABSOLUTE);
  need(!abs, `holds an absolute value ("${abs?.[0]}"); it belongs in the sidecar or a molecule`);
  if (errors.length) { failed++; console.log(`✗ ${s.id}\n  - ${errors.join('\n  - ')}`); }
  else console.log(`✓ ${s.id}  ${s.status}${s.kept.by === 'proposed' ? ' (reason proposed, owner to confirm)' : ''}`);
  specimens.push(s);
}

// Structure distance, 0 (same) to 1: the mean of five parts. Equal weights are a first guess (brief: Not known).
const jobsOf = (s) => s.jobs.map((j) => j.job);
const rowsOf = (s) => JSON.stringify(s.nesting).match(/"row"/g)?.length || 0;
const groupsOf = (s) => JSON.stringify(s.nesting).match(/"(group|list|row)"|"divider"/g)?.length || 0;
function distance(a, b) {
  const ja = jobsOf(a), jb = jobsOf(b), common = ja.filter((j) => jb.includes(j));
  const jobs = 1 - common.length / new Set([...ja, ...jb]).size;
  let pairs = 0, flips = 0;
  for (let i = 0; i < common.length; i++) for (let k = i + 1; k < common.length; k++) {
    pairs++; const [x, y] = [common[i], common[k]];
    if (Math.sign(a.order.indexOf(x) - a.order.indexOf(y)) !== Math.sign(b.order.indexOf(x) - b.order.indexOf(y))) flips++;
  }
  const order = pairs ? flips / pairs : 1;
  const ranked = common.filter((j) => a.hierarchy[j] && b.hierarchy[j]);
  const norm = (s, j) => (s.hierarchy[j] - 1) / Math.max(1, Math.max(...Object.values(s.hierarchy)) - 1);
  const ranks = ranked.length ? ranked.reduce((t, j) => t + Math.abs(norm(a, j) - norm(b, j)), 0) / ranked.length : 1;
  const space = Math.min(1, (Math.abs(Math.log(a.space.between / b.space.between)) + Math.abs(Math.log(a.space.inside / b.space.inside))) / 2);
  const shape = Math.min(1, (Math.abs(rowsOf(a) - rowsOf(b)) + Math.abs(groupsOf(a) - groupsOf(b)) / 2) / 2);
  return { all: (jobs + order + ranks + space + shape) / 5, jobs, order, ranks, space, shape };
}

console.log(`\nStructure distance (0 same, 1 unrelated): jobs · order · ranks · space · shape`);
const ids = specimens.map((s) => s.id), w = Math.max(...ids.map((i) => i.length));
console.log(''.padEnd(w + 2) + ids.map((i) => i.slice(0, 8).padStart(9)).join(''));
for (const a of specimens) console.log(a.id.padEnd(w + 2) + specimens.map((b) => (a === b ? '—' : distance(a, b).all.toFixed(2)).padStart(9)).join(''));
console.log('\nNearest neighbour of each, and what separates them:');
for (const a of specimens) {
  const [b, d] = specimens.filter((x) => x !== a).map((x) => [x, distance(a, x)]).sort((p, q) => p[1].all - q[1].all)[0];
  console.log(`  ${a.id.padEnd(w)} → ${b.id.padEnd(w)} ${d.all.toFixed(2)}  (jobs ${d.jobs.toFixed(2)}, order ${d.order.toFixed(2)}, ranks ${d.ranks.toFixed(2)}, space ${d.space.toFixed(2)}, shape ${d.shape.toFixed(2)})`);
}
if (failed) { console.log(`\n${failed} of ${specimens.length} failed`); process.exitCode = 1; }
