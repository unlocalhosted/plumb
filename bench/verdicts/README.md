# Verdicts

Plumber's findings on real apps, each marked right, wrong or unsure by someone who read it against the app's source.
A run of the page check is compared with them, so a change to the engine shows at once what it fixed and what it
broke.

The judged set (`bench/judged`) measures the other half: what a person sees on a screen that plumber misses. Here it
is what plumber says that a person would not stand behind.

## A ledger

One file per app (`calcom.json`, `crafting-ui.json`, `algorecall.json`): the app's pinned commit, how it was set up and run, the pages, how deep each page
was read when it was judged, and one entry per judged place.

A place is a page, a check, a file and a line. Each entry keeps what plumber said, the verdict, why, when, and who
judged it. Private apps keep only those fields, never their source.

## Comparing a run

```bash
node bench/verdicts/compare.mjs calcom run-1.json run-2.json --queue calcom.queue.json
```

Each run file is the output of `plumber craft --json`. Only the pages in the run are compared. The report says, for
the judged places:

- **right and still said:** what should stay.
- **right and gone:** plumber stopped seeing something real. The command exits with 1.
- **wrong and still said:** open work.
- **wrong and gone:** fixed.
- **unsure:** counted apart, never scored.
- **not judged yet:** written to the queue.

A page read more than a tenth shallower than when it was judged is named first, because what is gone there may be
the run rather than the engine.

## Judging the queue

Give each queued entry a `verdict` (`right`, `wrong` or `unsure`) and a `why` in plain words, then:

```bash
node bench/verdicts/compare.mjs calcom --merge calcom.queue.json --by "who judged them"
```

Entries left without a verdict stay out. A place already judged keeps its verdict unless the new one differs.
