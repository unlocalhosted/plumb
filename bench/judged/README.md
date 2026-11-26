# The judged set

Real screens, marked by a person. It is what plumber's eye is measured against: what a person saw that plumber
missed, and what plumber flagged that a person would not flag.

## Judging

1. Start the app you want judged (its own dev server).
2. Start the judging server in front of it:

   ```bash
   ~/.claude/bin/dev-server "$PWD/bench/judged" node serve.mjs sets/first
   ```

3. Open `http://localhost:4420/__judge/`.

Each screen is the live app at a fixed width, with a layer over it.

- **First, three looks.** Click the first three things your eye went to, in order. Skip if you already know the
  screen.
- **Then, marks.** Drag a box round anything that looks wrong. Say what is off in your own words and pick how much
  it matters: Small, Wrong or Hurts. Click a mark to change it; Remove, Backspace or Delete takes it away.
- **Hold Space** to use the page under the layer: hover, click, open a menu. The wheel scrolls the page at any time.
- **Nothing else here** finishes the screen. From then on, whatever you did not mark counts as fine.

Everything is saved as you go. Closing the tab loses nothing, and opening it again returns to the first screen that
is not finished.

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
| `looks` | up to three `{ x, y, afterMs }`: where the eye went, in page pixels, and how long after the screen appeared |
| `looksSkipped` | the judge skipped the looks |
| `marks` | `{ n, x, y, w, h, words, weight, afterMs, scrollY }`: a box in page pixels, the judge's words, and `small`, `wrong` or `hurts` |
| `done` | the judge said nothing else is wrong here |

`sets/<name>/screens/<screen>.<judge>.json`, written when a screen is finished: the screen as plain data (`snapshot.js`).
For every element, in tree order, it holds its tag, parent, box, own words, classes, the line it was written on and
45 style values. It also records the window, the browser, and the app's commit with the number of changed files. A
mark is tied to elements by comparing boxes, so a mark leads to source lines.

The judge is `owner` unless the address says otherwise: `/__judge/?judge=someone`.

## Missing so far

- It does not score plumber against the marks.
- It judges one state of each screen. A menu opened with Space can be marked, but the saved screen is the page as it
  was when the screen was finished.
- It keeps no picture of the screen, only its data.
- It has no pairs (two versions of a screen, which is better).
