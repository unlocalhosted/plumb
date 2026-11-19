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

Fixed the same day; tried again on the clean crafting-ui copy: the spacing step draws Tailwind's steps 8 to 64px with
"1,491 places use your scale" and "258 places type a gap and padding by hand", its rule is
`spacing: { from: ['css:src/index.css#--spacing'] }` ("each a multiple of 4px"), "Set it up" answers "Done. Your rules
are in plumber.config, 10 tokens tidied, and 3,332 problems already in your code remembered", no `--text-0` was
written, and `plumber check` then says "Nothing new since your baseline".

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
5. **The colour step's palette looks wrong.** *Palette fixed: colours kept outside the theme that named uses point at count (crafting-ui: 28, not 3). Chips now group by the colour itself (greys, then each hue). Left: rows read "color: ink" where the code writes a variable named ink; `color: var(--fg)` still counts as typed by hand.* crafting-ui shows "3 colours in your palette" (white, near-black,
   black) though its theme has an accent, a drawing blue and status colours. Rows read "color: ink" three times with
   three different swatches. `color: var(--fg)` (23 places) is listed as typed by hand, though it is the token.
6. **Every command reads the whole app again.** *Answered by the path: the README's quick start is now two commands (`plumber`, then `install --overlay --write`), with the others under "In the terminal instead"; once a config exists, `check` reuses the last result. The commands still don't share a read with each other.* algorecall, vm-agent: `plumber` 61s, `state` 41s, `propose` 64s,
   `check` 50s, `doctor` 16s. The README's first block, run in order, is about 4.5 minutes of waiting.
7. **Commands that don't run as printed.** *Fixed: every command printed for a person carries the project's runner, from its lockfile (`pnpm exec plumber init`, `npx plumber check --broken`), in the CLI's text, the setup panel's steps and Copy, and the plain first run; JSON keeps `plumber …`.* "Next: plumber init", `plumber install --ci`, and the setup panel's Copy
   buttons give `plumber …`, which a shell without a global install can't find. The plain first run says "run npx
   plumber" to a pnpm user. The README shows npm only.
8. **Two setup paths that disagree.** *Fixed: with no config, the setup panel's first step is "Choose your rules" and both steps send you to `plumber` (the page), with `plumber init` named as the same questions in the terminal.* The README and the setup panel say `plumber init`, the panel calling the config
   "Make checks faster" with "Export plain data from plumber.config.ts: no imports, calls or functions"; the page
   says "Set it up" and calls the config "your rules". Nothing says which to use or how they relate.
9. **The README's Blueprint is not today's.** *Fixed: the README's Inspect and Blueprint sections follow the overlay's own shortcut list, and "Why" says what Alt+B does now. Left: the GIF at the top still shows the old Blueprint.* It describes the page dimming, an amber heat on every drift and a fix
   panel docked at the bottom with ↑↓, J/K, N, A, L. Alt+B today shows a bar ("118 problems · 2 setup steps ·
   Review · Clean up · Fix · Close") and a card per cause, with the choice on the element.
10. **A blank page on a large app.** *Fixed: the page says "Reading <app>…" ("A large app takes a few seconds.") until it draws, and a failed read says why instead of staying white.* algorecall's page was white for 10 to 15 seconds while it loaded, with nothing
    saying it was working.
11. **A first headline that looks wrong.** *Explained and fixed: algorecall's own type scale is four small chrome sizes (11 to 14px; its reading text uses Tailwind's sizes), so the nearest of its steps to 16px was the largest of them. A step more than 15% away is no longer offered: the sentence says nothing in your type scale is near it. Left as a known limit: px is worked out from a 16px root, and algorecall's root is 110% (0.8rem is 14.08px there, not 12.8px).* algorecall's first run: "You set text size 16px 7 ways, in 3,049 places.
    The closest in your type scale is sm-minus (12.8px)." 12.8px is not close to 16px. To check.

## Minor

12. `plumber --help` lists about 30 commands with no "start here". *Fixed: it opens with "New here? Run plumber in your app's folder, with nothing after it: it opens a page that sets you up."*
13. At 1024 × 768 the Welcome screen's button sits at the bottom edge, mostly hidden. *Fixed: it follows "What happens", before "Why" and "After".*
14. The rules summary shows the four rules twice, in the main panel and in the side panel. *Fixed: the rules screen has no side panel.*
15. The text step suggests "One list of 19" while saying "a few clear levels tell the reader what to read first".
16. Writing a token to 27 places took about 15 seconds, with "Writing it to your code…" and no count. *Fixed: "Writing it to 27 places in your code…".*
17. A hover label read "backgroundColor: MAT": a variable's name where its colour should be. *Fixed: "backgroundColor: #fff (MAT)"; CSS words (red, auto) stay as written.*
18. `plumber doctor` before the overlay is wired says "can't tell from vite.config.ts" instead of the step to take. *Fixed: "→ plumber install --overlay shows the line it needs".*
20. The written `plumber.config.ts` opens with 39 comment lines naming every component found ("// Fig:
    src/components/drawing.tsx:41"), before the rules a person chose. *Fixed: one line, "// Components: 37 found."*
19. `install --overlay --write` wrote `"@unlocalhosted/react-plumber/vite";` with double quotes and a semicolon into a
    file that uses neither. *Explained: it copies the file's last import, and algorecall's config mixes both styles; its last import has double quotes and a semicolon.*

21. **Found while fixing 16:** a craft finding's card in the compact layout showed no words: its "i" icon had no size
    there (the rules covered only the other layout) and grew to 273px, pushing the sentence out of the card. *Fixed.*

## What worked

- Installing from the packed release, on pnpm and npm, with no plumber-specific errors.
- crafting-ui's first read: 651 files in 1.5 to 5.3s, with a plain headline ("You wrote white 4 ways, in 97 places").
- The text and corner steps: the Gravity drawing, two real choices, one suggested, the rule in words and in config.
- `install --overlay --write`: one import, `plumb()` placed before `react()`, the diff shown.
- On the page: the dock, the setup callout, Alt+B, and a fix that added a token and rewrote 27 places across 30 files,
  then moved to the next cause by itself.
