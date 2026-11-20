// The extractor: a harvested part's source read into the recipe fields by program, each value with the line it was read
// from (`evidence`), so every field can be checked. What a program can't read (how it feels to a person) is estimated
// by plain rules from what it can read, and labelled `by: 'rules v1'`: a feature, never mixed up with a person's rating.
//   node generator/data/extract.mjs button   → generator/data/buttons.json and a summary
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { physics } from '../recipes.mjs';
const here = fileURLToPath(new URL('./', import.meta.url));
const atom = process.argv[2] ?? 'button';
const parts = JSON.parse(await readFile(`${here}../library/cache/harvest-${atom}.json`, 'utf8'));

// the first line where a pattern appears, trimmed, as evidence
const lineOf = (src, re) => { const m = re.exec(src); if (!m) return null; const s = src.lastIndexOf('\n', m.index) + 1, e = src.indexOf('\n', m.index); return src.slice(s, e < 0 ? undefined : e).trim().slice(0, 160); };
const has = (src, re) => re.test(src);

function extract(p, src) {
  const ev = {};
  const pick = (field, re) => { const l = lineOf(src, re); if (l) ev[field] = l; return !!l; };
  // ── motion: springs, durations, eases ──
  const springs = [];
  for (const m of src.matchAll(/stiffness\s*:\s*([\d.]+)[^}]{0,80}?damping\s*:\s*([\d.]+)(?:[^}]{0,60}?mass\s*:\s*([\d.]+))?/g)) springs.push({ k: +m[1], c: +m[2], m: m[3] ? +m[3] : 1 });
  for (const m of src.matchAll(/damping\s*:\s*([\d.]+)[^}]{0,80}?stiffness\s*:\s*([\d.]+)(?:[^}]{0,60}?mass\s*:\s*([\d.]+))?/g)) springs.push({ k: +m[2], c: +m[1], m: m[3] ? +m[3] : 1 });
  for (const m of src.matchAll(/(?:visualDuration|duration)\s*:\s*([\d.]+)\s*,\s*bounce\s*:\s*([\d.]+)/g)) springs.push({ visualDuration: +m[1], bounce: +m[2] });
  const springPhysics = springs.slice(0, 8).map((s) => ({ ...s, ...physics(s) }));
  const durations = [...src.matchAll(/\bduration\s*:\s*([\d.]+)/g)].map((m) => (+m[1] < 10 ? +m[1] * 1000 : +m[1]))
    .concat([...src.matchAll(/\bduration-(\d{2,4})\b/g)].map((m) => +m[1]), [...src.matchAll(/(\d{2,4})ms\b/g)].map((m) => +m[1])).filter((d) => d > 0 && d < 20000);
  const eases = [...new Set([...src.matchAll(/(?:ease|easing)\s*:\s*\[?\s*["']?([\w.\-, ]+?)["']?\s*\]?\s*[,}]/g)].map((m) => m[1].trim()).filter((e) => e.length < 40))].slice(0, 6);

  // ── what drives it ──
  const drag = pick('drag', /\bdrag=\{?["']?x|\bdrag\s*:\s*["']x|\bonPan(Start|End)?=|useDrag\(|\bonDrag(Start|End)?=\{|dragConstraints/);
  // following the pointer needs a move handler that reads its position (a click's position places a burst, it doesn't follow)
  const pointerFollow = /on(Mouse|Pointer)Move/.test(src) && pick('pointerFollow', /clientX\s*-\s*(rect|bounds|box|left)|useMouse|magnetic/i);
  const held = pick('held', /onPointerDown[\s\S]{0,400}(setInterval|requestAnimationFrame|animate\()|hold(ing)?Duration|holdTime|isHolding|long ?press/i);
  const stateful = pick('stateful', /["'](loading|pending)["']|isLoading|status\s*===|state\s*===\s*["'](success|done)|\bprogress\b\s*[=:]/);
  // ── how it commits ──
  const threshold = pick('threshold', /threshold|>\s*0\.\d+\s*\*|\bprogress\s*>=?\s*(1|0\.\d)/);
  const confirm = pick('confirm', /confirm(Label|ing)?\b[\s\S]{0,200}cancel|\b(set)?armed\b|\bisConfirming\b|\bsetConfirming\(|awaitingConfirm|\bconfirmLabel\b|click again to/i);
  const countdown = pick('countdown', /countdown/i);
  const driver = drag ? 'position' : held ? 'time-held' : stateful || confirm ? 'state' : pointerFollow ? 'pointer-distance' : 'press';
  // a drag that commits always does so past some line, said or not
  const commitRule = drag ? 'threshold' : held ? 'held-time' : countdown ? 'countdown' : confirm ? 'confirm' : 'press';
  // a hold's length, in ms or in seconds, from its default; unknown stays unknown (null), never a guess
  const toMs = (m) => (+m[1] < 20 ? +m[1] * 1000 : +m[1]);
  const holdNamed = [...src.matchAll(/\bhold\w*?(?:duration|time|ms|delay)\w*\s*[=:]\s*([\d.]+)/gi)].map(toMs).find((v) => v >= 300 && v <= 6000);
  const heldMs = held ? (holdNamed ?? [...src.matchAll(/\bduration\s*[=:]\s*([\d.]+)/gi)].map(toMs).find((v) => v >= 500 && v <= 6000) ?? null) : null;
  const effort = { press: 1, confirm: 2, countdown: 2, 'held-time': heldMs && heldMs < 800 ? 2 : 3, threshold: 3 }[commitRule];
  // ── states ──
  const states = ['rest'];
  if (pick('hover', /whileHover|hover:|:hover|onMouseEnter|onHoverStart|onPointerEnter/)) states.push('hover');
  if (pick('pressed', /whileTap|active:|:active|onPointerDown|onMouseDown/)) states.push('pressed');
  if (drag) states.push('dragging'); if (held) states.push('holding'); if (confirm) states.push('confirming');
  if (pick('pending', /loading|pending|spinner|isLoading/i)) states.push('pending');
  if (pick('done', /success|done|complete|copied|check(ed)?Icon|<Check\b/i)) states.push('done');
  if (pick('error', /["']error["']|isError|onError/)) states.push('error');
  // ── shape and words ──
  const changesWidth = pick('width', /\blayout\b(?!Id)|animate=\{\{[^}]*width|width:\s*["']?auto|layout=|useMeasure/);
  const secondCopyOfFace = pick('clip', /clip-?[pP]ath[^\n]*inset/) && /\{children\}[\s\S]*\{children\}|\{label\}[\s\S]*\{label\}/.test(src);
  const fades = /opacity[^\n]{0,60}(progress|\bx\b|useTransform)|useTransform\([^\n]{0,60}\)[^\n]{0,10}$|\w*opacity\s*=\s*useTransform/i.test(src);
  const words = has(src, /\.split\(["']{2}\)|split\(""\)|letters?\.map|chars?\.map/) ? 'roll' : fades && (drag || held) ? 'fade' : has(src, /(isLoading|loading|pending|status|state)[^\n]{0,40}\?\s*["'][^"'\n]*\b(invisible|opacity-0)\b/) ? 'replaced' : has(src, /AnimatePresence[\s\S]{0,600}(key=\{(label|text|state|status)|mode=)/) ? 'replaced' : has(src, /opacity[^\n]{0,60}(progress|x\b|useTransform)/) ? 'fade' : 'kept';
  // ── colour: what it needs, and what it hard-codes (each is a re-skin cost) ──
  const hard = [...new Set([...src.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+[^)]*\)|\b(?:bg|text|from|via|to|border|shadow|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g)].map((m) => m[0]))].slice(0, 12);
  const colourNeeds = [];
  if (pick('gradient', /gradient|conic|from-\w|hue-rotate/)) colourNeeds.push('second-hue');
  if (has(src, /destructive|danger/)) colourNeeds.push('danger');
  if (has(src, /primary\/\d0|darker|deep|-foreground/)) colourNeeds.push('deeper-shade');
  if (!colourNeeds.length) colourNeeds.push('none');
  // ── visual tricks ──
  const TRICKS = { shimmer: /\b(shimmer\w*|shin(e|y|ing)|sheen)\b|background-?[pP]osition/i, glow: /glow|blur-(?:md|lg|xl|2xl|3xl)|drop-shadow|box-?[sS]hadow[^\n]*\d{2}px/, ripple: /\bripples?\b/i, particles: /\b(particles?|confetti|sparkles?|stars?|fireworks?|emoji ?burst)\b/i,
    'gradient-border': /conic-gradient|border-beam|animated-border|mask-composite|bg-clip-padding/i, tilt: /perspective|rotateX|rotateY|preserve-3d/, blur: /filter[^\n]*blur|blur\(\d/, 'icon-morph': /pathLength|\bd\s*:\s*\[|\bicon-?morph|\bmorph(s|ing)? (into|to)\b/i,
    'text-scramble': /scramble|glitch/i, liquid: /\b(liquid|wavy|waves?|gooey|goo|metaball)\b/i, noise: /\b(noise|grain(y)?|dither(ed)?)\b/i };
  // the author's own words count: they often name the trick ("a shimmering label") where the code only draws it
  const said = `${p.title ?? ''} ${p.description ?? ''}`;
  const tricks = Object.entries(TRICKS).filter(([, re]) => re.test(src) || re.test(said)).map(([k]) => k);
  // ── care ──
  const reducedMotion = pick('reduced', /useReducedMotion|prefers-reduced-motion|motion-safe|motion-reduce/);
  const keyboard = pick('keyboard', /onKeyDown|onKeyUp|key\s*===\s*["'](Enter| )/);
  const needsHover = pointerFollow || (tricks.includes('tilt') && !has(src, /onPointerDown|whileTap/));
  const lib = has(src, /from ["'](motion|framer-motion)/) ? 'motion' : has(src, /from ["']gsap/) ? 'gsap' : has(src, /react-spring/) ? 'react-spring' : has(src, /@keyframes|animate-\[|animation:/) ? 'css' : 'none';

  // ── feel, estimated by rules from what was read (not a rating) ──
  const zeta = springPhysics.length ? Math.min(...springPhysics.map((s) => s.zeta)) : null;
  const longest = durations.length ? Math.max(...durations) : 0;
  const showy = Math.min(2, tricks.filter((t) => ['shimmer', 'glow', 'particles', 'gradient-border', 'tilt', 'liquid', 'text-scramble'].includes(t)).length * 0.7 + (hard.length > 4 ? 0.5 : 0) - 0.8);
  const feel = { by: 'rules v1 (estimated from the source, not a rating)',
    playful_serious: +Math.max(-2, Math.min(2, (zeta != null && zeta < 0.6 ? -1 : 0) - (tricks.includes('particles') || tricks.includes('liquid') ? 1 : 0) + (tricks.length === 0 ? 0.5 : 0) + (colourNeeds.includes('danger') ? 0.5 : 0))).toFixed(1),
    calm_lively: +Math.max(-2, Math.min(2, (zeta != null && zeta < 0.7 ? 1 : 0) + (tricks.length > 1 ? 0.5 : 0) + (needsHover ? 0.5 : 0) - (tricks.length === 0 ? 0.5 : 0))).toFixed(1),
    soft_exact: +Math.max(-2, Math.min(2, (zeta != null && zeta >= 0.95 ? 1 : 0) - (tricks.includes('blur') || tricks.includes('liquid') ? 1 : 0))).toFixed(1),
    quiet_showy: +Math.max(-2, Math.min(2, showy)).toFixed(1),
    quick_ceremonial: +Math.max(-2, Math.min(2, (effort - 1.5) + (longest > 800 ? 0.5 : 0))).toFixed(1) };

  // how it was found: its name says button, or only its description does (a card with a button in it, often)
  const named = /\b(button|btn|cta)\b/i.test(`${p.name} ${p.title}`.replace(/-/g, ' '));
  const rendersButton = /<button\b|role=["']button|<Button\b|<motion\.button/.test(src);
  // what the part is: the subject of its own description (its first clause), its name, and whether it renders a button.
  // button: it is one; group: several working as one (a toolbar, a segmented control, a dock); contains: something
  // else with a button in it (a field, a card, a panel, a menu); not: no button at all (an icon, an effect).
  const desc = `${p.description ?? ''}`.replace(/^\[[^\]]*\]\s*/, '');
  const subject = desc.split(/[,.:;—–]| (?:with|whose|that|which|where|for|built|showing|using|in|on|to) /i)[0].toLowerCase();
  const nameWords = `${p.name} ${p.title}`.replace(/[-_]/g, ' ').toLowerCase();
  // the deliberate commits are buttons whatever they're called: press-and-hold, hold to confirm, slide to unlock
  const COMMITS = /\b(hold|slide|swipe|press|tap)[- ](to|and[- ]hold|&[- ]hold)\b|\bhold[- ]to\b|\bconfirm(ation)?\b(?![- ]?(dialog|modal|sheet|popover))/;
  const GROUP = /\b(button ?group|toolbar|segmented|dock|split button|button set|buttons)\b/;
  const HOLDER = /\b(input|field|card|panel|menu|list|dialog|modal|form|bar|picker|editor|table|chart|badge|avatar|nav|navbar|sidebar|header|footer|section|page|hero|pricing|drawer|sheet|popover|tooltip|toast|carousel|slider|tabs?|icon)\b/;
  const isExample = /\b(an? )?example of\b|\bdemo\b|\bshowcase of\b/i.test(desc);
  const HOLDS_CONFIRM = /\b(dialog|modal|provider|hook|sheet|drawer|popover)\b/i.test(subject) || /\b(dialog|modal|provider)\b/.test(nameWords);
  const PROMPT = /\b(prompt|yes\/no|yes or no)\b/i.test(subject);
  const kind = isExample ? 'example' : HOLDS_CONFIRM ? (rendersButton ? 'contains' : 'not') : PROMPT ? 'group' : GROUP.test(nameWords) || GROUP.test(subject) ? 'group'
    : /\b(button|btn|cta)\b/.test(nameWords) || /\b(button|btn|cta|call to action)\b/.test(subject) || COMMITS.test(nameWords) || COMMITS.test(subject) ? 'button'
    : rendersButton && (HOLDER.test(subject) || /\bbutton\b/i.test(desc)) ? 'contains' : 'not';
  return { id: `${p.registry}/${p.name}`, kind: kind, found: named ? 'named' : 'described', rendersButton, itemType: p.type?.split(':')[1] ?? 'ui', registry: p.registry, name: p.title, description: p.description, homepage: p.homepage, rank: p.rank, lines: p.lines, animationLib: lib,
    job: 'commit', driver, commitRule, effort, secondsToCommit: commitRule === 'held-time' ? (heldMs ? heldMs / 1000 : null) : commitRule === 'threshold' ? 0.8 : commitRule === 'confirm' ? 0.6 : 0.1,
    cancellable: drag || held || confirm, undo: has(src, /\bundo\b/i), discoverable: drag || held ? 'needs-words' : 'obvious', states: [...new Set(states)], changesWidth, secondCopyOfFace,
    colourNeeds, hardcodedColours: hard, wordsDuringAction: words, tricks, reducedMotion, keyboard, needsHover,
    springs: springPhysics, durationsMs: [...new Set(durations)].slice(0, 10), eases, feel, evidence: ev };
}

// code only: comments say what a part means to do, and were read as if it did it
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
const out = []; let examples = 0, dupes = 0; const seen = new Map();
for (const p of parts) {
  // an example only imports its component: it is kept for rendering, not read as a part
  if (/example/.test(p.type ?? '')) { examples++; continue; }
  let item; try { item = JSON.parse(await readFile(`${here}../${p.file}`, 'utf8')); } catch { continue; }
  const src = code((item.files ?? []).map((f) => f.content ?? '').join('\n'));
  if (src.length < 80) continue;
  // the same source published twice (a registry that mirrors others) is one part, kept once, with where else it lives
  const key = src.replace(/\s+/g, ' ').trim();
  const twin = seen.get(key); if (twin) { (twin.alsoAt ??= []).push(`${p.registry}/${p.name}`); dupes++; continue; }
  const r = extract(p, src); seen.set(key, r); out.push(r);
}
await writeFile(`${here}${atom}s.json`, JSON.stringify(out, null, 1));
const count = (f) => { const c = {}; for (const r of out) for (const v of [].concat(f(r))) c[v] = (c[v] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '); };
console.log(`${examples} examples set aside for rendering; ${dupes} duplicates of another registry's part folded in`);
console.log(`${out.length} ${atom}s from ${new Set(out.map((r) => r.registry)).size} registries → data/${atom}s.json`);
console.log(`kind        ${count((r) => r.kind)} · found ${count((r) => r.found)}`);
console.log(`driver      ${count((r) => r.driver)}`);
console.log(`commit      ${count((r) => r.commitRule)}`);
console.log(`library     ${count((r) => r.animationLib)}`);
console.log(`tricks      ${count((r) => r.tricks.length ? r.tricks : 'none')}`);
console.log(`words       ${count((r) => r.wordsDuringAction)}`);
console.log(`springs     ${out.filter((r) => r.springs.length).length} parts state springs; bounce: ${count((r) => r.springs.map((s) => (s.zeta < 0.6 ? 'bouncy' : s.zeta < 0.97 ? 'firm' : 'no bounce')))}`);
console.log(`care        reduced motion ${out.filter((r) => r.reducedMotion).length} · keyboard ${out.filter((r) => r.keyboard).length} · hard-coded colours ${out.filter((r) => r.hardcodedColours.length).length}`);
