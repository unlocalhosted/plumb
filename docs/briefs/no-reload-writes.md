# Writes without a reload

Status: the Vite host is fixed (d379af4). The rest is specified here and not built.

## The itch

The owner, 2026-11-10: "even in vite, during apply changes the whole app reloads, this is not the experience i like
to have can we find a good mechanism to apply changes across vite, next, webpack, turbopack and all without causing
like a hard reload of the app?"

## What was measured (Vite 8, Tailwind 4, laptop)

A page with a clicked counter and a typed input, then a write. "Kept" means the counter and the words survived.

| Write | App without Fast Refresh | App with `@vitejs/plugin-react` |
|---|---|---|
| A class in a component file (one write, from a card) | full reload, state lost | hot update, kept |
| A class in a file that also exports a constant | full reload, state lost | hot update, kept |
| The theme stylesheet saved from an editor | hot update, kept | hot update, kept |
| Apply-all: a new theme token and a class, **before the fix** | full reload, state lost | **full reload, state lost** |
| Apply-all: a new theme token and a class, **after the fix** | one reload | hot update, kept |

Source: a throwaway script that counted `load` events and read the HMR socket; the last row is now
`e2e/apply-all-hot.test.mjs`.

## The system behind it

Three separate things made the page reload, and only one of them is the bundler's.

1. **We asked for it.** The Vite host held an apply-all's files and then sent `full-reload` itself whenever a held
   file was read by no module, or was a stylesheet that sets the theme. React Plumber's own change log
   (`.plumber/cache/changes.jsonl`) is written by every traced apply and is read by no module, so every Apply
   reloaded the page, in every Vite app. The theme rule was a guess; measured, Vite and Tailwind update the
   stylesheet in place. Fixed.
2. **We build and test on an app with no Fast Refresh.** The overlay's own demo (`overlay/demo/vite.config.mjs`) and
   85 of the test fixtures compile JSX with no React plugin. Without one, nothing accepts a component's update, so
   Vite reloads for every write. We have been living in, and testing, a worse experience than a real app gives, and
   building the overlay around it: the "remember what was open and put it back after the reload" machinery
   (`plumb:resume`, `plumb:undoing`, `plumb:wrote`, `plumb:timeline`) is the main path in our tests and the cause of
   the flaky ones.
3. **The bundler has nothing to accept the update.** A real case, but a narrow one: an app with no Fast Refresh, or
   a write to an entry file. Here a reload is the bundler's own answer.

## The mechanism: hot update first, reload as the fallback

One rule for every host: **React Plumber writes the file and lets the app's own hot update carry it. It never asks
for a reload unless the page's HTML changed.** The page going away is the exception, handled by the resume
machinery that exists today, not the path everything is built on.

| Layer | What it does | State |
|---|---|---|
| 1. Never force | No host sends a reload for a file no module reads or for a stylesheet. Only a page's own HTML does. | Vite: done. Next: the host forces nothing (read, not measured). |
| 2. One reload when it is unavoidable | When a held module has nothing to accept it, one reload, never one per module. | Vite: done. |
| 3. Say so | A readiness row: "Fast Refresh is off, so each fix reloads the page", with the fix (`@vitejs/plugin-react`). The overlay already has readiness rows and fixes. | Not built. |
| 4. Live where users live | The demo and the test fixtures run Fast Refresh, as an app from Vite's React template does. A few fixtures stay without it, on purpose, to keep the reload path proven. | Not built. Changes 85 fixtures: do it inside the shared test harness (test-system layer 2), not by hand. |
| 5. Measure Next | The same measurement on Next with webpack and with Turbopack, client and server components: reloads, kept state. On vm-agent (a Next dev server is too heavy for the laptop beside other work). | Not done. |
| 6. Settled, the easy way | With no reload, "the write has landed" is a hot-update event on a page that never went away. The "settled after a write" signal becomes: the host's update applied (Vite `vite:afterUpdate`, Next's `built`/`sync` messages the overlay already hears) and the overlay has re-read. | Not built. |

### A fallback that was considered and not chosen (yet)

When nothing accepts the update, the overlay could patch the class on the live elements itself and swallow the
bundler's reload. It knows the change exactly (`from`, `to`, the stamp). Not chosen now: React still holds the old
component code, so an element that remounts comes back with the old class, and the page would silently disagree
with the file until the next load. It trades a visible reload for an invisible lie. Worth revisiting only with a
clear "page is behind the file" marker.

## Proof so far

`e2e/apply-all-hot.test.mjs`:
- with Fast Refresh, an apply-all with a new theme token and two class changes: no `load`, no `full-reload` on the
  socket, the counter still says "clicked 1", the input still holds the typed words, the element's padding is the
  new token's value;
- without Fast Refresh, the page hears the whole result first and reloads exactly once (the two older tests).

## Open questions for the owner

1. Layer 4 changes what most browser tests run on. It belongs in the harness layer of the test system; is that the
   order you want (harness first, then this), or this first on the demo alone so you feel it while dogfooding?
2. For apps without Fast Refresh, is "one reload, and a readiness row that says how to stop it" acceptable, or do
   you want the DOM-patch fallback explored?
