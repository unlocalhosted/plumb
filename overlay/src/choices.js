/* ─────────────────────────────────────────────────────────
 * CHOICES · Plumb overlay
 *
 * One form per family for choosing a token, drawn the same wherever a choice is made: in the reading card and in the
 * blueprint's chooser at a mark. The steps that fit are the controls; pointing previews, clicking picks.
 *
 *  ladder    spacing, radius, type: the theme's whole scale in order, a window of seven around yours, the fitting
 *            steps live and the rest quiet, yours as a dashed notch between the steps where its value falls
 *  swatches  colour and shadow have no line to sit on: yours first, then each fitting token's chip
 *  ruler     everything else numeric: the steps as ticks on a rail, yours as a mark between them
 *  why-line  under every form, the pointed-at step's reason, else the picked one's, else the ask; holds its height
 * ───────────────────────────────────────────────────────── */

export const TILED = ['radius', 'spacing', 'type'];
export const VALUED = ['spacing', 'radius', 'type', 'color', 'shadow', 'z', 'motion'];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const code = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

// A CSS length in px, so values written in different units sit on one ruler: rem from the root, em from the element.
export const toPx = (value, el) => {
  const m = String(value ?? '').trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (m[2] === 'rem') return n * parseFloat(getComputedStyle(document.documentElement).fontSize);
  if (m[2] === 'em') return n * parseFloat(getComputedStyle(el ?? document.documentElement).fontSize);
  return n;
};
export const fmtPx = n => `${Math.round(n * 100) / 100}px`;

// One line under the form: the reason of the step being pointed at, else the picked one, else nothing (the CSS asks).
export function whyLine(m, j = m.pick) {
  const c = j !== null && j !== undefined ? m.choices[j] : null;
  if (c) return `<b>${esc(c.edit?.to ?? c.label)}</b> · ${esc(c.why || 'from your scale')}`;
  return '';
}

// When no token fits: what to do instead, in the engine's words.
export function noChoice(m) {
  const say = VALUED.includes(m.glyph) ? 'Add a token to your theme with a reason, or accept this value in the ledger with one.' : code(m.action ?? '');
  return `<div class="note">${say}${m.accept ? `<br><code>${esc(m.accept)}</code>` : ''}</div>`;
}

// The form for a mark's choices. el: the element (for em and the shadow plate's ground); scale(family) → the theme's
// steps [{ short, px }] for the ladder, [] while unknown.
export function choicesHtml(m, { el, scale }) {
  if (!m.choices.length) return noChoice(m);
  const name = c => esc(c.edit?.to ?? c.label);
  const reason = c => c.why ? `<span class="sr"> ${esc(c.why)}</span>` : '';
  const yours = toPx(m.value, el), px = m.choices.map(c => toPx(c.value, el));
  const linear = yours !== undefined && px.every(v => v !== undefined) && m.glyph !== 'color' && m.glyph !== 'shadow';
  if (linear && TILED.includes(m.glyph)) return ladder(m, yours, px, scale);
  if (!linear) {
    const fill = m.glyph === 'shadow' ? getComputedStyle(el).backgroundColor : null;
    const sw = v => m.glyph === 'shadow' ? `<span class="sw plate" style="background:${esc(fill)};box-shadow:${esc(v)}"></span>` : m.glyph === 'color' ? `<span class="sw" style="background:${esc(v)}"></span>` : '';
    return `<div class="cmp swatches" role="group" aria-label="Tokens that fit">
      <span class="you" title="yours">${sw(m.value)}yours</span>
      ${m.choices.map((c, j) => `<button class="opt" data-pick="${j}" aria-pressed="${j === m.pick}" title="${esc(c.why ?? '')}">${sw(c.value)}<b>${name(c)}</b>${reason(c)}</button>`).join('')}
    </div><div class="why-line">${whyLine(m)}</div>`;
  }
  // Lay the steps and yours on one line, in px, with room at both ends.
  const vals = [yours, ...px], lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const at = v => 10 + ((v - lo) / span) * 80; // percent across the ruler
  const order = m.choices.map((c, j) => ({ ...c, j, px: px[j] })).sort((a, b) => a.px - b.px);
  // Steps never sit closer than a label's width: spread them in order, keeping the ends inside the ruler.
  const GAP = 22;
  order.forEach((c, k) => { c.x = Math.max(at(c.px), k ? order[k - 1].x + GAP : 4); });
  for (let k = order.length - 1; k >= 0; k--) order[k].x = Math.min(order[k].x, k < order.length - 1 ? order[k + 1].x - GAP : 96);
  // Yours sits where its value falls between the (spread) steps around it.
  const below = [...order].reverse().find(c => c.px <= yours), above = order.find(c => c.px >= yours);
  const yx = below && above && below !== above ? below.x + ((yours - below.px) / (above.px - below.px || 1)) * (above.x - below.x)
    : below && !above ? Math.min(96, below.x + GAP * 0.8) : above && !below ? Math.max(4, above.x - GAP * 0.8) : (below ?? above).x;
  // The gap between yours and the step the eye should weigh: the picked one, else the nearest.
  const near = m.pick !== null ? order.find(c => c.j === m.pick) : order.reduce((a, c) => Math.abs(c.px - yours) < Math.abs(a.px - yours) ? c : a);
  const g0 = Math.min(yx, near.x), g1 = Math.max(yx, near.x);
  return `<div class="cmp scale" role="group" aria-label="Steps that fit, and yours">
      <span class="rail"></span><span class="gap" style="left:${g0}%;width:${g1 - g0}%"></span>
      ${order.map((c, k) => `<button class="opt" data-pick="${c.j}" aria-pressed="${c.j === m.pick}" style="left:${c.x}%" title="${esc(c.why ?? '')} (${esc(c.value)})"><span class="tk"></span><b>${name(c)}</b><span class="v">${fmtPx(c.px)}</span>${reason(c)}<kbd aria-hidden="true">${k + 1}</kbd></button>`).join('')}
      <span class="you ${m.soft ? 'soft' : ''}" style="left:${yx}%"><em>${fmtPx(yours)}</em><i></i></span>
    </div><div class="why-line">${whyLine(m)}</div>`;
}

// Choices on the ladder: the theme's whole scale for this family as one strip, in order. The steps that fit here are
// live; the rest are drawn but quiet, so you see where you are in the system. Yours is a dashed line set between the
// steps where its value falls. Each step draws itself the way the family is seen (a corner at its radius, a space at
// its width, "Ag" at its size); 1–9 pick the live steps in order.
function ladder(m, yours, px, scale) {
  const family = { radius: 'radius', spacing: 'spacing', type: 'type' }[m.glyph];
  const live = m.choices.map((c, j) => ({ j, px: px[j], short: (c.edit?.to ?? c.label).replace(/^[a-z]+-/, '') || c.label }));
  const steps = [...live];
  for (const t of scale?.(family) ?? []) if (!steps.some(s => Math.abs(s.px - t.px) < 0.01)) steps.push({ j: null, px: t.px, short: t.short });
  steps.sort((a, b) => a.px - b.px);
  // a window of seven around yours, so a long scale stays a glance
  const after = steps.findIndex(s => s.px > yours), at = after < 0 ? steps.length : after;
  let lo = Math.max(0, at - 3); const hi = Math.min(steps.length, lo + 7); lo = Math.max(0, hi - 7);
  const win = steps.slice(lo, hi), n = win.length;
  const glyph = v => m.glyph === 'radius' ? `<span class="lg-corner" style="border-top-right-radius:${Math.min(11, v)}px"></span>`
    : m.glyph === 'type' ? `<span class="lg-ag" style="font-size:${Math.min(24, Math.max(9, v))}px">Ag</span>`
    : `<span class="lg-gap" style="gap:${Math.min(18, v)}px"><i></i><i></i></span>`;
  let key = 0;
  const cells = win.map(s => s.j === null
    ? `<span class="rung off" title="On your scale, not a fit here">${glyph(s.px)}<small>${esc(s.short)}</small><small class="px">${s.px >= 999 ? 'pill' : fmtPx(s.px)}</small></span>`
    : `<button class="opt rung" data-pick="${s.j}" aria-pressed="${s.j === m.pick}" aria-label="${esc(m.choices[s.j].edit?.to ?? m.choices[s.j].label)}, ${fmtPx(s.px)}"><kbd aria-hidden="true">${++key}</kbd>${glyph(s.px)}<small>${esc(s.short)}</small><small class="px">${fmtPx(s.px)}</small></button>`).join('');
  // yours, between the centres of the steps around it
  const k = win.findIndex(s => s.px > yours), a = k <= 0 ? null : win[k - 1], b = k < 0 ? null : win[k];
  const pos = !a ? (k === 0 ? 0 : n) : !b ? n : (k - 1) + 0.5 + (yours - a.px) / (b.px - a.px || 1);
  return `<div class="cmp ladder" role="group" aria-label="Your scale, with yours between its steps" style="--n:${n}">${cells}
      <span class="lnotch ${m.soft ? 'soft' : ''}" style="left:${(pos / n) * 100}%"><em>${fmtPx(yours)}</em></span></div>
    <div class="why-line">${whyLine(m)}</div>`;
}

// Wire a rendered form: click picks, pointing previews (and names the reason), leaving puts the page back.
export function bindChoices(root, m, { pick, peek, unpeek }) {
  const line = root.querySelector('.why-line');
  root.querySelectorAll('[data-pick]').forEach(b => {
    const j = Number(b.dataset.pick);
    b.addEventListener('click', e => { e.stopPropagation(); pick(j); });
    b.addEventListener('pointerenter', () => { peek?.(j); if (line) line.innerHTML = whyLine(m, j); });
    b.addEventListener('pointerleave', () => { unpeek?.(); if (line) line.innerHTML = whyLine(m); });
    b.addEventListener('focus', () => { if (line) line.innerHTML = whyLine(m, j); });
  });
}

export const CHOICES_CSS = `
  /* the ruler: the steps that fit as ticks, yours as a mark between them. A tick is the control: point at it to see it
     on the page, click to pick it. Distance on the ruler is distance in value. */
  .scale { position: relative; height: 58px; margin: 2px 6px 0; }
  .scale .rail { position: absolute; inset-inline: 0; top: 22px; height: 1px; background: var(--pl-ink-3); }
  .opt { all: unset; position: absolute; top: 0; height: 58px; width: 56px; margin-inline-start: -28px; display: flex; flex-direction: column; align-items: center; cursor: pointer; border-radius: 6px; }
  .opt .tk { width: 1px; height: 14px; margin-top: 15px; background: var(--pl-ink-2); transition: height var(--pl-dur-feedback), background var(--pl-dur-feedback), width var(--pl-dur-feedback); }
  .opt b { margin-top: 4px; font: var(--pl-card-code); font-size: 11.5px; line-height: 14px; font-weight: 600; color: var(--pl-ink); white-space: nowrap; }
  .opt .v { font: var(--pl-text-label); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; white-space: nowrap; }
  @media (hover: hover) and (pointer: fine) { .opt:hover .tk { height: 18px; margin-top: 11px; background: var(--pl-instrument); } .opt:hover b { color: var(--pl-instrument); } }
  .opt[aria-pressed="true"] .tk { width: 3px; height: 22px; margin-top: 11px; border-radius: 1px; background: var(--pl-instrument); }
  .opt[aria-pressed="true"] b { color: var(--pl-instrument); }
  .opt[aria-pressed="true"]::before { content: ""; position: absolute; top: 4px; width: 7px; height: 7px; border-radius: 50%; background: var(--pl-instrument); }
  .opt:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -2px; }
  .opt .sr, .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .scale .you { position: absolute; top: 0; display: flex; flex-direction: column; align-items: center; transform: translateX(-50%); pointer-events: none; }
  .scale .you em { font: var(--pl-text-label); font-style: normal; color: var(--pl-off); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .scale .you i { width: 0; height: 0; margin-top: 1px; border-inline: 4px solid transparent; border-top: 6px solid var(--pl-off); }
  .scale .you.soft em { color: var(--pl-soft); } .scale .you.soft i { border-top-color: var(--pl-soft); }
  .scale .gap { position: absolute; top: 21px; height: 3px; background: color-mix(in oklab, var(--pl-off) 35%, transparent); border-radius: 2px; }
  .scale .opt kbd { font: 500 9px/11px var(--pl-sans); color: var(--pl-ink-3); opacity: 0; transition: opacity var(--pl-dur-feedback); }
  @media (hover: hover) and (pointer: fine) { .scale:hover .opt kbd { opacity: 1; } }
  /* the ladder: the theme's scale in order, the fitting steps live, yours notched between */
  .ladder { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); margin-top: 12px; border-radius: 7px; box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .rung { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; min-width: 0; height: 52px; padding-bottom: 5px; }
  .rung + .rung { box-shadow: -1px 0 0 var(--pl-rule); }
  .rung.off { opacity: .38; }
  .ladder .opt { all: unset; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; min-width: 0; height: 52px; padding-bottom: 5px;
                 cursor: pointer; transition: background var(--pl-dur-feedback) var(--pl-ease-out); }
  .ladder .rung + .opt, .ladder .opt + .rung { box-shadow: -1px 0 0 var(--pl-rule); }
  .ladder .opt::after { content: ""; position: absolute; inset-inline: 6px; bottom: 0; height: 2px; border-radius: 1px; background: var(--pl-instrument); opacity: .35; }
  @media (hover: hover) and (pointer: fine) { .ladder .opt:hover { background: var(--pl-paper-2); } .ladder .opt:hover::after { opacity: .7; } }
  .ladder .opt[aria-pressed="true"] { background: color-mix(in oklab, var(--pl-instrument) 12%, var(--pl-paper)); }
  .ladder .opt[aria-pressed="true"]::after { opacity: 1; height: 3px; }
  .ladder .opt:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: -2px; border-radius: 6px; }
  .rung small { font: 600 10.5px/13px var(--pl-mono); color: var(--pl-ink); white-space: nowrap; }
  .rung small.px { font: 400 10px/12px var(--pl-mono); color: var(--pl-ink-2); }
  .ladder .opt[aria-pressed="true"] small { color: var(--pl-instrument); }
  .ladder kbd { position: absolute; top: 3px; right: 4px; font: 500 9.5px/11px var(--pl-mono); color: var(--pl-ink-2); opacity: .6; }
  .lg-corner { width: 15px; height: 12px; margin-bottom: 3px; box-sizing: border-box; border-top: 1.5px solid var(--pl-ink-2); border-right: 1.5px solid var(--pl-ink-2); }
  .lg-gap { display: flex; margin-bottom: 3px; } .lg-gap i { width: 3px; height: 13px; border-radius: 1px; background: var(--pl-ink-2); }
  .lg-ag { font-family: var(--pl-sans); font-weight: 500; line-height: 1; color: var(--pl-ink); margin-bottom: 2px; }
  .ladder .opt .lg-corner { border-color: var(--pl-ink); } .ladder .opt .lg-gap i { background: var(--pl-ink); }
  .ladder .opt[aria-pressed="true"] .lg-corner { border-color: var(--pl-instrument); } .ladder .opt[aria-pressed="true"] .lg-gap i { background: var(--pl-instrument); } .ladder .opt[aria-pressed="true"] .lg-ag { color: var(--pl-instrument); }
  .lnotch { position: absolute; z-index: 1; top: -7px; bottom: -3px; width: 0; border-left: 2px dashed var(--pl-off); translate: -1px 0; pointer-events: none; }
  .lnotch em { position: absolute; top: -8px; left: 0; translate: -50% 0; padding: 0 3px; border-radius: 3px; font: 600 10px/13px var(--pl-mono); font-style: normal; color: #fff; background: var(--pl-off); white-space: nowrap; }
  .lnotch.soft { border-color: var(--pl-soft); } .lnotch.soft em { background: var(--pl-soft); }
  .why-line { font: 400 12px/17px var(--pl-sans); color: var(--pl-ink-2); }
  .why-line:empty { display: none; }
  /* under the ladder the line always holds its place: a reason appearing on hover must never resize the card (the
     card would move, the step would slip from under the pointer, and the reading would shake) */
  .ladder + .why-line { min-height: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ladder + .why-line:empty { display: block; }
  .ladder + .why-line:empty::before { content: "Point at a step to see why it is on your scale"; color: var(--pl-ink-2); opacity: .75; }
  .why-line b { font: var(--pl-card-meta); font-weight: 600; color: var(--pl-ink); }
  /* colours and shadows have no line to sit on: a strip of swatches, yours among them */
  .swatches { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .swatches .opt { position: relative; top: auto; height: auto; width: auto; margin: 0; flex-direction: row; gap: 6px; padding: 3px 8px 3px 3px; box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .swatches .opt[aria-pressed="true"] { box-shadow: inset 0 0 0 1.5px var(--pl-instrument); }
  .swatches .opt[aria-pressed="true"]::before { display: none; }
  .swatches .opt b { margin: 0; }
  .swatches .you { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px 3px 3px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--pl-off); font: var(--pl-text-label); color: var(--pl-off); }
  .sw { width: 18px; height: 18px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
  .sw.plate { width: 22px; height: 14px; border-radius: 3px; box-shadow: none; }
  .note { padding: 8px 10px; border-radius: 6px; background: var(--pl-paper-2); font: var(--pl-card-body); color: var(--pl-ink); }
  .note code { font: var(--pl-card-meta); overflow-wrap: anywhere; }
`;
