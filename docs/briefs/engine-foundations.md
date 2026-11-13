# Foundations: an engine and an interface that can grow without making the app dull

Status: signed off by the owner, 2026-11-13. Layer 0 (the measurement) is done: see **Measured**. Nothing else is built.
Stands on what was measured the same day ([engine-scaling.md](engine-scaling.md)); where this document has no
number, it says so.

## Measured: what plumber takes from the app (2026-11-13, layer 0)

One headless Chromium on the laptop, 1280×800, one run per state per app. Real wheel and pointer input for four
seconds each; frames counted in the page. "Off" is the same page with plumber's scripts blocked (its source
stamps stay in the page). Headless draws in software, so the app's own numbers are lower than in a real window;
read the columns against each other, not against 60.

**algorecall, problems list (15,993 elements)**

| State | Frames a second while scrolling | Longest frame | Frames a second moving the pointer | Slowest answer to input |
|---|---|---|---|---|
| plumber off | 12 | 0.13 s | 11 | 0.18 s |
| plumber loaded, nothing open | 13 | 0.12 s | 13 | 0.14 s |
| plumber reading the page | 23* | 1.77 s | 1 | 1.04 s |
| plumber open, read finished | 3 | 0.98 s | 3 | 0.84 s |

**crafting-ui, motion vocabulary (2,443 elements)**

| State | Frames a second while scrolling | Longest frame | Frames a second moving the pointer | Slowest answer to input |
|---|---|---|---|---|
| plumber off | 57 | 0.07 s | 60 | 0.02 s |
| plumber loaded, nothing open | 57 | 0.05 s | 60 | 0.02 s |
| plumber reading the page | 10 | 0.58 s | 3 | 0.81 s |
| plumber open, read finished | 7 | 0.50 s | 15 | 0.19 s |

\* an average over a window with one 1.8 s freeze in it; the freeze is the number that matters.

What it says:

1. **At rest plumber costs nothing that can be measured.** Same frames, same longest frame, no long tasks of its
   own, on both apps. It adds about 17 MB of memory on the big page and makes about 80 small requests to its server
   while the page loads. "Nothing until asked" already holds.
2. **Open, plumber makes the app dull, and not only on big pages.** crafting-ui scrolls at 57 frames a second
   alone and at 7 with plumber open and *idle*: every scroll costs half a second. The pointer drops from 60 to 15.
   This is the state an editor lives in.
3. **While reading, the page freezes** for up to 0.6 s on the small page and 1.8 s on the big one, and a pointer
   move can wait a second for an answer.
4. Sitting still with plumber open costs nothing. The cost is all in answering scroll and pointer.

What this changes in the order below: the scheduler (layer 1) and drawing only what is in view on one layer
(layer 5) are what a person feels, on any page, today. Layer 5 moves up to second. The snapshot and the worker
remain the way to make reading not freeze the page.

*Not known:* what the half-second per scroll is. The guess is redrawing every mark on the page: that redraw was
timed at 0.55–0.6 s on algorecall earlier today. It has not been confirmed for crafting-ui, where it would be
smaller. First thing to find in layer 1.

### After the first fix to the open state (2026-11-13, layer 1's first piece)

A profile of both inputs said the same thing: over 90% of every frame was plumber asking the browser what covers
each marked element in view, five probes an element, on every frame. A pointer move re-asked it though nothing had
moved; a scroll re-asked it for zones that are not drawn at rest. A probe costs about 0.2 ms and a cheaper probe
was tried and gave 20%, so the answer was to ask less often, not faster:

- positions are measured only when the page may have moved; the pointer, focus and the fix in hand draw from what
  was measured;
- while the page scrolls, only what is lit is measured, the hit areas step aside, and everything is measured once
  when it stops;
- what covers each element is confirmed in slices of a few milliseconds a frame, after the frame is drawn from the
  cheap half (cut to the view and its scroll containers). One redraw at the end, only if something was covered.

| Plumber open, read finished | before | after | the app alone |
|---|---|---|---|
| crafting-ui, frames a second scrolling | 7 | 46 | 57 |
| crafting-ui, longest frame scrolling | 0.50 s | 0.28 s | 0.07 s |
| crafting-ui, frames a second moving the pointer | 15 | 59 | 60 |
| algorecall, frames a second scrolling | 3 | 40 | 13 |
| algorecall, longest frame scrolling | 0.98 s | 0.08 s | 0.10 s |
| algorecall, frames a second moving the pointer | 3 | 12 | 14 |
| algorecall, slowest answer to the pointer | 0.84 s | 0.46 s | 0.14 s |

(algorecall scrolls faster with plumber open than alone because the page under it is inert.)

Seen working on crafting-ui: pointing at a zone lights its six places and shows its pill; mid-scroll the hit areas
step aside; after the scroll the zones are where the elements are (docs/media/marks-after-scroll-fix-2026-11-13.png).
One run per state. No test run.

What this costs: for up to about a second after the page moves, an element that is covered (under a drawer or a
sticky header) can have a hit area it should not. It is corrected when the slices finish.

Still there: crafting-ui's 0.28 s frame when a scroll stops (the full measure plus the app mounting its own
examples); algorecall's 0.46 s answer to a pointer move; and **reading still freezes the page** (0.8 s on
crafting-ui, 2.5 s on algorecall in this run), which is the snapshot and the worker.

### After judging moved into slices (2026-11-13, layer 1's second piece)

A profile of one read showed the freezes were whole-page judgements done in one block: every element, every rule,
before the main thread was given back (0.3–0.4 s on crafting-ui, 1.3–2.5 s on algorecall).

- The engine now answers at once for every element whose findings are kept, judges the rest for 8 ms, and does the
  remainder a slice at a time between frames. While an element waits it shows what it last had. When the last
  slice lands the page is handed over once more.
- A read counts as finished only when nothing is left to judge, so the headless read and its findings are the
  same.
- Two small costs found in the same profile: every rule looked its settings up by searching the whole spec on
  every call (over a million times a page; now found once per spec), and kept elements still asked which rules
  quiet which (now asked only when something is judged).

This is slicing on the main thread, not yet the snapshot and the worker. The work is the same size; it no longer
arrives in one block.

| While plumber reads the page | before | after |
|---|---|---|
| crafting-ui, longest block of the main thread | 0.37 s | 0.09 s |
| crafting-ui, frames a second moving the pointer | 3 | 59 |
| crafting-ui, slowest answer to the pointer | 0.81 s | 0.04 s |
| crafting-ui, frames a second scrolling | 10 | 36 |
| algorecall, longest frame scrolling | 1.77 s | 0.33 s |
| algorecall, frames a second moving the pointer | 1 | 20 |
| algorecall, slowest answer to the pointer | 1.04 s | 0.16 s |
| algorecall, main thread blocked over the whole read | 4.7–7.4 s | 2.5 s |

Findings unchanged: 26 on crafting-ui, 27–28 on algorecall. Read time unchanged (1.7 s and 14–15 s warm).
Headless, one or two runs each. No test run.

Still there:

- algorecall's read begins with one block of about 0.8 s. The guess is the first sweep of 16,000 elements to find
  which ones to ask the server about; not confirmed.
- The first read after a dev server restart has four blocks of about 2.5 s each. Seen in every cold run today,
  never in a warm one; not looked into.
- crafting-ui can still drop one 0.4 s frame when scrolled while it is being read.

## 1. What it has to carry

The owner, 2026-11-13:

- "the visual editor will grow in scope … it will become similar to wix, figma and such thing"
- "a procedural layout generator algo for component level eventually where i can pick one card and say show me 3
  different layouts"
- "our list of things we scan will continue to grow: performance mode, security mode, vulnerability mode,
  accessibility mode and so much more heuristic based rules"
- "scaled and kept responsive without feeling like a users application is being made dull"

Read as loads on the engine:

| What is coming | What it asks of the foundations |
|---|---|
| An editor like Figma, on a live app | Answers the hand within a frame, on a page plumber does not own, while the app keeps running |
| A layout generator | The engine must judge something that is *not* the live page: a candidate, many of them, quickly |
| Many scan modes | Kinds of check that read different things (the page, the source, the network, the running app, the dependency list) and must cost nothing when off |
| "Not dull" | A hard limit on what plumber takes from the app's main thread, measured, not hoped |

## 2. The one idea

**Plumber is a guest in someone else's page.** The app owns the main thread, the DOM and the frame. Plumber may
*look* at the page briefly, and must do its *thinking* somewhere else.

Today it thinks where it looks. Even after today's work, one read of algorecall's big page blocks the main thread
for 4.7–7.4 s in total, in pieces of up to 1.3 s. A person does not feel that in a headless read. They will feel it
in an editor.

Everything below follows from separating looking from thinking.

## 3. The foundations

### F1. A page snapshot: look once, as plain data

One short read phase on the main thread copies what plumber needs into flat columns: for every element a number,
its parent, its kind, its box, and the style values rules read. Plus small tables for classes, sources and tokens,
each thing stored once and pointed at by number.

- It is plain data, so it can be handed to a worker, kept, compared, and built for something that is not on the
  page.
- It is the one model every reader shares: every scan mode, the editor's rulers and snapping, the layout generator.
  (This is the "page as a graph of levels" direction from 2026-11-05, given a concrete shape.)
- It is kept up to date by change, not rebuilt: what changed on the page marks rows dirty; only those are read again.
- Lists by kind (every button, every flex row, every image) are built in the same pass, so a rule walks its own
  list. Today 1.3 million rule calls find problems on about a hundred elements.

*Not measured:* what it costs to read the forty or so style values rules use, for 16,000 elements. Reading a box
and one style value for all of them takes 0.02 s; the full set is the first thing to time.

### F2. Rules are pure: a function of the snapshot

A rule gets rows and columns and the theme. It never touches `document`, never measures, never asks the browser
anything. Most rules already read through "facts"; some still reach for the page. That becomes a refusal at load,
like a rule with no declared kind.

Purity is what buys the next three foundations. Things only the page can answer (an icon's pixels, where a line of
text breaks) are *fact providers*: they run on the main thread in idle time and add a column.

### F3. Thinking happens off the main thread

Judging, choosing one verdict per element, parsing the server's answers and scoring layouts run in a worker, on the
snapshot. The main thread does three things only: read the snapshot, draw, and answer the hand.

### F4. One scheduler, four lanes

All of plumber's main-thread work goes through one scheduler. Nothing calls into the page on its own.

| Lane | What | Rule |
|---|---|---|
| hand | selection, drag, resize, hover feedback | this frame, a few milliseconds at most, never waits for the engine |
| view | reading and drawing what is on screen | next frames, in slices that yield |
| rest | the rest of the page, other modes | only when the person and the app are still |
| idle | pixels, precomputing, warming caches | idle time; dropped first |

Work in the lower lanes stops when the person touches their app, when the page scrolls or animates, and when its
answer is out of date. This is where "not dull" is enforced.

### F5. The editor path never goes through the engine

- While a hand is moving something, plumber changes only what the compositor can move (a transform, an outline on
  plumber's own layer). No judging, no reading layout in a loop.
- On release: write the source, take the hot update, re-read the rows that changed, judge those.
- Plumber's drawings live on one layer of its own, drawn from the snapshot, only for what is in view. Today the
  marks for the big page take 0.55–0.6 s to redraw; an editor cannot afford that once.

### F6. Modes are packs

A mode (craft, accessibility, performance, security, vulnerabilities, platform) is a pack with a short manifest:

- **what it reads:** the page snapshot, the source index, the network log, a runtime trace, the dependency list;
- **where it runs:** the page's worker, the server, or the command line only;
- **what it is about:** its kinds, for dispatch;
- **its budget:** bytes and milliseconds.

A pack that is off is not downloaded and costs nothing. Not every mode is a page scan: security and
vulnerabilities are mostly about source and dependencies, so they run on the server, per file, kept by the file's
content, and the page is sent only what touches something on screen. Performance mode listens (the browser's own
performance observers) rather than measures.

One mode is on screen at a time; others may run in the rest lane or on the server.

### F7. The engine is a function you can call on a candidate

`judge(snapshot, packs) → findings`. The live page is one snapshot. A layout the generator proposes is another.

The generator then is: propose arrangements for the picked card from the project's own system → build each off
screen → snapshot it → judge all of them in the worker → show the three the rules and the system like best. The
foundation it needs is F1–F3; with them it is a feature, without them it is a second engine.

### F8. The wire: what is drawn, in tables, as changes

Started today: a page is sent what it draws (811 MB → 12 MB on algorecall). Next: tables instead of repeated
objects (half of what is left is the same reading sent again for rows of a list), and after a file changes the
server sends what changed, not the page again.

### F9. The guest tax is a number, and it is guarded

- **At rest** (overlay loaded, nothing open): what plumber costs the app per frame and per interaction. The target
  is nothing measurable. *Not measured yet.*
- **In use:** the longest block of the main thread caused by plumber, and the app's response to input with
  plumber on against off.
- Both are read on the two reference apps by the standing timer, and a pack or a rule that breaks its budget is
  refused before it merges.

## 4. Order

One layer at a time, each seen working on a real app, each timed before and after. No tests until the behaviour
has settled.

| # | Layer | What can be seen |
|---|---|---|
| 0 | Measure the guest tax, at rest and in use, on both apps | **Done.** See Measured |
| 1 | The scheduler and its lanes; today's work moved onto it. First: find what each scroll and pointer move costs when plumber is open | No block of the main thread over 50 ms from plumber; the app scrolls at its own speed with plumber open |
| 2 | One drawing layer, only what is in view | crafting-ui scrolls with plumber open as it does alone (57 frames a second; 7 today) |
| 3 | The snapshot and lists by kind | Its cost on 16,000 elements; rule calls fall to about the number of things each rule is about |
| 4 | Pure rules, then judging in a worker | The page does not freeze while it is read (0.6–1.8 s today) |
| 5 | Packs: the manifest, loading on demand, today's families moved in; changes from the server | Bytes loaded with a family off; the Chrome guidance arrives as a pack |
| 6 | `judge` on a candidate | Two hand-made variants of one card, ranked. The generator is built on this |
| 7 | Each new mode | One pack each |

Layers 1 and 2 are independent of each other. The Chrome guidance work ([platform-guidance-lld.md](platform-guidance-lld.md))
should wait for layer 5: it is the first new pack.

## 5. Decided here, and why (change any at sign-off)

- **A worker, not a faster main thread.** Making the main-thread work quicker was today's job and it has a floor;
  an editor needs the floor to be near zero.
- **The snapshot before the scheduler is finished, not after.** Purity and the worker both need it, and it is the
  shared model the editor and generator need anyway.
- **Server for anything about source.** Security and vulnerability checks do not belong in the user's page.
- **No second engine for the generator.** If judging a candidate needs different code from judging the page, the
  two will disagree.
- **The Chrome guidance waits for packs.** It adds a family; adding it before packs exist adds to what every page
  pays.

## 6. Not known

- What the half-second per scroll is when plumber is open (see Measured).
- The numbers in a real window with a graphics card; these are headless.
- What the snapshot costs, and how many rules cannot be made pure without a fact provider.
- Whether sending the snapshot to a worker and findings back costs less than it saves on small pages. It may be
  that small pages stay on the main thread and only large ones use the worker.
- How a candidate layout is built off screen cheaply and faithfully (the app's own components, its styles, its
  data). That is the generator's hard part and is not designed here.
