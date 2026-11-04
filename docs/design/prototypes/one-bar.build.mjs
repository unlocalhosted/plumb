// Builds docs/design/prototypes/one-bar.html: the one bar in every state, from the overlay's real tokens and Action CSS.
import { readFile, writeFile } from 'node:fs/promises';
const repo = process.argv[2];
const tokens = await readFile(`${repo}/overlay/src/tokens.css`, 'utf8');
const { LANGUAGE_CSS } = await import(`${repo}/overlay/src/language.js`);

// the proposal: the key cap (part of Action) and the bar
const PROPOSAL = `
  /* Action's key: one key, the one this action answers to, as a suffix cap */
  .pl-act kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 2px; box-sizing: border-box;
    border-radius: 4px; font: 600 11px/1 var(--pl-mono); background: color-mix(in oklab, currentColor 12%, transparent); color: color-mix(in oklab, currentColor 70%, transparent); }
  .pl-act.quiet kbd { background: var(--pl-paper-2); box-shadow: inset 0 0 0 1px var(--pl-rule); color: var(--pl-ink-2); }
  @media (pointer: coarse) { .pl-act kbd { display: none; } }

  /* the bar: one card, one line */
  .bar { display: flex; align-items: center; gap: 8px; height: 48px; width: min(720px, calc(100vw - 32px)); box-sizing: border-box; padding: 0 7px 0 16px;
    background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); color: var(--pl-ink); font: 500 13px/1 var(--pl-sans); position: relative; }
  .bar .status { display: inline-flex; align-items: center; gap: 8px; flex: none; padding: 6px 8px; margin-left: -8px; border-radius: var(--pl-radius-row); border: 0; background: none; color: inherit; font: inherit; cursor: default; }
  .bar .status:hover { background: var(--pl-paper-2); }
  .bar .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pl-coral); flex: none; }
  .bar .dot.clean { background: var(--pl-mint); }
  .bar .count { font-weight: 600; white-space: nowrap; }
  .bar .quiet-line { flex: 1; min-width: 0; color: var(--pl-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar .grow { flex: 1; }
  .bar .acts { display: inline-flex; gap: 6px; flex: none; }
  .bar .sep { width: 1px; height: 20px; background: var(--pl-rule); margin: 0 2px; flex: none; }
  .bar .tool { display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--pl-radius-row); border: 0; background: none; color: var(--pl-ink-2); cursor: pointer; flex: none; }
  .bar .tool:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
  .bar .tool svg { width: 16px; height: 16px; }
  .bar .tool.on { color: var(--pl-sky); background: color-mix(in oklab, var(--pl-sky) 10%, transparent); }
  .bar .close { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 6px; border: 0; border-radius: var(--pl-radius-row); background: none; color: var(--pl-ink-3); font: 600 12px/1 var(--pl-sans); cursor: pointer; }
  .bar .close kbd { display: inline-grid; place-items: center; height: 18px; padding: 0 5px; border-radius: 4px; font: 600 11px/1 var(--pl-mono); background: var(--pl-paper-2); box-shadow: inset 0 0 0 1px var(--pl-rule); color: var(--pl-ink-2); }
  .bar .close .x { display: none; }
  .bar .progress { position: absolute; left: 12px; right: 12px; bottom: 0; height: 2px; border-radius: 1px; overflow: hidden; background: var(--pl-paper-2); }
  .bar .progress i { display: block; height: 100%; width: 42%; background: var(--pl-sky); }
  .bar .notice { display: inline-flex; align-items: center; gap: 8px; flex: none; padding-left: 10px; margin-left: 2px; box-shadow: inset 1px 0 0 var(--pl-rule); color: var(--pl-ink-2); white-space: nowrap; }
  .bar .notice b { color: var(--pl-warning, #b7791f); font-weight: 600; }
  .bar .link { border: 0; background: none; padding: 0; color: var(--pl-sky); font: 600 12px var(--pl-sans); cursor: pointer; }
  .bar .err { flex: 1; min-width: 0; color: var(--pl-coral); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* the readout above the count, the design system's readout recipe */
  .readout { position: absolute; left: 8px; bottom: calc(100% + 8px); padding: 10px 12px; border-radius: var(--pl-radius-card); background: var(--pl-paper-2);
    box-shadow: 0 0 0 1px var(--pl-rule), 0 8px 20px -10px rgb(28 27 25 / .3); font: 500 13px/1.5 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; }
  .readout b { color: var(--pl-ink); font-weight: 600; }
  /* the clean-up preview: the same bar, its chips on the left */
  .chips { display: inline-flex; gap: 6px; }
  .chips span { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 8px; border-radius: var(--pl-radius-pill); background: var(--pl-paper-2); font: 600 12px var(--pl-mono); color: var(--pl-ink-2); }
  .chips span.done { box-shadow: inset 0 0 0 1.5px var(--pl-mint); color: var(--pl-ink); }
  .hold { color: var(--pl-ink-3); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  .hold kbd { display: inline-grid; place-items: center; height: 18px; padding: 0 6px; border-radius: 4px; font: 600 11px/1 var(--pl-mono); background: var(--pl-paper-2); box-shadow: inset 0 0 0 1px var(--pl-rule); color: var(--pl-ink-2); }
  /* a setup notice takes the room the long label had */
  .has-notice .long { display: none; }
  .narrow .long, .narrow .tool, .narrow .sep, .narrow .notice, .narrow .hold .word { display: none; }
  .narrow .close .w, .narrow .close kbd { display: none; } .narrow .close .x { display: block; width: 16px; height: 16px; }
  .narrow .chips span:nth-child(n+3) { display: none; }
  .narrow.bar { padding: 0 4px 0 12px; gap: 4px; }
  .narrow .pl-act.quiet kbd { display: none; } .narrow .pl-act { padding: 0 11px; }
`;
const icon = (d) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TOOLS = `<span class="sep"></span>
  <button class="tool" title="History" aria-label="History">${icon('<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2.5 2.5v2.5H5"/><path d="M8 5v3l2 1.5"/>')}</button>
  <button class="tool" title="Help" aria-label="Help">${icon('<circle cx="8" cy="8" r="6"/><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1"/><path d="M8 11.3v.2"/>')}</button>
  <button class="tool on" title="Grid" aria-label="Grid">${icon('<rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M2.5 6.2h11M2.5 9.8h11M6.2 2.5v11M9.8 2.5v11"/>')}</button>
  <button class="close" aria-keyshortcuts="Escape" aria-label="Close"><span class="w">Close</span> <kbd>Esc</kbd>${icon('<path d="M4 4l8 8M12 4l-8 8"/>').replace('<svg', '<svg class="x"')}</button>`;
const clean = `<button class="pl-act quiet" aria-keyshortcuts="c">Clean up <span class="long">page</span> <kbd>C</kbd></button>`;
const fix = `<button class="pl-act" aria-keyshortcuts="Enter">Fix <kbd>↵</kbd></button>`;
const STATES = [
  ['Checking', 'Right after Alt+B: the page is being read. Actions are there, but disabled until the count lands.',
    `<div class="bar"><span class="quiet-line">Checking this page…</span><span class="acts"><button class="pl-act quiet" disabled>Clean up <span class="long">page</span> <kbd>C</kbd></button><button class="pl-act" disabled>Fix <kbd>↵</kbd></button></span>${TOOLS}<div class="progress"><i></i></div></div>`],
  ['Ready', 'One count, two actions, each with its key. The rest of the counts are one hover away.',
    `<div class="bar"><button class="status"><span class="dot"></span><span class="count">54 problems</span></button><span class="grow"></span><span class="acts">${clean}${fix}</span>${TOOLS}</div>`],
  ['Count pointed at', 'The other counts, in the readout, never in the line.',
    `<div class="bar"><div class="readout"><b>19 fixes</b> · 6 notes · 1 element can’t be checked</div><button class="status" style="background:var(--pl-paper-2)"><span class="dot"></span><span class="count">54 problems</span></button><span class="grow"></span><span class="acts">${clean}${fix}</span>${TOOLS}</div>`],
  ['Setup notice', 'What used to be a separate toast, inside the bar.',
    `<div class="bar has-notice"><button class="status"><span class="dot"></span><span class="count">54 problems</span></button><span class="notice"><b>2 setup steps</b><button class="link">Review</button></span><span class="grow"></span><span class="acts">${clean}${fix}</span>${TOOLS}</div>`],
  ['Clean', 'Nothing to fix: the clean-up is still one key away.',
    `<div class="bar"><button class="status"><span class="dot clean"></span><span class="count">Nothing to fix here</span></button><span class="grow"></span><span class="acts">${clean}</span>${TOOLS}</div>`],
  ['Clean-up previewing', 'The clean-up shrinks back to the same one line while the page plays.',
    `<div class="bar"><span class="chips"><span class="done">20</span><span class="done">28</span><span>36</span></span><span class="grow"></span><span class="hold"><span class="word">Hold</span> <kbd>Space</kbd> <span class="word">to compare</span></span><span class="acts"><button class="pl-act quiet" aria-keyshortcuts="Escape">Cancel <kbd>Esc</kbd></button><button class="pl-act" aria-keyshortcuts="Enter">Apply <kbd>↵</kbd></button></span></div>`],
  ['Writing', 'The line says what is happening.',
    `<div class="bar"><span class="quiet-line">Saving 15 changes…</span>${TOOLS}<div class="progress"><i style="width:70%"></i></div></div>`],
  ['Error', 'The error, and the one thing to do about it.',
    `<div class="bar"><span class="err" title="Couldn’t save: the file changed since it was read.">Couldn’t save: the file changed since it was read.</span><span class="acts"><button class="pl-act quiet">Read again <kbd>R</kbd></button></span>${TOOLS}</div>`],
];
const section = (scheme, width) => `<section class="col" style="width:${width}px"><h2>${scheme === 'dark' ? 'Night' : 'Day'} · ${width}px</h2>${STATES.map(([t, n, html]) => `<div class="state"><div class="label"><b>${t}</b><span>${n}</span></div><div class="stage ${scheme}"><div class="host" data-scheme="${scheme}" data-html="${encodeURIComponent(html)}"></div></div></div>`).join('')}</section>`;
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>One bar</title>
<style>
  :root { --page: #f3f3f1; --page-ink: #222; } body { margin: 0; background: var(--page); color: var(--page-ink); font: 14px/1.5 system-ui, sans-serif; }
  header { padding: 28px 32px 8px; } header h1 { margin: 0; font-size: 22px; } header p { margin: 6px 0 0; color: #666; max-width: 760px; }
  .cols { display: flex; gap: 40px; padding: 16px 32px 48px; align-items: flex-start; flex-wrap: wrap; }
  .col h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin: 0 0 12px; }
  .state { margin-bottom: 18px; } .label { display: flex; gap: 10px; align-items: baseline; margin-bottom: 6px; } .label b { font-size: 13px; } .label span { color: #777; font-size: 12.5px; }
  .stage { padding: 56px 16px 16px; border-radius: 14px; background: #fafafa; display: flex; justify-content: center; } .stage.dark { background: #1b1b1d; }
</style></head>
<body><header><h1>One bar</h1><p>Blueprint’s first surface: one card, one line, each key on the action it presses (docs/design/one-bar.md). Built from the overlay’s real tokens and Action CSS; the key cap and the bar are the proposal.</p></header>
<div class="cols">${section('light', 760)}${section('dark', 760)}${section('light', 375)}</div>
<script>
  const css = ${JSON.stringify(tokens + LANGUAGE_CSS + PROPOSAL)};
  for (const h of document.querySelectorAll('.host')) {
    const r = h.attachShadow({ mode: 'open' });
    r.innerHTML = '<style>' + css + ':host { display: block; } :host .bar { width: min(720px, calc(' + (h.closest('.col').style.width) + ' - 32px)); }</style>' + decodeURIComponent(h.dataset.html);
    if (h.closest('.col').style.width === '375px') r.querySelector('.bar')?.classList.add('narrow');
  }
</script></body></html>`;
await writeFile(`${repo}/docs/design/prototypes/one-bar.html`, page);
console.log('wrote', page.length);
