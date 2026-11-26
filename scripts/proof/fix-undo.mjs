// Proof that fixes break nothing and can be taken back (docs/briefs/new-check.md §6b), through the same commands an
// agent uses: `plumber craft` to read the page, `plumber apply` to take a fix, `plumber undo` to take it back.
//
// For every fix the page check offers, one at a time:
//   cleared     its own finding is gone after the fix
//   appeared    findings that were not there before it (any check, any rank)
//   lands       the element's computed style is what the fix said it sets
//   moved       boxes that changed outside the fixed element and its parents, and whether the page grew
//   twice       taking the same fix again changes nothing
//   undo        taken back straight away, the files are exactly as before and the same findings are back
//   same edit   taken again, it writes the same bytes as the first time
// Then, with every fix taken:
//   rest        how many fixes it took until none were left, and whether a fixed finding came back (two checks chasing)
//   oldest      taking back the oldest while newer ones sit on it: it goes back whole, or is refused and changes nothing
//   hand edit   after the file is edited by hand, undo is refused and writes nothing
//   all back    undone newest first, the files are exactly as they began and the findings are the starting set
//
//   node scripts/proof/fix-undo.mjs --page scripts/proof/pages/fixes.jsx [--rules craft/x,craft/y] [--max 12] [--json]
//
// A finding that appears after a fix is printed as raised by it. The run cannot yet tell a finding the fix caused
// from one that was already there, folded under the fixed finding because both own the same thing.
//
// Only a throwaway page for now: the run writes to source files, so it is not pointed at a real app's checkout.
// Not covered here: undo after the dev server restarts, undo past the end of history, and the page's own undo.
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { repo, servePage } from './serve.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
if (!value('page')) { console.error('Usage: node scripts/proof/fix-undo.mjs --page <App.jsx> [--rules <id,id>] [--max <n>] [--json]'); process.exit(2); }
const only = new Set((value('rules') ?? '').split(',').filter(Boolean));
const max = Number(value('max') ?? 12);

const { chromium } = await import('playwright');
const served = await servePage(value('page'));
const { root, url } = served;
const browser = await chromium.launch();

const cli = async (...a) => { const r = await promisify(execFile)('node', [join(repo, 'dist/cli.js'), ...a, '--root', root], { cwd: repo, timeout: 180000, maxBuffer: 1e8 }).catch((e) => e); return { ok: !(r instanceof Error), out: String(r.stdout ?? ''), err: String(r.stderr ?? '') }; };
const snapshot = async () => { const out = new Map(); for (const f of await readdir(join(root, 'src'), { recursive: true, withFileTypes: true })) if (f.isFile()) { const p = join(f.parentPath, f.name); out.set(p, await readFile(p, 'utf8')); } return out; };
const changed = (a, b) => [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).map((k) => k.slice(root.length + 1));

// the page as the check reads it: each finding by its check and its place in the page, and each fix that can be taken
const says = (f) => JSON.stringify({ title: f.title, suggest: f.suggest ?? null });
async function check() {
  const r = await cli('craft', '--url', url, '--json', '--no-probe', '--no-pairs');
  if (!r.out.trim().startsWith('{')) throw new Error(`The page check gave no report: ${r.err.slice(-600)}`);
  const report = JSON.parse(r.out), page = report.routes[0];
  if (!page.read) throw new Error('Nothing was read on the page, so nothing is proven.');
  const findings = new Map();
  for (const f of page.findings) { const base = `${f.rule} @ ${f.path ?? `${f.file}:${f.line}:${f.column}`}`; let k = base, n = 1; while (findings.has(k)) k = `${base} #${++n}`; findings.set(k, f); }
  const at = (f) => `${f.rule}|${f.line}|${f.column}`;
  const places = new Map([...findings].map(([k, f]) => [at(f), k]));
  const fixes = report.findings.filter((f) => f.apply && f.sites[0] && (!only.size || only.has(f.rule)))
    .map((f) => ({ key: f.apply.key, from: f.apply.from, to: f.apply.to, rule: f.rule, id: places.get(at({ rule: f.rule, ...f.sites[0] })) }))
    .filter((f) => f.id).map((f) => ({ ...f, record: findings.get(f.id) }));
  return { findings, fixes };
}

// every drawn box by its place in the page (the same key the engine uses), the page's size, and one element's styles
async function measure(path, props) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    return await page.evaluate(({ path, props }) => {
      const key = (el) => { const out = []; for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { let i = 1; for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === n.localName) i++; out.push(`${n.localName}:${i}`); } return out.reverse().join('>'); };
      const boxes = {};
      let style = null;
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('plumb-overlay') || el.localName === 'script' || el.localName === 'style') continue;
        const r = el.getBoundingClientRect(), k = key(el);
        boxes[k] = [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 2) / 2);
        if (k === path && props) { const s = getComputedStyle(el); style = Object.fromEntries(props.map((p) => [p, s[p]])); }
      }
      return { boxes, style, page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
    }, { path: path ?? null, props: props ?? null });
  } finally { await page.close(); }
}
const within = (k, path) => k === path || k.startsWith(`${path}>`);
function moved(a, b, path) {
  const out = { inside: 0, parents: [], others: [], gone: 0, new: 0, page: a.page.join('×') === b.page.join('×') ? null : `${a.page.join('×')} → ${b.page.join('×')}` };
  for (const [k, r] of Object.entries(a.boxes)) {
    const q = b.boxes[k];
    if (!q) { out.gone++; continue; }
    if (r.join() === q.join()) continue;
    if (path && within(k, path)) out.inside++;
    else if (path && within(path, k)) out.parents.push(k);
    else out.others.push(`${k}  ${r.join(',')} → ${q.join(',')}`);
  }
  for (const k of Object.keys(b.boxes)) if (!a.boxes[k]) out.new++;
  return out;
}
// a computed value against what the fix said it sets: a number is a length in px, a single word is compared as it is.
// A longer value (a gradient, a shorthand) comes back from the browser spelt another way, so it is not judged (null).
const landed = (style, sets) => Object.entries(sets).map(([p, want]) => ({ prop: p, want, got: style?.[p] ?? null,
  ok: !style ? false : typeof want === 'number' ? Math.abs(parseFloat(style[p]) - want) < 0.51 : /^[\w-]+$/.test(String(want)) ? String(style[p]) === String(want) : null }));

const result = { page: value('page'), steps: [], rest: null, oldest: null, handEdit: null, allBack: null, notCovered: ['undo after the dev server restarts', 'undo past the end of history', 'the page\'s own undo beside the command line\'s'] };
try {
  const start = await snapshot(), first = await check();
  let now = first, boxes = await measure();
  const applied = [], fixed = new Set(), skipped = new Set();
  while (result.steps.length < max) {
    const fix = now.fixes.find((f) => !skipped.has(f.id));
    if (!fix) break;
    const step = { finding: fix.id, edit: fix.from ? `${fix.from} → ${fix.to}` : `+${fix.to}` };
    result.steps.push(step);
    const before = await snapshot();
    const a1 = await cli('apply', fix.key);
    const id1 = a1.out.match(/plumber undo (\w+)/)?.[1];
    if (!a1.ok || !id1) { step.refused = (a1.err || a1.out).trim().split('\n')[0]; skipped.add(fix.id); continue; }
    const written = await snapshot();
    step.files = changed(before, written);
    // twice: the same fix taken again must change nothing
    const a2 = await cli('apply', fix.key);
    step.twice = changed(written, await snapshot()).length === 0;
    if (a2.ok) { const id = a2.out.match(/plumber undo (\w+)/)?.[1]; if (id) await cli('undo', id); }
    // undo straight away: the files and the findings as they were
    const u1 = await cli('undo', id1);
    const undone = await snapshot(), back = await check();
    step.undo = { ok: u1.ok, filesExact: changed(before, undone).length === 0, findingsBack: [...now.findings].every(([k, f]) => back.findings.has(k) && says(back.findings.get(k)) === says(f)) && back.findings.size === now.findings.size };
    // taken again: the same bytes as the first time
    const again = back.fixes.find((f) => f.id === fix.id);
    const a3 = again ? await cli('apply', again.key) : { ok: false, out: '' };
    const id3 = a3.out.match(/plumber undo (\w+)/)?.[1];
    step.sameEdit = a3.ok && changed(written, await snapshot()).length === 0;
    if (!a3.ok || !id3) { step.refused = 'could not be taken again after the undo'; skipped.add(fix.id); now = await check(); boxes = await measure(); continue; }
    applied.push({ id: id3, finding: fix.id, file: step.files[0] });
    // what the fix did to the page
    const after = await check(), sets = fix.record.suggest?.sets ?? null;
    const drawn = await measure(fix.record.path, sets ? Object.keys(sets) : null);
    step.cleared = !after.findings.has(fix.id);
    step.appeared = [...after.findings.keys()].filter((k) => !now.findings.has(k));
    step.chased = step.appeared.filter((k) => fixed.has(k));
    step.lands = sets ? landed(drawn.style, sets) : null;
    step.moved = moved(boxes, drawn, fix.record.path);
    fixed.add(fix.id);
    if (!step.cleared) skipped.add(fix.id);
    now = after; boxes = drawn;
  }
  result.rest = { fixesTaken: applied.length, left: now.fixes.filter((f) => !skipped.has(f.id)).length, stopped: result.steps.length >= max, findings: `${first.findings.size} → ${now.findings.size}` };

  // the oldest taken back while newer ones sit on it: whole, or refused with nothing written
  if (applied.length >= 2) {
    const before = await snapshot(), r = await cli('undo', applied[0].id), after = await snapshot();
    result.oldest = r.ok ? { outcome: 'taken back', files: changed(before, after) } : { outcome: 'refused', wroteNothing: changed(before, after).length === 0, said: (r.err || r.out).trim().split('\n')[0] };
    if (r.ok) applied.shift();
  }
  // a hand edit, then undo of the newest: refused, nothing written
  if (applied.length) {
    const last = applied.at(-1), path = join(root, last.file), text = await readFile(path, 'utf8');
    await writeFile(path, `${text}\n// edited by hand\n`);
    const before = await snapshot(), r = await cli('undo', last.id), after = await snapshot();
    result.handEdit = { refused: !r.ok, wroteNothing: changed(before, after).length === 0, said: (r.err || r.out).trim().split('\n')[0] };
    await writeFile(path, text);
  }
  // everything back, newest first
  const refusals = [];
  for (const a of applied.reverse()) { const r = await cli('undo', a.id); if (!r.ok) refusals.push(`${a.finding}: ${(r.err || r.out).trim().split('\n')[0]}`); }
  const end = await snapshot(), last = await check();
  result.allBack = { refusals, filesExact: changed(start, end).length === 0, differing: changed(start, end), findingsBack: last.findings.size === first.findings.size && [...first.findings].every(([k, f]) => last.findings.has(k) && says(last.findings.get(k)) === says(f)) };
} finally { await browser.close(); await served.close(); }

const bad = [];
for (const s of result.steps) {
  if (s.refused) { bad.push(`${s.finding}: ${s.refused}`); continue; }
  if (!s.cleared) bad.push(`${s.finding}: still found after its fix`);
  if (s.appeared.length) bad.push(`${s.finding}: its fix raised ${s.appeared.join(', ')}`);
  if (s.lands?.some((l) => l.ok === false)) bad.push(`${s.finding}: did not land (${s.lands.filter((l) => l.ok === false).map((l) => `${l.prop} is ${l.got}, wanted ${l.want}`).join('; ')})`);
  if (s.moved.others.length || s.moved.page) bad.push(`${s.finding}: moved ${s.moved.others.length} boxes outside itself${s.moved.page ? `, page ${s.moved.page}` : ''}`);
  if (!s.twice) bad.push(`${s.finding}: taking it twice changed the file again`);
  if (!s.undo.ok || !s.undo.filesExact || !s.undo.findingsBack) bad.push(`${s.finding}: undo straight away (${JSON.stringify(s.undo)})`);
  if (!s.sameEdit) bad.push(`${s.finding}: taken again, it wrote something else`);
}
if (result.rest?.left || result.rest?.stopped) bad.push(`did not come to rest: ${result.rest.left} fixes left`);
if (result.oldest?.outcome === 'refused' && !result.oldest.wroteNothing) bad.push('a refused undo of the oldest fix still wrote to a file');
if (result.handEdit && !(result.handEdit.refused && result.handEdit.wroteNothing)) bad.push(`undo after a hand edit: ${JSON.stringify(result.handEdit)}`);
if (result.allBack && !(result.allBack.filesExact && result.allBack.findingsBack && !result.allBack.refusals.length)) bad.push(`everything taken back: ${JSON.stringify(result.allBack)}`);
result.failed = bad;

if (flag('json')) console.log(JSON.stringify(result, null, 2));
else {
  const yes = (v) => (v ? 'yes' : 'NO');
  for (const s of result.steps) {
    console.log(`\n${s.finding}\n  ${s.edit}`);
    if (s.refused) { console.log(`  not taken: ${s.refused}`); continue; }
    console.log(`  cleared ${yes(s.cleared)} · raised ${s.appeared.length ? s.appeared.join(', ') : 'nothing'} · lands ${!s.lands ? 'not said by the fix' : s.lands.some((l) => l.ok === false) ? 'NO' : s.lands.every((l) => l.ok) ? 'yes' : 'not judged (a long value)'} · twice is once ${yes(s.twice)}`);
    console.log(`  moved: ${s.moved.inside} inside it, ${s.moved.parents.length} parents, ${s.moved.others.length} others${s.moved.page ? `, page ${s.moved.page}` : ''}${s.moved.gone || s.moved.new ? `, ${s.moved.gone} gone, ${s.moved.new} new` : ''}`);
    for (const o of s.moved.others.slice(0, 6)) console.log(`      ${o}`);
    console.log(`  undo straight away: files exact ${yes(s.undo.filesExact)}, findings back ${yes(s.undo.findingsBack)} · taken again writes the same ${yes(s.sameEdit)}`);
  }
  if (result.rest) console.log(`\nRest: ${result.rest.fixesTaken} fixes taken, ${result.rest.left} left${result.rest.stopped ? ' (stopped at the limit)' : ''}; findings ${result.rest.findings}`);
  if (result.oldest) console.log(`Oldest taken back under newer ones: ${result.oldest.outcome}${result.oldest.outcome === 'refused' ? `, wrote nothing ${yes(result.oldest.wroteNothing)} ("${result.oldest.said}")` : ` (${result.oldest.files.join(', ')})`}`);
  if (result.handEdit) console.log(`After a hand edit: refused ${yes(result.handEdit.refused)}, wrote nothing ${yes(result.handEdit.wroteNothing)}`);
  if (result.allBack) console.log(`Everything taken back: files exact ${yes(result.allBack.filesExact)}, findings as at the start ${yes(result.allBack.findingsBack)}${result.allBack.refusals.length ? `\n  refused: ${result.allBack.refusals.join('\n  ')}` : ''}`);
  console.log(`Not covered: ${result.notCovered.join('; ')}.`);
  console.log(bad.length ? `\n${bad.length} to look at:\n${bad.map((b) => `  ${b}`).join('\n')}` : '\nNothing to look at.');
}
process.exitCode = bad.length ? 1 : 0;
