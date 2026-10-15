# CLI progress result

Implemented the brief with a dependency-free emitter beside `profileDuration`.
CLI analysis scopes subscribe to existing phase names; library, serve and watch
runs have no display listener. This covers bare/check, init, baseline, doctor,
decisions, habits, imitation, ledger and the other commands using the pipeline,
including explain and local snippet analysis.

The one-line stderr display waits 300 ms, uses real file/declaration counts,
adds elapsed seconds from 3 s, and clears before stdout or diagnostics. A small
Node worker writes directly to stderr so the clock keeps advancing through
synchronous parsing and judging. Ctrl+C clears the line and exits 130. Terminal
width (including wide characters), resize and `NO_COLOR` are handled. Machine
formats, any set `CI`, piped stderr and serve/watch stay quiet. The cold-cache
notice uses the selected cache directory and remains after the live line clears.

Wording and test-only threshold overrides are recorded in `docs/MESSAGES.md`.
No dependencies or unit tests were added. `overlay/src`, `site/src` and the
owner's Hero edit were left untouched and unstaged.

## Verification

- Six real-CLI PTY E2E checks pass: ordered phases and moving counts, cleared final
  screen, stdout parity, quiet machine/CI/piped modes, cold/warm notice, delay,
  width/color, synchronous clock, Ctrl+C, errors and nested init/doctor calls.
- The Python helper uses standard-library POSIX PTY APIs available on macOS/Linux;
  it was exercised locally on macOS. Stdout remains a pipe while stderr owns a
  controlling PTY.
- `decisions` stdout is compared byte-for-byte. Human check reports are compared
  after masking their existing variable elapsed-time field; all remaining bytes
  match. Actual AlgoRecall cold/warm reports also match with only that field masked.
- `npm run typecheck`: passed.
- Full required Chromium `npm test`: **passed, exit 0**, including all three modes:
  main suite 424 passed / 1 expected skip; polling 25 passed / 1 expected skip;
  watcher-disabled 23 passed / 3 expected skips. Zero failures in every mode.
  Complete local log: `/tmp/plumber-cli-progress-final-gate.log`.

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

The first full attempt exposed an existing packaging gate failure:
`Repository README link LICENSE must use an absolute repository URL`.
The one-line README link correction is its own commit, `6250ce4`, with the required
co-author trailer. The required full command was restarted after that correction.
The next full attempt passed 423 checks with one expected skip, but its npm
consumer install timed out (`spawnSync npm ETIMEDOUT`). An isolated retry then
exposed the packed-consumer check's stale `./dist/cli.js` expectation:
the installed metadata contains `dist/cli.js`, matching `package.json`.
That one-line integration assertion correction is separate commit `fd12790`;
its isolated real-package install/CLI/import check passes (1/1). The final full
command is rerun after both prerequisite corrections.
One subsequent full run passed 423 checks with one expected skip but hit the
existing HTTP health budget (`health blocked 204.79ms with 300 reads outstanding`)
while a separate Xcode test process was active. Its unchanged isolated retry
passed all four checks, with a slowest health probe of 44.08 ms. No timing budget
or production behavior was changed to bypass this assertion.
The final complete run passed that same health test unchanged, with a slowest
probe of 40.86 ms, and then passed both additional watcher modes.

## Recorded cold AlgoRecall terminal transcript

Recorded 2026-10-15T08:49:27.295616+00:00, Node 25.9.0, 140 columns, production timing
thresholds (300 ms / 5 s), `NO_COLOR=1`, `CI` unset. This current checkout contains
3,534 source files and 302,640 declarations, larger than the brief's earlier
snapshot. Collection counts 3,527 JS/TS source files; the other seven are CSS.
AlgoRecall was read-only, with all cache writes redirected to the temporary path
below. Its Git status was identical before and after both runs.

The capture overlapped the full integration suite: timings document this run,
not an isolated performance benchmark. Cold wall time: 39.789 s;
reported analysis: 27,998.6 ms. Warm wall time: 2.067 s;
reported check: 1,793.9 ms. Both returned exit 1 for existing findings.

Equivalent command (the PTY helper captured stdout separately):

```sh
PLUMBER_CACHE_DIR=/tmp/plumb-progress-__reakr7/cache NO_COLOR=1 \
  node dist/cli.js --root ../algorecall --config plumber.config.ts \
  > /tmp/plumb-progress-__reakr7/cold.stdout.txt
```

All stderr redraws are expanded below for review. In the terminal they reused
one row; only the cache notice survived the final clear. No status was written
to stdout.

```text
Reading your project…
Reading your project: 3,534 files…
Reading styles…
Reading styles: 0 of 3,527 files…
Reading styles: 32 of 3,527 files…
Reading styles: 64 of 3,527 files…
Reading styles: 96 of 3,527 files…
Reading styles: 128 of 3,527 files…
Reading styles: 160 of 3,527 files…
Reading styles: 192 of 3,527 files…
Reading styles: 224 of 3,527 files…
Reading styles: 256 of 3,527 files…
Reading styles: 288 of 3,527 files…
Reading styles: 320 of 3,527 files…
Reading styles: 352 of 3,527 files…
Reading styles: 384 of 3,527 files…
Reading styles: 416 of 3,527 files… 3s
Reading styles: 448 of 3,527 files… 3s
Reading styles: 480 of 3,527 files… 3s
Reading styles: 512 of 3,527 files… 3s
Reading styles: 544 of 3,527 files… 3s
Reading styles: 576 of 3,527 files… 3s
Reading styles: 608 of 3,527 files… 3s
Reading styles: 640 of 3,527 files… 3s
Reading styles: 672 of 3,527 files… 3s
Reading styles: 704 of 3,527 files… 3s
Reading styles: 736 of 3,527 files… 3s
Reading styles: 768 of 3,527 files… 3s
Reading styles: 800 of 3,527 files… 3s
Reading styles: 832 of 3,527 files… 3s
Reading styles: 864 of 3,527 files… 3s
Reading styles: 896 of 3,527 files… 3s
Reading styles: 928 of 3,527 files… 3s
Reading styles: 960 of 3,527 files… 3s
Reading styles: 992 of 3,527 files… 3s
Reading styles: 1,024 of 3,527 files… 3s
Reading styles: 1,056 of 3,527 files… 3s
Reading styles: 1,088 of 3,527 files… 3s
Reading styles: 1,120 of 3,527 files… 3s
Reading styles: 1,152 of 3,527 files… 3s
Reading styles: 1,184 of 3,527 files… 3s
Reading styles: 1,216 of 3,527 files… 3s
Reading styles: 1,248 of 3,527 files… 3s
Reading styles: 1,280 of 3,527 files… 3s
Reading styles: 1,312 of 3,527 files… 3s
Reading styles: 1,344 of 3,527 files… 4s
Reading styles: 1,376 of 3,527 files… 4s
Reading styles: 1,408 of 3,527 files… 4s
Reading styles: 1,440 of 3,527 files… 4s
Reading styles: 1,472 of 3,527 files… 4s
Reading styles: 1,504 of 3,527 files… 4s
Reading styles: 1,536 of 3,527 files… 4s
Reading styles: 1,568 of 3,527 files… 4s
Reading styles: 1,600 of 3,527 files… 4s
Reading styles: 1,632 of 3,527 files… 4s
Reading styles: 1,664 of 3,527 files… 4s
Reading styles: 1,696 of 3,527 files… 4s
Reading styles: 1,728 of 3,527 files… 4s
Reading styles: 1,760 of 3,527 files… 4s
Reading styles: 1,792 of 3,527 files… 4s
Reading styles: 1,824 of 3,527 files… 4s
First run builds a cache in ../../../../tmp/plumb-progress-__reakr7/cache; later runs are faster.
Reading styles: 1,824 of 3,527 files… 5s
Reading styles: 1,856 of 3,527 files… 5s
Reading styles: 1,888 of 3,527 files… 5s
Reading styles: 1,920 of 3,527 files… 5s
Reading styles: 1,952 of 3,527 files… 5s
Reading styles: 1,984 of 3,527 files… 5s
Reading styles: 2,016 of 3,527 files… 5s
Reading styles: 2,048 of 3,527 files… 5s
Reading styles: 2,080 of 3,527 files… 5s
Reading styles: 2,112 of 3,527 files… 5s
Reading styles: 2,144 of 3,527 files… 5s
Reading styles: 2,176 of 3,527 files… 5s
Reading styles: 2,208 of 3,527 files… 5s
Reading styles: 2,240 of 3,527 files… 5s
Reading styles: 2,272 of 3,527 files… 5s
Reading styles: 2,304 of 3,527 files… 5s
Reading styles: 2,336 of 3,527 files… 5s
Reading styles: 2,368 of 3,527 files… 5s
Reading styles: 2,400 of 3,527 files… 5s
Reading styles: 2,432 of 3,527 files… 5s
Reading styles: 2,464 of 3,527 files… 5s
Reading styles: 2,496 of 3,527 files… 5s
Reading styles: 2,528 of 3,527 files… 5s
Reading styles: 2,560 of 3,527 files… 5s
Reading styles: 2,592 of 3,527 files… 5s
Reading styles: 2,624 of 3,527 files… 5s
Reading styles: 2,656 of 3,527 files… 5s
Reading styles: 2,688 of 3,527 files… 5s
Reading styles: 2,720 of 3,527 files… 5s
Reading styles: 2,752 of 3,527 files… 5s
Reading styles: 2,784 of 3,527 files… 5s
Reading styles: 2,816 of 3,527 files… 5s
Reading styles: 2,816 of 3,527 files… 6s
Reading styles: 2,848 of 3,527 files… 6s
Reading styles: 2,880 of 3,527 files… 6s
Reading styles: 2,912 of 3,527 files… 6s
Reading styles: 2,944 of 3,527 files… 6s
Reading styles: 2,976 of 3,527 files… 6s
Reading styles: 3,008 of 3,527 files… 6s
Reading styles: 3,040 of 3,527 files… 6s
Reading styles: 3,072 of 3,527 files… 6s
Reading styles: 3,104 of 3,527 files… 6s
Reading styles: 3,136 of 3,527 files… 6s
Reading styles: 3,168 of 3,527 files… 6s
Reading styles: 3,200 of 3,527 files… 6s
Reading styles: 3,232 of 3,527 files… 6s
Reading styles: 3,264 of 3,527 files… 7s
Reading styles: 3,296 of 3,527 files… 7s
Reading styles: 3,328 of 3,527 files… 7s
Reading styles: 3,360 of 3,527 files… 7s
Reading styles: 3,392 of 3,527 files… 7s
Reading styles: 3,424 of 3,527 files… 7s
Reading styles: 3,456 of 3,527 files… 7s
Reading styles: 3,488 of 3,527 files… 7s
Reading styles: 3,520 of 3,527 files… 7s
Reading styles: 3,527 of 3,527 files… 7s
Reading styles: 3,527 of 3,527 files… 8s
Reading styles: 3,527 of 3,527 files… 9s
Reading styles: 3,527 of 3,527 files… 10s
Reading styles: 3,527 of 3,527 files… 11s
Compiling Tailwind from src/index.css… 11s
Compiling Tailwind from src/index.css… 12s
Reading styles… 12s
Reading styles… 13s
Reading styles… 14s
Reading styles… 15s
Reading styles… 16s
Reading styles… 17s
Checking 302,640 values against your tokens… 17s
Checking 302,640 values against your tokens… 18s
Checking 302,640 values against your tokens… 19s
Checking 302,640 values against your tokens… 20s
Checking 302,640 values against your tokens… 21s
Checking 302,640 values against your tokens… 22s
Checking 302,640 values against your tokens… 23s
Matching components… 23s
Matching components… 24s
Matching components… 25s
Matching components… 26s
Matching components… 27s
Matching components… 28s
Matching components… 29s
Matching components… 30s
Matching components… 31s
Matching components… 32s
Matching components… 33s
Matching components… 34s
Matching components… 35s
Matching components… 36s
Matching components… 37s
Matching components… 38s
Matching components… 39s
[status line erased before report; exit 1]
```

Report stdout excerpt (finding bodies omitted):

```text
React Plumber 0.1.0  /Users/vijaysingh/unlocalhosted/algorecall  tailwind 4.2.2  theme src/index.css
files 2607 tsx, 0 jsx, 7 css, 920 other  27998.6ms
[findings omitted]
type        22,250 of 76,739 use your tokens (29%)  54,489 don't
motion          76 of  1,795 use your tokens (4%)   1,719 don't
elevation    2,809 of  5,473 use your tokens (51%)  2,664 don't
z               29 of    349 use your tokens (8%)   320 don't
inline      6850 of 14,848 style attributes have literal values
unused      29 colour tokens, 1 spacing token, 3 z tokens are never used in your source; if other apps use them, set decisions.<family>.exported
runtime     15,612 styles in 1,639 files are computed at runtime and can't be checked (--verbose lists them)
1,174 findings: 769 values off your tokens, 36 broken styles, 367 component overrides, 2 config gaps

config  type: Type roles aren't configured; type values are checked individually. Review decisions.type.from for your type tokens (for example, 'theme:--text-*').

ledger  No ledger. Run plumber baseline to record current debt and accept the current decisions.
```

Warm stderr's final screen was empty and contained zero cache notices. Cold
stderr's final screen contained exactly the single cache notice. Raw captures,
stdout reports and metadata are in `/tmp/plumb-progress-__reakr7` (local verification artifacts).

## The npx download gap

The package cannot print before npm has downloaded it and launched its binary.
That follows from npm's documented sequence of installing missing requested
packages into npm's cache and then executing the command. There is no fix inside
Plumber for this earlier gap. Installing the package locally beforehand avoids
that first-use download. See [npm exec documentation](https://docs.npmjs.com/cli/v11/commands/npm-exec/).
