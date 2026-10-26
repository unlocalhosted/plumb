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
 *  pop       anything that appears (a pill, a tag, a card) pops from 0.92 on a spring that overshoots ~4%
 *
 * Reduced motion: the ants stand still, nothing pops, the rainbow does not shimmer.
 * ───────────────────────────────────────────────────────── */

export const LANGUAGE_CSS = `
  .pl-pill { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: var(--pl-radius-pill); box-sizing: border-box;
    font: 600 11px/1 var(--pl-mono); font-variant-numeric: tabular-nums; white-space: nowrap;
    background: var(--pill-soft, var(--pl-sky-soft)); color: var(--pill-ink, var(--pl-sky-ink)); }
  .pl-pill[data-hue="coral"], .pl-tag[data-hue="coral"] { --pill-soft: var(--pl-coral-soft); --pill-ink: var(--pl-coral-ink); --pill-line: var(--pl-coral); }
  .pl-pill[data-hue="mint"], .pl-tag[data-hue="mint"] { --pill-soft: var(--pl-mint-soft); --pill-ink: var(--pl-mint-ink); --pill-line: var(--pl-mint); }
  .pl-pill[data-hue="butter"], .pl-tag[data-hue="butter"] { --pill-soft: var(--pl-butter-soft); --pill-ink: var(--pl-butter-ink); --pill-line: var(--pl-butter); }
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

  .pl-pop { animation: pl-pop 260ms var(--pl-spring-pop) both; }
  @keyframes pl-pop { from { opacity: 0; scale: 0.92; } }

  @media (prefers-reduced-motion: reduce) { .pl-ants { animation: none; } .pl-pop { animation: none; } }
`;
