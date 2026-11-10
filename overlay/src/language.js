/* ─────────────────────────────────────────────────────────
 * LANGUAGE · React Plumber overlay
 *
 * The shared marks of the visual language (docs/briefs/visual-language.md): a toy you can trust. Colours come from
 * tokens.css; these are the shapes and patterns every surface reuses, so a pill or a hatch reads the same in the
 * chooser, the panel and on the page.
 *
 *  pill      a measurement, a count or a token: pastel fill, the hue's deep ink, mono tabular numbers.
 *            .pl-pill[data-hue="sky|coral|mint|butter|pink|lilac"]
 *  tag       a name (an element, a component): lilac pill with an optional glyph before the words
 *  hatch     padding: the old Mac 45° pattern, 1px lines at 6px pitch, in the hue's line colour
 *  dither    margin: the old Mac 50% dot dither
 *  checker   a transparent fill
 *  ants      picked but not written: MacPaint's marching selection, a 1px dashed outline whose dashes march
 *  rainbow   pink, mint, butter, sky as one striped band: the dock's mark, used nowhere else
 *  act       the action: a pink pill button (white lettering at night); .quiet or aria-pressed sits on the paper
 *  pop       anything that appears (a pill, a tag, a card) pops from 0.92 on a spring that overshoots ~4%
 *  card      the only lifted thing: paper, card corners, the card shadow, ink. CARD_CSS on its own, for a root that
 *            doesn't load the rest (the overlay's)
 *
 * Reduced motion: the ants stand still, nothing pops, the rainbow does not shimmer.
 * ───────────────────────────────────────────────────────── */

export const CARD_CSS = `
  .pl-card { background: var(--pl-paper); color: var(--pl-ink); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); }
`;

export const LANGUAGE_CSS = CARD_CSS + `
  .pl-pill { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: var(--pl-radius-pill); box-sizing: border-box;
    font: 600 11px/1 var(--pl-mono); font-variant-numeric: tabular-nums; white-space: nowrap;
    background: var(--pill-soft, var(--pl-sky-soft)); color: var(--pill-ink, var(--pl-sky-ink)); }
  /* a tag is lilac by default; sky has to be asked for (a measurement tag, "W Fill 500px") */
  .pl-tag[data-hue="sky"] { --pill-soft: var(--pl-sky-soft); --pill-ink: var(--pl-sky-ink); --pill-line: var(--pl-sky); }
  .pl-pill[data-hue="coral"], .pl-tag[data-hue="coral"] { --pill-soft: var(--pl-coral-soft); --pill-ink: var(--pl-coral-ink); --pill-line: var(--pl-coral); }
  .pl-pill[data-hue="mint"], .pl-tag[data-hue="mint"] { --pill-soft: var(--pl-mint-soft); --pill-ink: var(--pl-mint-ink); --pill-line: var(--pl-mint); }
  .pl-pill[data-hue="butter"], .pl-tag[data-hue="butter"] { --pill-soft: var(--pl-butter-soft); --pill-ink: var(--pl-butter-ink); --pill-line: var(--pl-butter-line); }
  .pl-pill[data-hue="pink"], .pl-tag[data-hue="pink"] { --pill-soft: var(--pl-pink-soft); --pill-ink: var(--pl-pink-ink); --pill-line: var(--pl-pink); }
  .pl-pill[data-hue="lilac"], .pl-tag[data-hue="lilac"] { --pill-soft: var(--pl-lilac-soft); --pill-ink: var(--pl-lilac-ink); --pill-line: var(--pl-lilac); }
  .pl-tag { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px 0 6px; border-radius: var(--pl-radius-tag); box-sizing: border-box;
    font: 600 12px/1 var(--pl-sans); white-space: nowrap; background: var(--pill-soft, var(--pl-lilac-soft)); color: var(--pill-ink, var(--pl-lilac-ink)); }
  .pl-tag svg { width: 12px; height: 12px; }

  .pl-hatch { background-image: repeating-linear-gradient(45deg, color-mix(in oklab, var(--hatch, var(--pl-sky)) 55%, transparent) 0 1px, transparent 1px 6px); }
  .pl-dither { background-image: radial-gradient(color-mix(in oklab, var(--hatch, var(--pl-sky)) 60%, transparent) 0.75px, transparent 0.9px); background-size: 3px 3px; }
  .pl-checker { background-image: conic-gradient(var(--pl-paper-2) 25%, transparent 0 50%, var(--pl-paper-2) 0 75%, transparent 0); background-size: 8px 8px; }

  .pl-ants { outline: none; background-image:
      linear-gradient(90deg, var(--ants, var(--pl-sky)) 50%, transparent 0), linear-gradient(90deg, var(--ants, var(--pl-sky)) 50%, transparent 0),
      linear-gradient(0deg, var(--ants, var(--pl-sky)) 50%, transparent 0), linear-gradient(0deg, var(--ants, var(--pl-sky)) 50%, transparent 0);
    background-repeat: repeat-x, repeat-x, repeat-y, repeat-y; background-size: 8px 1px, 8px 1px, 1px 8px, 1px 8px;
    background-position: 0 0, 0 100%, 0 0, 100% 0; animation: pl-march 600ms linear infinite; }
  @keyframes pl-march { to { background-position: 8px 0, -8px 100%, 0 -8px, 100% 8px; } }

  .pl-rainbow { background: linear-gradient(90deg, var(--pl-pink) 0 25%, var(--pl-mint) 0 50%, var(--pl-butter) 0 75%, var(--pl-sky) 0); }

  /* the action: what you can do, in pink; a quiet one sits on the paper. Pressed, it gives a little; on, it settles to
     the paper so the next press reads as undo */
  .pl-act { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border: 0; border-radius: var(--pl-radius-pill); box-sizing: border-box;
    font: 600 13px/1 var(--pl-sans); white-space: nowrap; cursor: pointer; background: var(--pl-pink-soft); color: var(--pl-pink-ink);
    transition: scale 140ms var(--pl-ease-out), filter 180ms var(--pl-ease-out), background-color 200ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
  .pl-act:hover { filter: brightness(1.06) saturate(1.04); }
  .pl-act:active { scale: .97; }
  .pl-act:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  /* on a touch screen the button takes a 44px-tall press without looking any bigger */
  @media (pointer: coarse) { .pl-act { position: relative; } .pl-act::before { content: ""; position: absolute; inset: -5px 0; } }
  /* quiet, pressed and disabled sit on the paper with a hairline edge, so they stay buttons on any surface */
  .pl-act:disabled { cursor: not-allowed; background: var(--pl-paper-2); color: var(--pl-ink-3); filter: none; box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .pl-act[aria-pressed="true"], .pl-act.quiet { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1px var(--pl-rule); }
  .pl-act[aria-pressed="true"]:hover, .pl-act.quiet:hover { background: var(--pl-paper-2); filter: none; }

  /* an action's key: one key, the one it answers to, as a suffix cap (docs/design/one-bar.md). It follows the action's
     colour; a quiet action's sits on the inset with a hairline. No key on a touch screen: there is none to press */
  .pl-act kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 2px; box-sizing: border-box;
    border-radius: 4px; font: 600 11px/1 var(--pl-mono); background: color-mix(in oklab, currentColor 12%, transparent); color: color-mix(in oklab, currentColor 70%, transparent); }
  .pl-act.quiet kbd { background: var(--pl-paper-2); box-shadow: inset 0 0 0 1px var(--pl-rule); color: var(--pl-ink-2); }
  @media (pointer: coarse) { .pl-act kbd { display: none; } }

  .pl-pop { animation: pl-pop 260ms var(--pl-spring-pop) both; }
  @keyframes pl-pop { from { opacity: 0; scale: 0.92; } }

  @media (prefers-reduced-motion: reduce) { .pl-ants { animation: none; } .pl-pop { animation: none; } .pl-act { transition: none; } }
`;
