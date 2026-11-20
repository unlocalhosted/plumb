// The recipe schema, v1: every collected part as values a machine can compare and count, not prose. Each field has a
// fixed vocabulary or a unit. Fields read from source say where (`src`); fields measured in the browser come from the
// recorder (generator/data/record.mjs) and are filled into `measured`; judgement fields (the feel scales) carry who
// scored them, so a second rater can be added and compared.
//   node generator/data/schema.mjs   validates generator/data/recipes.json

export const ENUMS = {
  job: ['commit', 'copy', 'feedback', 'value', 'toggle', 'navigate'],
  driver: ['position', 'time-held', 'press', 'state', 'value', 'pointer-distance'],
  commitRule: ['press', 'threshold', 'held-time', 'confirm', 'countdown', 'none'],
  discoverable: ['obvious', 'needs-words', 'hidden'],          // a press is obvious; a slide or hold needs its words to say so
  state: ['rest', 'hover', 'pressed', 'dragging', 'holding', 'confirming', 'pending', 'done', 'error', 'resetting', 'undoing', 'changing'],
  colourNeed: ['none', 'deeper-shade', 'second-hue', 'danger', 'inverted-ground'],
  wordsDuringAction: ['kept', 'fade', 'flip-at-edge', 'replaced', 'roll'],
  input: ['touch', 'mouse', 'keyboard'],
};

// Feel, on fixed scales from −2 to 2. Each is a pair of opposite words, so a score says which way and how far.
export const FEEL = {
  playful_serious: ['playful', 'serious'],   // −2 playful … 2 serious
  calm_lively: ['calm', 'lively'],
  soft_exact: ['soft', 'exact'],
  quiet_showy: ['quiet', 'showy'],
  quick_ceremonial: ['quick', 'ceremonial'],
};

// The fields, with their kind. `one` is one value of an enum, `many` a list of them, `num` a number with a unit, `bool`
// yes or no, `scale` a feel score.
export const FIELDS = {
  id: 'string', lib: 'string', name: 'string', src: 'string',
  job: ['one', 'job'],
  driver: ['one', 'driver'],
  commitRule: ['one', 'commitRule'],
  effort: ['num', 'ordinal 0–3: 0 nothing to commit, 1 a press, 2 a press and a confirm or a short hold, 3 a drag or a long hold'],
  secondsToCommit: ['num', 'seconds of gesture before it commits, at its defaults (a press counts as 0.1)'],
  cancellable: 'bool', undo: 'bool',
  discoverable: ['one', 'discoverable'],
  states: ['many', 'state'],
  changesWidth: 'bool', secondCopyOfFace: 'bool',
  colourNeeds: ['many', 'colourNeed'],
  wordsDuringAction: ['one', 'wordsDuringAction'],
  inputs: ['many', 'input'],            // the inputs it can be used with (empty: it isn't operated, it shows a change)
  reducedMotion: 'bool', needsHover: 'bool',
  springs: 'springs', durationsMs: 'numbers',
  primitives: 'primitives',
  feel: 'feel',
  // measured (optional): per product and atom it was recorded on, from generator/data/record.mjs
};

export function validate(r, primitives) {
  const errors = [];
  for (const [k, kind] of Object.entries(FIELDS)) {
    const v = r[k];
    if (v === undefined) { errors.push(`${k} missing`); continue; }
    if (kind === 'string' && typeof v !== 'string') errors.push(`${k} not a string`);
    if (kind === 'bool' && typeof v !== 'boolean') errors.push(`${k} not yes/no`);
    if (Array.isArray(kind)) {
      const [form, of] = kind;
      if (form === 'one' && !ENUMS[of].includes(v)) errors.push(`${k}: “${v}” is not one of ${ENUMS[of].join(', ')}`);
      if (form === 'many' && (!Array.isArray(v) || v.some((x) => !ENUMS[of].includes(x)))) errors.push(`${k}: ${JSON.stringify(v)} has values outside ${ENUMS[of].join(', ')}`);
      if (form === 'num' && typeof v !== 'number') errors.push(`${k} not a number`);
    }
    if (kind === 'springs' && (!Array.isArray(v) || v.some((s) => !(s.use && ((s.k && s.c) || s.visualDuration != null))))) errors.push('springs: each needs a use and k, c (m) or visualDuration, bounce');
    if (kind === 'numbers' && (!Array.isArray(v) || v.some((x) => typeof x !== 'number'))) errors.push('durationsMs not numbers');
    if (kind === 'primitives' && (!Array.isArray(v) || v.some((p) => !primitives[p]))) errors.push(`primitives: unknown ${v.filter((p) => !primitives[p]).join(', ')}`);
    if (kind === 'feel') {
      if (!v.by) errors.push('feel.by missing: who scored it');
      for (const s of Object.keys(FEEL)) if (typeof v[s] !== 'number' || v[s] < -2 || v[s] > 2) errors.push(`feel.${s} must be −2…2`);
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFile } = await import('node:fs/promises');
  const { PRIMITIVES } = await import('../recipes.mjs');
  const data = JSON.parse(await readFile(new URL('./recipes.json', import.meta.url), 'utf8'));
  let bad = 0;
  for (const r of data) { const e = validate(r, PRIMITIVES); if (e.length) { bad++; console.log(`✗ ${r.id}\n  ${e.join('\n  ')}`); } }
  console.log(`${data.length - bad} of ${data.length} recipes valid`);
  process.exit(bad ? 1 : 0);
}
