/* ─────────────────────────────────────────────────────────
 * CRAFT RECOMMEND · React Plumber overlay
 *
 * One recommendation engine for every rule that suggests a value (docs/briefs/craft-spec.md §4). A rule says what the
 * element wants, in its own unit, as a range with a target; this module turns that and the project's theme into ranked
 * candidates and hands back the best, with the rest on it as `alternatives`:
 *
 *  a  a token of the theme       the project's own step (never a framework default) whose value lies in the range,
 *                                nearest the target; failing that the nearest step in the rule's direction (the verdict
 *                                proves it, or withdraws it)
 *  b  the app's own value        spacing on Tailwind's numeric scale when the theme names no steps (`px-5`); for other
 *                                families a value the page already uses in range feeds the new token's value
 *  c  a new token                { kind: 'token', family, name, value, file, hash, then: { from, to }, text, sets }:
 *                                valued from the range's target (or b), named in the theme's convention, put where the
 *                                server said tokens go; only when the policy allows it and the rule asked for it
 *  d  advice                     the numbers, in a sentence
 *
 * Every candidate says why it was chosen, in plain words. Nothing here reads the DOM.
 * ───────────────────────────────────────────────────────── */

const round = (n, step) => Math.round(n / step) * step;
const fmtPx = (n) => `${Math.round(n * 10) / 10}px`;
const fmtEm = (n) => `${Math.round(n * 1000) / 1000}em`;
const trim = (n) => String(Math.round(n * 1000) / 1000);

// how each family is measured, written and named
const FAMILIES = {
  spacing: { scale: 'spacing', unit: 'px', token: 'spacing', fmt: fmtPx, grain: 1, css: (v) => `${Math.round(v)}px` },
  radius: { scale: 'radius', unit: 'px', token: 'radius', fmt: fmtPx, grain: 1, css: (v) => `${Math.round(v)}px` },
  tracking: { scale: 'tracking', unit: 'em', token: 'tracking', fmt: fmtEm, grain: 0.005, css: (v) => `${trim(round(v, 0.005))}em` },
  leading: { scale: 'leading', unit: 'ratio', token: 'leading', fmt: (n) => trim(n), grain: 0.05, css: (v) => trim(round(v, 0.05)) },
  text: { scale: 'text', unit: 'px', token: 'text', fmt: fmtPx, grain: 1, css: (v) => `${Math.round(v)}px` },
  weight: { scale: 'weight', unit: 'n', token: 'font-weight', fmt: (n) => String(n), grain: 100, css: (v) => String(Math.round(v / 100) * 100) },
};

// a step's value in the family's unit: px for spacing and radius, em for tracking, a ratio at this font size for leading
function valueOf(step, family, of) {
  if (family === 'tracking') return step.em;
  if (family === 'leading') return step.unitless ? step.em : of ? step.px / of : step.em;
  if (family === 'weight') return step.n;
  return step.px;
}
const within = (v, want) => (want.min === undefined || v >= want.min - 1e-9) && (want.max === undefined || v <= want.max + 1e-9);
const range = (want, fmt) => want.min !== undefined && want.max !== undefined ? `${fmt(want.min)}–${fmt(want.max)}` : want.min !== undefined ? `at least ${fmt(want.min)}` : want.max !== undefined ? `at most ${fmt(want.max)}` : fmt(want.target);

// the name a new token takes: the policy's template, in the theme's own prefix for the family; `-2` when the name is taken
function nameFor(theme, F, job, value) {
  const policy = theme.tokens?.() ?? {};
  const tpl = (typeof policy.name === 'string' ? policy.name : policy.name?.[F.token]) ?? '{family}-{job}';
  const slug = String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  let short = tpl.replace('{family}', F.token).replace('{job}', job ?? slug).replace('{value}', slug).replace(/^--/, '');
  if (!short.startsWith(`${F.token}-`)) short = `${F.token}-${short}`;
  let name = `--${short}`;
  for (let i = 2; theme.has?.(name); i++) name = `--${short}-${i}`;
  return { name, short: name.slice(F.token.length + 3) };
}

/**
 * recommend({ family, prefix, job, want: { min, max, target, of }, from, sets, round, theme, facts, label, token, advice })
 *   family   spacing | radius | tracking | leading | text | weight
 *   prefix   the utility that sets it: px, gap, rounded, tracking, leading, text, font
 *   job      what the value is for, in a word (caps, display, body, control): names a new token
 *   want     the spec's range in the family's unit; `of` the font size in px when the unit is relative to it
 *   from     the class the suggestion replaces ('' to add one)
 *   sets     (value) → the style values a candidate sets on the page, for the verdict's trial
 *   round    'up' | 'down' | 'nearest': which step to take when none is in range
 *   label    the words for the range's reason ('small capitals need')
 *   token    false when a new token is not an answer for this rule (default true)
 *   advice   (target) → the sentence to say when nothing is safe
 *   exact    px of slack for a step to count as the value itself (spacing and radius; default 0.5)
 * → suggest, with `alternatives` (the other candidates, in rank order) and `why`
 */
export function recommend({ family, prefix, job, want, from = '', sets, round: dir = 'nearest', theme, label = '', token = true, advice, exact = 0.5 }) {
  const F = FAMILIES[family];
  if (!F) throw new Error(`recommend: unknown family ${family}`);
  const of = want.of;
  // a type step must be the project's own (the verdict refuses a framework name there); spacing and radius keep the scale as the theme has it
  const steps = (theme.scale(F.scale) ?? []).filter((s) => F.unit === 'px' || s.own !== false);
  const candidates = [];
  const setsOf = (v) => (sets ? sets(v) : undefined);
  const fitting = steps.map((s) => ({ s, v: valueOf(s, family, of) })).filter(({ v }) => Number.isFinite(v));
  const target = want.target;
  const reason = label ? `, in the ${range(want, F.fmt)} ${label}` : '';
  // a. a step in range, nearest the target (the direction breaks a tie); else the nearest step the rule's way
  const inRange = fitting.filter(({ v }) => within(v, want)).sort((a, b) => Math.abs(a.v - target) - Math.abs(b.v - target) || (dir === 'up' ? a.v - b.v : b.v - a.v));
  if (inRange.length) {
    const { s, v } = inRange[0];
    const same = Math.abs(v - target) <= (F.unit === 'px' ? exact : F.grain / 2);
    candidates.push({ kind: 'class', from, to: `${prefix}-${s.short}`, why: `${F.fmt(v)} (${s.short})${same ? '' : reason}`, sets: setsOf(v), rank: 'theme' });
  } else if (fitting.length && F.unit === 'px') {
    const pick = dir === 'down' ? fitting.filter(({ v }) => v <= target + 0.01).sort((a, b) => b.v - a.v)[0]
      : dir === 'up' ? fitting.filter(({ v }) => v >= target - 0.01).sort((a, b) => a.v - b.v)[0]
      : fitting.slice().sort((a, b) => Math.abs(a.v - target) - Math.abs(b.v - target))[0];
    if (pick) candidates.push({ kind: 'class', from, to: `${prefix}-${pick.s.short}`, why: `${F.fmt(pick.v)} (${pick.s.short}), your nearest step ${dir === 'down' ? 'under' : dir === 'up' ? 'over' : 'to'} ${F.fmt(target)}`, sets: setsOf(pick.v), rank: 'theme-near' });
  }
  // b. the numeric scale, when the theme names no steps of the family (spacing: `pl-5` means 5 × --spacing)
  if (!steps.length && family === 'spacing' && theme.unit?.()) {
    const n = target / theme.unit();
    if (Number.isFinite(n) && Math.abs(n - Math.round(n * 4) / 4) < 0.01) candidates.push({ kind: 'class', from, to: `${prefix}-${Math.round(n * 4) / 4}`, why: `${F.fmt(target)}, ${Math.round(n * 4) / 4} of your spacing unit`, sets: setsOf(target), rank: 'numeric' });
  }
  // c. a new token, where the policy allows one and the rule asked
  const policy = theme.tokens?.() ?? {};
  if (token && policy.create !== false && policy.file && !candidates.some((c) => c.rank === 'theme')) {
    const value = round(target, F.grain), css = F.css(value), { name, short } = nameFor(theme, F, job, css);
    candidates.push({ kind: 'token', family: F.token, name, value: css, file: policy.file, hash: policy.hash ?? null, shape: policy.shape ?? null,
      then: { from, to: `${prefix}-${short}` }, why: `${css}${reason}`, text: `Add ${name}: ${css} to your theme, then use ${prefix}-${short} here.`, sets: setsOf(value), rank: 'token' });
  }
  // d. advice
  candidates.push({ kind: 'advice', text: advice ? advice(target) : `Use ${F.fmt(target)}${reason}.`, rank: 'advice' });
  const [best, ...rest] = candidates;
  return { ...best, ...(rest.length ? { alternatives: rest.map(({ rank: _r, ...c }) => c) } : {}) };
}

/** A colour's one safe answer: the theme token nearest the rgb within a distance, else advice (a new colour is a design decision). */
export function recommendColour({ rgb, prefix, from = '', within: distance, theme, why, advice }) {
  const near = theme.nearestColor(rgb, distance);
  if (near) return { kind: 'class', from, to: `${prefix}-${near.short}`, why: why ?? `${near.short}, the colour it shows as`, rank: 'theme' };
  return { kind: 'advice', text: advice, rank: 'advice' };
}
