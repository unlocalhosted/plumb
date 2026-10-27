/* ─────────────────────────────────────────────────────────
 * CRAFT SPEC · React Plumber (browser and server)
 *
 * The standard the craft engine judges against, as data (docs/briefs/craft-spec.md). One module for the overlay
 * (served as src/craft-spec.js), the session server and the CLI, so every number a rule compares against lives here
 * and nowhere else.
 *
 *  PRINCIPLES   what we care about: a tier each (0 access … 4 advisory) and the rules that belong to it
 *  STANDARD     per principle, per rule: thresholds (when it fires) and wants (what a suggestion is built from), in
 *               one object; a rule's own tier only where its principle's would be wrong for it
 *  PRESETS      strict · balanced · relaxed: value sets merged over the standard before a project's own
 *  resolveSpec  standard → preset → dependency presets → project values → project rules, every leaf with its source
 *  specFor      the resolved entry for one rule id: { enabled, tier, ...values }
 *  validateCraft the config key, checked against the standard: unknown principle, rule or key, a wrong kind of value
 *
 * Nothing here reads the DOM or a file.
 * ───────────────────────────────────────────────────────── */

export const TIER_NAMES = ['access', 'legibility', 'theme', 'craft', 'advisory'];
export const tierNumber = (name) => (typeof name === 'number' ? name : TIER_NAMES.indexOf(name));

// what we care about, in priority order
export const PRINCIPLES = {
  access: { tier: 0, why: 'People must be able to read it and hit it, on every device. Never traded for looks.' },
  legibility: { tier: 1, why: 'Text that reads without effort: measure, leading, tracking, figures, line breaks, baselines, what is cut off.' },
  theme: { tier: 2, why: 'The project’s own decisions: its tokens are the allowed answers.' },
  rhythm: { tier: 3, why: 'Space says what belongs together.' },
  shape: { tier: 3, why: 'Corners and edges that agree with each other.' },
  depth: { tier: 3, why: 'Light comes from one place; elevation reads the same in light and dark.' },
  colour: { tier: 3, why: 'Colour is chosen, never faded into.' },
  hierarchy: { tier: 3, why: 'Two or three levels of anything; every extra one weakens the rest.' },
  alignment: { tier: 3, why: 'The eye lines up letters and weight, not boxes.' },
  motion: { tier: 3, why: 'Motion answers the hand, leaves quicker than it came, and never surprises.' },
  taste: { tier: 4, why: 'Judgements a person may disagree with: shown softly, never failing a run.' },
};

// the server's source habits (src/habits/index.ts): on, off and severity are theirs to tune here; they have no numbers
const HABITS = ['hover-gate', 'focus-outline', 'reduced-motion-fade', 'viewport-dynamic', 'safe-area-fallback', 'logical-inline', 'font-metrics', 'real-quotes',
  'transition-named', 'no-ease-in', 'composited-motion', 'tracking-em', 'color-scheme', 'overflow-clip', 'overscroll-contain'];
const H = (severity) => ({ habit: true, severity });

// The standard. Keys are rule short names (craft/<name>, or habits/<name> for a habit); values are the rule's numbers.
// `want` is what a suggestion is built from: a range with a target, in the rule's unit.
export const STANDARD = {
  access: {
    contrast: { small: 60, bold: 50, large: 45, largeAt: 24, boldLargeAt: 18, boldAt: 14, boldWeight: 600 }, // APCA Lc, and when text counts as large or bold
    'disabled-contrast': { min: 45 },
    'hit-target': { min: 24, long: 64 },
    'input-zoom': { min: 16 },
    'touch-manipulation': {},
    'hover-gate': H('error'), 'focus-outline': H('error'), 'reduced-motion-fade': H('warn'), 'viewport-dynamic': H('error'), 'safe-area-fallback': H('error'), 'logical-inline': H('error'),
  },
  legibility: {
    measure: { chars: 240, max: 90, want: { min: 45, max: 75, target: 65 } }, // characters a line
    leading: { large: 30, loose: 1.4, small: 18, tight: 1.3, want: { body: { min: 1.4, max: 1.6, target: 1.5 }, display: { min: 1.1, max: 1.3, target: 1.25 } } },
    tracking: { caps: 14, large: 36, want: { caps: { min: 0.05, max: 0.1, target: 0.06, unit: 'em' }, display: { min: -0.04, max: -0.01, target: -0.025, unit: 'em' } } },
    'tabular-nums': { rows: 3 },
    'heading-widow': { words: 3 },
    'text-wrap-role': { width: 300, uneven: 0.5, orphan: 0.15 },
    'baseline-align': { off: 1 },
    'truncate-intent': {}, 'middle-truncate': {}, 'bold-hover': {},
    'scrollbar-gutter': { width: 280, height: 200 },
    'anchor-offset': {},
    'scroll-cue': {},
    'skeleton-match': { height: 4 },
    'submenu-path': {},
    'font-metrics': H('warn'), 'real-quotes': H('warn'),
  },
  theme: {
    'transition-named': H('error'), 'no-ease-in': H('error'), 'composited-motion': H('warn'), 'tracking-em': H('warn'), 'color-scheme': H('warn'), 'overflow-clip': H('warn'), 'overscroll-contain': H('warn'),
  },
  rhythm: {
    'inner-outer-spacing': { min: 0.5 },
    'button-padding': { ratio: 1.5, maxHeight: 56, want: { ratio: 2 } }, // the sides take the top × want.ratio
    'icon-side': { min: 8, less: 2, want: { less: 4 } }, // the icon side gives want.less back (less when the padding is small)
    rhythm: { sample: 6, off: 2, majority: 0.6 },
    'content-align': { min: 4, siblings: 2 },
    'trim-leading': { leading: 3, share: 0.25 },
  },
  shape: {
    'concentric-radius': { tolerance: 1.5, minParentRadius: 4 },
    hairline: { minDpr: 2 },
    'border-on-shadow': { blur: 4, grey: 24 },
    'image-outline': { minSize: 20, sameGround: 0.12 },
    'content-size': { slack: 0.2 },
    'media-size': { min: 12, near: 12 },
  },
  depth: {
    'layered-shadow': { blur: 16 },
    'one-light': { blur: 2 },
    'tinted-shadow': { ground: 0.03, shadow: 0.01, alpha: 0.1 },
    'dark-elevation': { blur: 4, alpha: 0.05, lift: 0.03, ground: 0.3 },
  },
  colour: {
    'text-opacity': { within: 32 },
    'grey-levels': { sample: 20, minority: 0.1, within: 24 },
    'gradient-space': { saturation: 0.45, hue: 60 },
    'eased-scrim': { length: 80 },
    'pure-black-white': { share: 0.25, area: 200000, within: 40 },
  },
  hierarchy: {
    'weight-levels': { sample: 20, minority: 0.1 },
    'caps-case': {},
    'optical-sizing': {},
    'stroke-weight': { sample: 8, off: 0.4, big: 40, heavy: 3 },
    'hanging-quote': {},
  },
  alignment: {
    'icon-cap': { off: 1, icon: 32 },
    'optical-centre': { lean: 0.06, off: 1, icon: 32, sure: 1.4 },
    'half-pixel': { slack: 0.05 },
    'z-index-war': { above: 100 },
  },
  motion: {
    'scale-from-zero': {},
    'press-feedback': { idiom: 2, within: 100 },
    'exit-faster': { instant: 80, ratio: 0.8, measuredRatio: 0.9, want: { ratio: 0.7 } },
    interruptible: { tier: 'advisory' },
    'menu-pointerdown': {},
    'tooltip-delay': { want: { first: 500, skip: 300 } },
    'palette-motion': { enter: 100 },
    'spinner-timing': { flash: 200, slow: 1000, press: 150 },
  },
  taste: {
    'continuous-corners': { size: 160, radius: 16 },
    overshoot: { set: 3, over: 1.04 },
    'dark-weight': { weight: 500, size: 20, grey: 14, ink: 0.8, ground: 0.3 },
    overdrag: {},
  },
};

// Named value sets. `balanced` is the standard itself.
export const PRESETS = {
  balanced: { values: {}, rules: {} },
  strict: {
    values: {
      legibility: { measure: { max: 75, want: { max: 70 } }, leading: { loose: 1.35, tight: 1.4 } },
      access: { contrast: { small: 75, bold: 60, large: 60 }, 'hit-target': { min: 44 } },
    },
    rules: { 'craft/continuous-corners': { tier: 'craft' }, 'craft/overshoot': { tier: 'craft' }, 'craft/dark-weight': { tier: 'craft' }, 'craft/overdrag': { tier: 'craft' }, 'craft/interruptible': { tier: 'craft' } },
  },
  relaxed: {
    values: {
      legibility: { measure: { max: 100 } },
      access: { contrast: { small: 45, bold: 40, large: 35 }, 'hit-target': { min: 20 } },
    },
    rules: { 'craft/continuous-corners': false, 'craft/overshoot': false, 'craft/dark-weight': false, 'craft/overdrag': false, 'craft/hairline': false },
  },
};

export const TOKENS = { create: true, name: '{family}-{job}', file: null };

// ── the index: rule id ↔ principle ──────────────────────────

const isHabit = (short) => HABITS.includes(short);
export const ruleId = (short) => (isHabit(short) ? `habits/${short}` : `craft/${short}`);
const INDEX = new Map(); // id → { principle, short }
for (const [principle, rules] of Object.entries(STANDARD)) for (const short of Object.keys(rules)) INDEX.set(ruleId(short), { principle, short });
export const RULE_IDS = [...INDEX.keys()];
export const principleOf = (id) => INDEX.get(id)?.principle ?? null;

// ── merge, with provenance ──────────────────────────────────

const plain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// deep-merge `over` into `into`, recording each leaf's source at its dotted path
function merge(into, from, over, source, path = '') {
  for (const [k, v] of Object.entries(over ?? {})) {
    const at = path ? `${path}.${k}` : k;
    if (plain(v) && plain(into[k])) merge(into[k], from, v, source, at);
    else { into[k] = plain(v) ? structuredClone(v) : v; from[at] = source; if (plain(v)) for (const leaf of leaves(v, at)) from[leaf] = source; }
  }
}
function leaves(v, path) { return plain(v) ? Object.entries(v).flatMap(([k, x]) => leaves(x, `${path}.${k}`)) : [path]; }

/**
 * The spec in effect for a project.
 *   craft    the config's `craft` key (validated), or undefined
 *   layers   dependency presets' `craft` keys, in order, each { from, craft }
 * → { preset, principles: [{ id, tier, why, rules: [{ id, short, enabled, tier, habit, severity, values, from }] }], tokens, from }
 */
export function resolveSpec(craft = {}, layers = []) {
  const presetName = craft.preset ?? 'balanced';
  const preset = PRESETS[presetName] ?? PRESETS.balanced;
  const stack = [
    { from: 'standard', values: STANDARD, rules: {} },
    ...(presetName === 'balanced' ? [] : [{ from: `preset ${presetName}`, values: preset.values, rules: preset.rules }]),
    ...layers.map((l) => ({ from: l.from, values: l.craft?.values ?? {}, rules: l.craft?.rules ?? {} })),
    { from: 'config', values: craft.values ?? {}, rules: craft.rules ?? {} },
  ];
  const principles = [];
  for (const [pid, p] of Object.entries(PRINCIPLES)) {
    const rules = [];
    for (const short of Object.keys(STANDARD[pid])) {
      const id = ruleId(short), values = {}, from = {};
      let enabled = true, tier = STANDARD[pid][short].tier ?? TIER_NAMES[p.tier], severity = STANDARD[pid][short].severity ?? null;
      const habit = !!STANDARD[pid][short].habit;
      for (const layer of stack) {
        const v = layer.values?.[pid]?.[short];
        // the standard is the ground: only what sits over it is a source worth naming
        const noted = layer.from === 'standard' ? {} : from;
        if (v) {
          const { tier: t, habit: _h, severity: s, ...rest } = v;
          merge(values, noted, rest, layer.from);
          if (t !== undefined) { tier = t; noted.tier = layer.from; }
          if (s !== undefined) { severity = s; noted.severity = layer.from; }
        }
        const r = layer.rules?.[id];
        if (r === undefined) continue;
        if (r === false || r === true || r.enabled !== undefined) { enabled = r === true ? true : r === false ? false : r.enabled !== false; from.enabled = layer.from; }
        if (r && r.tier !== undefined) { tier = r.tier; from.tier = layer.from; }
        if (r && r.severity !== undefined) { severity = r.severity; from.severity = layer.from; }
      }
      rules.push({ id, short, enabled, tier: tierNumber(tier), tierName: typeof tier === 'number' ? TIER_NAMES[tier] : tier, habit, severity, values, from });
    }
    principles.push({ id: pid, tier: p.tier, why: p.why, rules });
  }
  const tokens = { ...TOKENS }, tokensFrom = {};
  for (const layer of [...layers.map((l) => ({ from: l.from, tokens: l.craft?.tokens })), { from: 'config', tokens: craft.tokens }]) {
    for (const [k, v] of Object.entries(layer.tokens ?? {})) { tokens[k] = v; tokensFrom[k] = layer.from; }
  }
  return { preset: presetName, principles, tokens, tokensFrom };
}

/** The resolved entry for one rule: { enabled, tier, tierName, severity, ...values }; null for a rule the spec doesn't know. */
export function specFor(resolved, id) {
  for (const p of resolved.principles) for (const r of p.rules) if (r.id === id) return { enabled: r.enabled, tier: r.tier, tierName: r.tierName, severity: r.severity, ...r.values };
  return null;
}

/** Every rule entry of a resolved spec, flat. */
export function specRules(resolved) { return resolved.principles.flatMap((p) => p.rules); }

// ── validation ─────────────────────────────────────────────

const close = (input, names) => {
  let best = null, score = Math.min(2, Math.floor(input.length / 3));
  for (const name of names) {
    let row = Array.from({ length: name.length + 1 }, (_, i) => i);
    for (let i = 1; i <= input.length; i++) { const next = [i]; for (let j = 1; j <= name.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (input[i - 1] === name[j - 1] ? 0 : 1)); row = next; }
    if (row[name.length] <= score && (best === null || row[name.length] < score)) { best = name; score = row[name.length]; }
  }
  return best;
};
const hint = (input, names) => { const m = close(input, names); return m ? ` Did you mean ${m}?` : ''; };

/** Problems with a config's `craft` key, as sentences; [] when it is sound. */
export function validateCraft(craft) {
  const problems = [];
  if (!plain(craft)) return ['Set craft to an object.'];
  for (const key of Object.keys(craft)) if (!['preset', 'values', 'rules', 'tokens'].includes(key)) problems.push(`Remove unknown key "craft.${key}"; allowed keys: preset, values, rules, tokens.`);
  if ('preset' in craft && !(typeof craft.preset === 'string' && craft.preset in PRESETS)) problems.push(`Set craft.preset to one of ${Object.keys(PRESETS).join(', ')}.`);
  if ('values' in craft) {
    if (!plain(craft.values)) problems.push('Set craft.values to an object of principles.');
    else for (const [pid, rules] of Object.entries(craft.values)) {
      if (!(pid in STANDARD)) { problems.push(`Remove unknown key "craft.values.${pid}"; principles: ${Object.keys(STANDARD).join(', ')}.${hint(pid, Object.keys(STANDARD))}`); continue; }
      if (!plain(rules)) { problems.push(`Set craft.values.${pid} to an object of rules.`); continue; }
      for (const [short, v] of Object.entries(rules)) {
        const std = STANDARD[pid][short];
        if (!std) {
          const elsewhere = [...INDEX].find(([, x]) => x.short === short)?.[1];
          problems.push(elsewhere ? `Move craft.values.${pid}.${short} to craft.values.${elsewhere.principle}.${short}.` : `Remove unknown key "craft.values.${pid}.${short}"; rules of ${pid}: ${Object.keys(STANDARD[pid]).join(', ')}.${hint(short, Object.keys(STANDARD[pid]))}`);
          continue;
        }
        if (!plain(v)) { problems.push(`Set craft.values.${pid}.${short} to an object.`); continue; }
        checkValues(v, std, `craft.values.${pid}.${short}`, problems);
      }
    }
  }
  if ('rules' in craft) {
    if (!plain(craft.rules)) problems.push('Set craft.rules to an object keyed by rule id.');
    else for (const [id, r] of Object.entries(craft.rules)) {
      if (!INDEX.has(id)) { problems.push(`Unknown rule "${id}" in craft.rules.${hint(id, RULE_IDS)}`); continue; }
      if (typeof r === 'boolean') continue;
      if (!plain(r)) { problems.push(`Set craft.rules["${id}"] to false, true or { enabled, tier, severity }.`); continue; }
      for (const key of Object.keys(r)) if (!['enabled', 'tier', 'severity'].includes(key)) problems.push(`Remove unknown key "craft.rules["${id}"].${key}"; allowed keys: enabled, tier, severity.`);
      if ('enabled' in r && typeof r.enabled !== 'boolean') problems.push(`Set craft.rules["${id}"].enabled to a boolean.`);
      if ('tier' in r && !TIER_NAMES.includes(r.tier)) problems.push(`Set craft.rules["${id}"].tier to one of ${TIER_NAMES.join(', ')}.`);
      if ('severity' in r && !['error', 'warn', 'info'].includes(r.severity)) problems.push(`Set craft.rules["${id}"].severity to error, warn or info.`);
      if ('severity' in r && !isHabit(INDEX.get(id).short)) problems.push(`craft.rules["${id}"] takes tier, not severity (severity is for habits/*).`);
    }
  }
  if ('tokens' in craft) {
    const t = craft.tokens;
    if (!plain(t)) problems.push('Set craft.tokens to an object.');
    else {
      for (const key of Object.keys(t)) if (!['create', 'name', 'file'].includes(key)) problems.push(`Remove unknown key "craft.tokens.${key}"; allowed keys: create, name, file.`);
      if ('create' in t && typeof t.create !== 'boolean') problems.push('Set craft.tokens.create to a boolean.');
      if ('name' in t && !(typeof t.name === 'string' && t.name.includes('{') || plain(t.name) && Object.values(t.name).every((x) => typeof x === 'string'))) problems.push('Set craft.tokens.name to a template like "{family}-{job}", or a map of family to template.');
      if ('file' in t && !(typeof t.file === 'string' && t.file.trim())) problems.push('Set craft.tokens.file to a stylesheet path.');
    }
  }
  return problems;
}
function checkValues(v, std, path, problems) {
  for (const [k, x] of Object.entries(v)) {
    if (k === 'tier') { if (!TIER_NAMES.includes(x)) problems.push(`Set ${path}.tier to one of ${TIER_NAMES.join(', ')}.`); continue; }
    if (k === 'severity') { if (!['error', 'warn', 'info'].includes(x)) problems.push(`Set ${path}.severity to error, warn or info.`); continue; }
    if (!(k in std) || k === 'habit') { problems.push(`Remove unknown key "${path}.${k}"; keys: ${Object.keys(std).filter((n) => n !== 'habit' && n !== 'severity').join(', ') || 'tier'}.${hint(k, Object.keys(std))}`); continue; }
    if (plain(std[k])) { if (!plain(x)) problems.push(`Set ${path}.${k} to an object.`); else checkValues(x, std[k], `${path}.${k}`, problems); }
    else if (typeof x !== typeof std[k] || (typeof x === 'number' && !Number.isFinite(x))) problems.push(`Set ${path}.${k} to a ${typeof std[k]}.`);
  }
}
