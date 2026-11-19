# Onboarding, tried from scratch on two real apps (2026-11-19)

The owner asked for a DX and UX test of how someone starts using React Plumber, on real projects, "to fill all the
gaps before release". Plumber was packed as npm would publish it (0.5.0, 545 files) and added to two apps that
didn't have it, following the README word for word:

- **crafting-ui**, 651 files, Vite 8, React 19, Tailwind 4, pnpm. A clean clone with plumber taken out (package,
  plugin, config, `.plumber`). The CLI and pages on the laptop.
- **algorecall**, 3,658 files, Vite 8, React 19, Tailwind 4, npm. A clean clone (its committed code has no plumber).
  The CLI on vm-agent, the pages through an SSH tunnel.

Each gap says what a newcomer meets, where, and the evidence. Blockers stop a person finishing or tell them something
wrong; major gaps cost them minutes or trust; minor ones are rough edges.

## Blockers

1. **The spacing step doesn't see Tailwind's spacing steps.** crafting-ui sets `--spacing: 0.25rem`; the page said
   "No scale to draw yet", "0 places use your scale", "1,749 places type a gap and padding by hand". On algorecall
   the page said "56 places use your scale" and "37,401 places type a gap and padding by hand", while `plumber state`
   on the same copy said spacing is 98% on tokens (39,733 of 40,725). The drawing paints the most common sizes (4, 8,
   12, 16px) red. A newcomer is told their everyday `p-4` is wrong.
2. **"Set it up" fails, after half of it is written.** On crafting-ui the token tidy (`system-apply`) wrote
   `src/index.css`, then `setup` was refused with 400: "decisions.spacing.from must list css: or theme: sources." The
   spacing rule the page built was `spacing: { from: [] }` (gap 1). The person sees "Nothing more was written. The
   server said 400." and is left with changed tokens and no config.
3. **The token tidy wrote a text shadow as a text size:** `--text-0: 0px 1px 0px rgb(0 0 0 / 0.15);` in
   crafting-ui's `@theme`, beside `--text-17`, `--text-19`, `--text-24`.

## Major

4. **Spacing with no scale offers one choice, "Keep what you have".** Its rule checks nothing. `plumber propose`
   already drafts a scale from the values in use; the page doesn't offer it. (Once gap 1 is fixed, crafting-ui has a
   scale; an app with none still meets this.)
5. **The colour step's palette looks wrong.** crafting-ui shows "3 colours in your palette" (white, near-black,
   black) though its theme has an accent, a drawing blue and status colours. Rows read "color: ink" three times with
   three different swatches. `color: var(--fg)` (23 places) is listed as typed by hand, though it is the token.
6. **Every command reads the whole app again.** algorecall, vm-agent: `plumber` 61s, `state` 41s, `propose` 64s,
   `check` 50s, `doctor` 16s. The README's first block, run in order, is about 4.5 minutes of waiting.
7. **Commands that don't run as printed.** "Next: plumber init", `plumber install --ci`, and the setup panel's Copy
   buttons give `plumber …`, which a shell without a global install can't find. The plain first run says "run npx
   plumber" to a pnpm user. The README shows npm only.
8. **Two setup paths that disagree.** The README and the setup panel say `plumber init`, the panel calling the config
   "Make checks faster" with "Export plain data from plumber.config.ts: no imports, calls or functions"; the page
   says "Set it up" and calls the config "your rules". Nothing says which to use or how they relate.
9. **The README's Blueprint is not today's.** It describes the page dimming, an amber heat on every drift and a fix
   panel docked at the bottom with ↑↓, J/K, N, A, L. Alt+B today shows a bar ("118 problems · 2 setup steps ·
   Review · Clean up · Fix · Close") and a card per cause, with the choice on the element.
10. **A blank page on a large app.** algorecall's page was white for 10 to 15 seconds while it loaded, with nothing
    saying it was working.
11. **A first headline that looks wrong.** algorecall's first run: "You set text size 16px 7 ways, in 3,049 places.
    The closest in your type scale is sm-minus (12.8px)." 12.8px is not close to 16px. To check.

## Minor

12. `plumber --help` lists about 30 commands with no "start here".
13. At 1024 × 768 the Welcome screen's button sits at the bottom edge, mostly hidden.
14. The rules summary shows the four rules twice, in the main panel and in the side panel.
15. The text step suggests "One list of 19" while saying "a few clear levels tell the reader what to read first".
16. Writing a token to 27 places took about 15 seconds, with "Writing it to your code…" and no count.
17. A hover label read "backgroundColor: MAT": a variable's name where its colour should be.
18. `plumber doctor` before the overlay is wired says "can't tell from vite.config.ts" instead of the step to take.
19. `install --overlay --write` wrote `"@unlocalhosted/react-plumber/vite";` with double quotes and a semicolon into a
    file that uses neither.

## What worked

- Installing from the packed release, on pnpm and npm, with no plumber-specific errors.
- crafting-ui's first read: 651 files in 1.5 to 5.3s, with a plain headline ("You wrote white 4 ways, in 97 places").
- The text and corner steps: the Gravity drawing, two real choices, one suggested, the rule in words and in config.
- `install --overlay --write`: one import, `plumb()` placed before `react()`, the diff shown.
- On the page: the dock, the setup callout, Alt+B, and a fix that added a token and rewrote 27 places across 30 files,
  then moved to the next cause by itself.
