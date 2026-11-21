// Layer 4 of procedural style: the pairing solver. Each suggestion says what its states need, by role (the solid,
// a deeper shade for a flood, a quiet face, a glow); the solver picks every value for every state from the tools'
// candidates (layer 2's ramp, Leonardo's contrast steps, Material's state layer) and the shadow engine (layer 3),
// keeps only what passes the constraints, ranks the rest, and writes the reason beside each choice.
//   constraints  the words read (APCA's table, at the product's button size and weight); a state that must show it has
//                changed moves at least 0.08 in OKLCH lightness from the one before; every colour stays in the
//                brand's family (hue within 12°)
//   ranking      the product's own token first; then the candidate nearest the target the role asks for
//   node generator/style/solve.mjs [product] [light|dark]
//     → generator/style/<product>.<mode>.sets.json and generator/playground/atoms/native/sets/<product>.css
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, converter, formatHex, toGamut, differenceCiede2000, interpolate } from 'culori';
import { APCAcontrast, sRGBtoY, fontLookupAPCA } from 'apca-w3';
const here = fileURLToPath(new URL('./', import.meta.url));
const [product = 'craftingattention', mode = 'light'] = process.argv.slice(2);
const M = JSON.parse(await readFile(`${here}${product}.${mode}.json`, 'utf8'));
const E = JSON.parse(await readFile(`${here}${product}.${mode}.engine.json`, 'utf8'));
const oklch = converter('oklch'), rgb = converter('rgb'), gamut = toGamut('rgb', 'oklch'), de = differenceCiede2000();
const O = (c) => oklch(parse(c));
const Y = (c) => { const { r, g, b } = rgb(gamut(parse(c))); return sRGBtoY([r * 255, g * 255, b * 255]); };
const [size, weight] = E.buttonWords.split(/px\//).map(Number);
const reads = (ink, surface) => { const lc = APCAcontrast(Y(ink), Y(surface)), t = fontLookupAPCA(Math.abs(lc)), w = Math.min(9, Math.max(1, weight / 100)), lo = Math.floor(w), hi = Math.ceil(w);
  const need = t[lo] + (t[hi] - t[lo]) * (w - lo); return { lc: +Math.abs(lc).toFixed(1), needPx: +need.toFixed(1), margin: +(size - need).toFixed(1) }; };
const brand = O(E.brand.value);
// the words the product puts on its own atom, read off the shipped component
const shipInk = M.atom?.ink ?? M.pairs.find((p) => de(parse(p.surface), parse(E.ramp[8].value)) < 2)?.ink ?? '#fff';
const sameFamily = (c) => { const o = O(c); return o.c < 0.03 || Math.abs((((o.h ?? brand.h) - brand.h) + 540) % 360 - 180) <= 12; };

// candidates, each with where it came from
const step = (n) => ({ ...E.ramp[n - 1], from: `Radix step ${n} (${E.ramp[n - 1].job})` });
// the anchor is the atom's own fill as shipped. Radix places a strong brand at step 9 (a solid), but a pale one (algorecall's
// lichen slab) sits among the component steps 3 to 5; the states move along the ramp from wherever it sits: one step for
// pointed at, two for pressed (Radix's own 3 → 4 → 5), or 10 for both when it is the solid
const anchor = M.atom ? { value: formatHex(gamut(parse(M.atom.surface))), token: M.atom.surfaceToken ?? null, from: 'the product’s own atom, as shipped' } : step(9);
const K = E.ramp.reduce((b, r) => (de(parse(r.value), parse(anchor.value)) < de(parse(E.ramp[b - 1].value), parse(anchor.value)) ? r.step : b), 9);
const hoverStep = Math.min(12, K + 1), pressStep = K === 9 ? 10 : Math.min(12, K + 2);
const hoverD = Math.abs(O(E.ramp[hoverStep - 1].value).l - O(E.ramp[K - 1].value).l) || 0.04;
const leo = (r) => { const l = (E.leonardo ?? []).find((x) => x.ratioToPage === r); return l && { ...l, from: `Leonardo, ${r}:1 against the page` }; };
const pool = {
  solid: [anchor],
  // pointed at: Radix's hover step, and the same move turned away from the words (lighter under dark words, darker
  // under light ones), which keeps the words as readable as at rest
  'solid pointed at': [step(hoverStep), ...(() => { const s9 = O(anchor.value), inkL = O(shipInk).l;
    const d = hoverD, l = inkL < 0.5 ? s9.l + d : s9.l - d;
    return [{ value: formatHex(gamut({ ...s9, l })), from: `Radix’s hover step turned away from the words (${inkL < 0.5 ? 'lighter, under dark words' : 'darker, under light words'})` }]; })()],
  pressed: [{ ...E.states.pressed.fill, from: 'Material state layer, 10% of the ink over the solid' }, step(pressStep), ...(() => { const s9 = O(anchor.value), inkL = O(shipInk).l;
    const d = 1.5 * hoverD; return [{ value: formatHex(gamut({ ...s9, l: inkL < 0.5 ? s9.l + d : s9.l - d })), from: `the press, turned away from the words (${inkL < 0.5 ? 'lighter, under dark words' : 'darker, under light words'})` }]; })()],
  // a shade that floods over the solid: the ramp's own steps, Leonardo's, and shades on Radix's curve between steps 11
  // and 12 (the ramp jumps there), interpolated in OKLCH so they keep the family's chroma and hue
  deep: [step(11), step(12), leo(7), leo(4.5), step(10), step(9), step(8), ...[1 / 3, 1 / 2, 2 / 3].map((t) => ({ value: formatHex(gamut(interpolate([E.ramp[10].value, E.ramp[11].value], 'oklch')(t))), from: `on Radix’s curve, ${Math.round(t * 100)}% of the way from step 11 to step 12` })),
    // in dark mode the ramp runs the other way (steps 1 to 7 are the dark grounds): every step can be a flood, as long as it is deeper
    ...[7, 6, 5, 4, 3, 2, 1].map(step)].filter(Boolean),
  quiet: [step(3), step(4), step(5), step(2)],                                     // a face that sits back
  // light around an edge, and a band of light across the solid: the ramp's steps lighter than the solid (a glow is light,
  // so it must be lighter than what it glows around), the nearest first
  glow: [...E.ramp.filter((r) => r.step !== K && O(r.value).l > O(anchor.value).l + 0.08).sort((a, b) => O(a.value).l - O(b.value).l).map((r) => step(r.step)), { value: '#ffffff', from: 'white: the ramp has nothing lighter' }],
  // on a pale atom no step is 0.15 lighter: then the lightest step above it, and white past that
  light: (() => { const up = E.ramp.filter((r) => O(r.value).l > O(anchor.value).l + 0.15); const near = E.ramp.filter((r) => O(r.value).l > O(anchor.value).l + 0.03);
    return [...(up.length ? up : near).sort((a, b) => O(a.value).l - O(b.value).l).map((r) => step(r.step)), { value: '#ffffff', from: 'white: the ramp has nothing lighter' }]; })(),
};
// inks: the product's own (its pairs), then the ramp's text steps and its extremes
const inks = [...new Map([...M.pairs.map((p) => [p.ink, { value: p.ink, token: p.inkToken, from: `the product’s ink (${p.inkToken ?? p.ink})` }]),
  [E.ramp[11].value, { ...E.ramp[11], from: 'Radix step 12 (high-contrast words)' }], [E.ramp[0].value, { ...E.ramp[0], from: 'Radix step 1' }],
  [M.neutrals[0].value, { value: M.neutrals[0].value, token: M.neutrals[0].tokens[0], from: 'the product’s lightest neutral' }],
  [M.neutrals.at(-1).value, { value: M.neutrals.at(-1).value, token: M.neutrals.at(-1).tokens[0], from: 'the product’s darkest neutral' }]]).values()];
// the bar is the product's own: a derived state must read at least as well as the shipped button's words on its solid,
// never more than the product asks of itself (APCA's table is strict at 14px; holding new states to more than the
// shipped button drove the solver to the darkest step)
const shipped = M.atom ?? M.pairs.find((p) => O(p.surface) && Math.abs(O(p.surface).l - O(anchor.value).l) < 0.02 && O(p.surface).c > 0.08) ?? M.pairs.at(-1);
const BAR = Math.min(0, reads(shipped.ink, shipped.surface).margin);
// continuity: a state keeps the ink of the state before it while that ink still reads as well as the shipped button,
// so the words don't flip colour under the pointer
const inkFor = (surface, prefer) => {
  if (prefer) { const r = reads(prefer.value, surface); if (r.margin >= BAR) return { ...prefer, why: `the same words as the state before (${prefer.token ?? prefer.value}): APCA Lc ${r.lc}, as readable as the shipped button` }; }
  // a surface the product already pairs keeps the product's ink: that pairing is its decision
  const kept = M.pairs.find((p) => de(parse(p.surface), parse(surface)) < 2);
  if (kept) { const r = reads(kept.ink, surface); return { value: kept.ink, token: kept.inkToken, why: `the product’s own pairing (${kept.inkToken} on ${kept.surfaceToken}): APCA Lc ${r.lc}${r.margin < 0 ? `, ${-r.margin}px under APCA’s line at ${size}px/${weight}, as shipped` : ''}` }; }
  const r = inks.map((i) => ({ ...i, ...reads(i.value, surface) })).sort((a, b) => b.margin - a.margin);
  const own = r.find((x) => x.margin >= BAR && M.pairs.some((p) => p.ink === x.value)); // the product's own ink, if it reads as well as shipped
  const pick = own ?? r[0];
  return { value: pick.value, token: pick.token ?? null, why: `${pick.from}: APCA Lc ${pick.lc}, ${pick.margin >= 0 ? `reads at ${size}px/${weight}` : pick.margin >= BAR ? `as readable as the shipped button (${-pick.margin}px under APCA’s line)` : `${-pick.margin}px under APCA’s line, the best of ${r.length}`}` }; };
// pick a value for a role, against the state before it
// how far a role's value should sit from the state before it, in OKLCH lightness: a flood must read at a glance (the
// owner could not see a pour 0.06 darker; one 0.17 darker read), so it aims for 0.15
const TARGET = { deep: 0.15 };
const pick = (role, before, minStep = 0, keepInk = null) => {
  // Radix's own steps are the brand's family by construction (its ramp drifts in hue as it lightens, by design)
  const fam = pool[role].filter((c) => /^Radix step|^the product|^white/.test(c.from) || sameFamily(c.value));
  // a flood moves away from the words, so they keep reading as it pours (darker under light words, lighter under dark
  // ones); when the ramp has no room that way (a pale atom under dark words), it turns the other way and the words follow
  const away = (c) => (O(shipInk).l > O(before).l ? O(c.value).l < O(before).l : O(c.value).l > O(before).l);
  const far = (c) => !before || Math.abs(O(c.value).l - O(before).l) >= minStep;
  const cands = role !== 'deep' || !before ? fam : fam.filter(away).some(far) ? fam.filter(away) : fam.filter((c) => !away(c));
  const ok = cands.filter(far);
  // a glow or a band of light carries no words: it is ranked by source and family only, never by how words read on it
  const carriesWords = !['glow', 'light'].includes(role);
  const ranked = (ok.length ? ok : cands).map((c) => ({ c, read: carriesWords ? reads(inkFor(c.value).value, c.value) : { margin: 0 } }))
    .sort((a, b) => (keepInk ? (reads(keepInk, b.c.value).margin >= BAR) - (reads(keepInk, a.c.value).margin >= BAR) : 0)
      || ((b.read.margin >= BAR) - (a.read.margin >= BAR))
      || (TARGET[role] && before ? Math.abs(Math.abs(O(a.c.value).l - O(before).l) - TARGET[role]) - Math.abs(Math.abs(O(b.c.value).l - O(before).l) - TARGET[role]) : 0)
      || (!!b.c.token - !!a.c.token) || (pool[role].indexOf(a.c) - pool[role].indexOf(b.c)));
  if (!ranked.length) return null;
  const c = ranked[0].c;
  return { value: c.value, token: c.token ?? null, why: `${c.from}${c.token ? `, the product’s own ${c.token}` : ', derived'}${before && minStep ? `; ${Math.abs(O(c.value).l - O(before).l).toFixed(2)} lighter or darker than before` : ''}${ok.length ? '' : ' (nothing moved far enough; the nearest kept)'}` }; };
const shadowFor = (surface, height) => { const r = E.shadow.relation; const s = O(surface); if (!r.length) return 'none';
  return r.map((x) => `${x.x * height}px ${+(x.y * height).toFixed(1)}px ${x.blur}px ${x.spread}px ${formatHex(gamut({ mode: 'oklch', l: Math.min(0.99, Math.max(0, s.l + x.dl)), c: s.c * x.cShare, h: (s.h ?? 0) + x.dh }))}${x.alpha < 1 ? Math.round(x.alpha * 255).toString(16).padStart(2, '0') : ''}`).join(', '); };
let prev = null; // the ink of the state before, within one suggestion
const state = (fill, height, extra = {}) => ({ fill, ink: (prev = inkFor(fill.value, prev)), shadow: { value: shadowFor(fill.value, height), why: `${E.shadow.method}, at height ${+height.toFixed(2)}` }, ...extra });

// what each suggestion's states need
const solid = pick('solid');
const SUGGESTIONS = {
  pour: () => { const flood = pick('deep', solid.value, 0.12); return { rest: state(solid, 1), pointed: state(pick('solid pointed at', null, 0, shipInk), 1), pressed: state(flood, 1 / 3), done: state(flood, 1) }; },
  lead: () => ({ rest: state(solid, 1), pointed: state(pick('solid pointed at', null, 0, shipInk), 1), pressed: state(pick('pressed', null, 0, shipInk), 1 / 3), working: state(solid, 1) }),
  answer: () => ({ rest: state(solid, 1), pointed: state(pick('solid pointed at', null, 0, shipInk), 1), pressed: state(pick('pressed', null, 0, shipInk), 1 / 3), working: state(solid, 1, { line: { ...pick('light'), why: pick('light').why + '; the growing line along the lip' } }) }),
  sheen: () => ({ rest: state(solid, 1, { light: { ...pick('light'), why: pick('light').why + '; the band of light, at 35% so the words keep their contrast' } }), pointed: state(pick('solid pointed at', null, 0, shipInk), 1), pressed: state(pick('pressed', null, 0, shipInk), 1 / 3) }),
  beam: () => ({ rest: state(solid, 1), pressed: state(pick('pressed', null, 0, shipInk), 1 / 3), working: state(solid, 1, { glow: pick('glow') }) }),
  // chrome only reads on a dark ground: the face is the brand family's darkest ramp step that still clearly carries
  // the hue (chroma 0.08, or 60% of the ramp's strongest when the brand is paler), in either mode, so the button keeps its colour and the ring
  // has a ground
  metal: () => { const top = Math.max(...E.ramp.map((r) => O(r.value).c)); const f = E.ramp.filter((r) => O(r.value).c >= Math.min(0.08, top * 0.6) && O(r.value).l >= 0.18).sort((a, b) => O(a.value).l - O(b.value).l)[0];
    const face = { value: f.value, token: f.token ?? null, why: `Radix step ${f.step} (${f.job}) as a face: the brand’s darkest step that still clearly carries its hue, so chrome has a dark ground` };
    return { rest: state(face, 1), pressed: state(face, 1 / 3) }; },
};
const sets = Object.fromEntries(Object.entries(SUGGESTIONS).map(([k, f]) => { prev = null; return [k, f()]; }));
await writeFile(`${here}${product}.${mode}.sets.json`, JSON.stringify({ product, mode, buttonWords: E.buttonWords, sets }, null, 1));
// the sets as CSS variables, which the suggestions read (they hold no colour of their own)
const sel = `[data-product="${product}"][data-mode="${mode}"]`;
const lines = Object.entries(sets).flatMap(([k, st]) => [`${sel} [data-form="native/${k}"] {`, ...Object.entries(st).flatMap(([s, v]) => {
  const n = `--set-${s}`; return [`  ${n}-fill: ${v.fill.value};`, `  ${n}-ink: ${v.ink.value};`, `  ${n}-shadow: ${v.shadow.value};`, ...['line', 'light', 'glow'].filter((x) => v[x]).map((x) => `  ${n}-${x}: ${v[x].value};`)]; }), '}']);
await mkdir(fileURLToPath(new URL('../playground/atoms/native/sets/', import.meta.url)), { recursive: true });
const cssFile = fileURLToPath(new URL(`../playground/atoms/native/sets/${product}.${mode}.css`, import.meta.url));
await writeFile(cssFile, `/* generated by generator/style/solve.mjs: every colour, ink and shadow of every state of every suggestion, chosen by the\n   pairing solver from the product's own style model. The suggestions hold no colour of their own. */\n${lines.join('\n')}\n`);
console.log(`${product} (${mode}): ${Object.keys(sets).length} suggestions solved · ${Object.entries(sets).map(([k, st]) => `${k}: ${Object.entries(st).map(([s, v]) => `${s} ${v.fill.token ?? v.fill.value}/${v.ink.token ?? v.ink.value}`).join(', ')}`).join(' · ')}`);
