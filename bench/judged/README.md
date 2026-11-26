# The judged set

Real screens, marked by a person. It is what plumber's eye is measured against: what a person saw that plumber
missed, and what plumber flagged that a person would not flag.

## Judging

1. Start the app you want judged (its own dev server).
2. Start the judging server over every set:

   ```bash
   ~/.claude/bin/dev-server "$PWD/bench/judged" node serve.mjs sets
   ```

3. Open `http://localhost:4420/__judge/` for the list of sets. Each set has its own address,
   `http://<set>.localhost:4420/__judge/`, so two sets open in two tabs keep their own cookies and do not disturb
   each other. (`node serve.mjs sets/calcom` serves that one set at `http://localhost:4420/__judge/`.)

Each screen is the live app at a fixed width, with a layer over it.

- **First, three looks.** Point at the first thing your eye went to and press 1. Do the same with 2 and 3 for the
  next two. Backspace takes the last one back. Skip if you already know the screen.
- **Then, marks.** Drag a box round anything that looks wrong. Say what is off in your own words and pick how much
  it matters: Small, Wrong or Hurts. Click a mark to change it; Remove, Backspace or Delete takes it away.
- **Hold Space** to use the page under the layer: hover, click, open a menu. Without Space the page is still: a
  click on it presses nothing and records nothing. The wheel scrolls the page at any time.
- **Nothing else here** finishes the screen. From then on, whatever you did not mark counts as fine.

Everything is saved as you go. Closing the tab loses nothing, and opening it again returns to the first screen that
is not finished.

## Seeing another judge's marks

`http://<set>.localhost:4420/__judge/?judge=<name>&view=1` shows that judge's marks over the live site, read-only,
with every point listed beside the page. The list of sets links to it.

- A solid box is drawn where the point sits on today's page. A dashed box was placed from an older copy of the
  page and may have moved. A point with no box is only in the list: it was made on the reviewer's own picture, or it
  is about movement.
- Choosing a point opens what the page shows, how the reviewer got there, where it belongs in plumber and what the
  page is like today, and scrolls the page to its box.
- Holding Space lets the pointer through, so a point about hover or motion can be tried where it happens.

### A reviewer as a judge

`from-reviews.mjs` turns a file of pinned reviews into sets, one per reviewed site, with the reviewer as the judge:

```bash
node bench/judged/from-reviews.mjs docs/research/harvests/raunofreiberg-portfolio-reviews/reviews.json rauno
```

Each pin on a picture of the live page becomes a box. Each box is tied to the nearest element with words (from the
element list captured with the picture), and the review page moves the box with that element, because a page can
lay out differently in another window. The sets it writes (`sets/rauno-*`) are ignored by git and made again from
the reviews file.

### A point shown as the reviewer met it

A box from a still picture cannot show a point about a hover, a comparison, or a page that opens with an intro. Such
a point carries a scene, and the review page draws the scene in place of a box:

- `show`: the things the point is about, found on the live page by the site's own names and followed as they move
- `join`: the words that tie the first two together, when the point compares them
- `try`: what to do with your own hand. While the point is open, the pointer goes through to the site
- `beside`: things that are not on the page, such as the tab icon, shown in the list

A set can also say how to reach the state the reviewer was in: `ready.press` (a control to press once, such as
"Skip intro") and `ready.until` (the page has arrived when this element can be seen). Scenes are written in the
harvest's `scenes.py`, one site at a time, after the site has been used the way the reviewer used it. One site is
done: Sam Limby's.

### What the engine sees

`?seen=1` on a set's address draws the seen picture of `docs/briefs/shape-engine.md` over the set's first screen,
with nothing judged: `http://<set>.localhost:4420/__judge/?seen=1`. It is the spec's first layer, there so a person
can say whether the engine's groups are the groups they see.

- `see.js` reads the page once it has stopped moving into plain rows, one per drawn area: a block of text, a
  picture, a drawn box. It uses what is drawn and no tag name, role or source.
- `seen.js` is pure. It grows the rows into a tree: a drawn box holds what lies in it, and things are split wherever
  the gap between them is at least 1.5 times the gaps inside them. Things with even gaps stay one run.
- The view outlines one level of that tree at a time. Pointing at a part says why it was taken as one thing.

It does not use likeness yet, so two things that look the same are not tied together unless space or a box does it.

### A public site as the app

A set's `app` may be a public site. The server asks the site for each page and passes it on from the set's own
address. It drops two response headers on the way, the one that forbids framing and the one that lists allowed
origins, because the page is now served from another origin and they no longer describe it. Nothing else is changed.
A site behind a bot check will show that check; the server does not try to get past it.

## Rules that keep it a fair test

- **The judge does not see plumber.** Plumber's overlay is hidden in the frame, so the marks are the judge's own.
  Next's development badge is hidden too, because it is not part of the app.
- **Finished means the rest is fine.** A screen counts only after "Nothing else here". Without that, an unmarked
  thing could be fine or just not looked at yet.
- **The judge's words are kept as written.** There are no categories to pick from. Sorting marks into kinds is done
  afterwards, so the kinds plumber already knows do not steer the judge.
- **The data stays on this machine.** `judgements/` and `screens/` are ignored by git, because a judged app may be
  private. They exist nowhere else, so back them up.

## A set

`sets/<name>/set.json`:

```json
{
  "name": "first",
  "app": "http://localhost:5180",
  "appDir": "../crafting-ui",
  "width": 1280,
  "screens": [{ "id": "home", "path": "/" }]
}
```

`app` is where the app runs. `appDir` is its folder, from this repository's root; it is used to record which commit
drew the screen. A set judges one app. `width` is the width every screen is shown at.

`ready` says what makes the app fit to be judged: the app's own switches for questions that come from how the copy
was set up and not from its design. Today it takes `cookies`, set before the first screen is shown. Cal.com asks
every visitor whose clock differs from the demo user's to change timezone, on every page; its own "don't show
again" cookie is `calcom-timezone-dialog`.

An app that runs on another machine has no folder here. Its set gives `code` in place of `appDir`, with the
repository and commit written by hand, and `app` is the local end of a tunnel to it. `sets/calcom` is one: cal.com on
the test server, reached with `ssh -N -L 3000:localhost:3000 vm-agent`.

## Files a judge leaves

`sets/<name>/judgements/<screen>.<judge>.json`, written on every change:

| Field | Meaning |
|---|---|
| `looks` | up to three `{ x, y, afterMs }`: where the judge pointed for 1, 2 and 3, in page pixels, and how long after the screen appeared |
| `looksSkipped` | the judge skipped the looks |
| `marks` | `{ n, x, y, w, h, words, weight, afterMs, scrollY }`: a box in page pixels, the judge's words, and `small`, `wrong` or `hurts` |
| `done` | the judge said nothing else is wrong here |

`sets/<name>/screens/<screen>.<judge>.json`, written when a screen is finished: the screen as plain data (`snapshot.js`).
For every element, in tree order, it holds its tag, parent, box, own words, classes, the line it was written on and
45 style values. It also records the window, the browser, and the app's commit with the number of changed files. A
mark is tied to elements by comparing boxes, so a mark leads to source lines.

The judge is `owner` unless the address says otherwise: `/__judge/?judge=someone`.

## Missing so far

- Marks made while judging follow the window's scroll. A site that scrolls inside a box of its own (Sam Limby's does)
  leaves them behind. The review page's scenes follow the things themselves; the judging page does not yet.

- It does not score plumber against the marks.
- It judges one state of each screen. A menu opened with Space can be marked, but the saved screen is the page as it
  was when the screen was finished.
- It keeps no picture of the screen, only its data.
- It has no pairs (two versions of a screen, which is better).
