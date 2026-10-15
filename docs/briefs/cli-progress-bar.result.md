# CLI progress bar result

Layer 2 extends committed layer 1 (`aa749f1`): a determinate bar and step label
on stderr. No dependencies or unit tests added.

## Behavior

- TTY stderr only. Machine formats, any set CI value, piped stderr and serve/watch
  remain quiet. Production delay stays 300 ms; the cold-cache notice stays 5 s.
- Bar width: 24 cells at 80 columns, 30 at 100, 36 at 120 or wider. Labels truncate
  before the percentage/clock or bar; the last terminal cell stays empty. Below
  31 columns the bar shrinks because 24 cells plus a percentage cannot fit.
- `NO_COLOR` or a locale without UTF-8 selects `#`/`-` and `|`; otherwise `━`/`─`
  and `·`. Locale precedence: LC_ALL, LC_CTYPE, LANG. No spinner.
- Source walking and computed-class tracing count their own file passes;
  stylesheet progress counts unique graph files and embedded sheets; token checks
  count completed rule families; component discovery counts scanned caller files;
  ownership counts values matched against the component graph.
- Config/preset readers also discover components. Their counters are ignored
  until the real analysis step starts. A real-CLI regression covers that nesting.
- Uncounted work advances on the next step entry. Skipped/cache-hit steps receive
  their weight immediately on that entry. A confirmed whole-report hit grants
  99% before reading the cached report. Percentages never regress, including
  nested init/doctor analysis. Only completion of the outer CLI operation earns
  100%. Findings count as completed checks; errors and Ctrl+C never earn 100%.
- Regular redraws are limited to one per 70 ms (about 14 Hz). The final 100% frame
  renders immediately before clearing; both may follow the last regular frame
  sooner. Short phases can coalesce. The worker keeps elapsed seconds advancing
  during synchronous analysis. Report printing follows the clear.

## Calibration and weights

Measured 2026-10-15, Node v25.9.0, production timing, 100-column controlling PTY for
stderr, stdout piped separately, LC_ALL=en_US.UTF-8, NO_COLOR and CI unset,
PLUMBER_PROFILE=1. Each project used a fresh redirected PLUMBER_CACHE_DIR, reused
for its warm run. AlgoRecall and MetalUI Git status were identical before/after;
no downstream source/config/ledger writes. All three projects exited 1 for existing
or deliberately seeded findings.

| Project | Files / declarations | Cold wall | Warm wall |
| --- | ---: | ---: | ---: |
| algorecall | 3,534 / 302,640 | 24.992 s | 1.049 s |
| metalui | 291 / 15,526 | 4.712 s | 0.951 s |
| fixtures/spacing | 2 / 31 | 0.317 s | 0.197 s |

The brief's profiler numbers overlap. `collectMs` excludes parse/inline, so source
collection is collect + parse + inline; inline must not be added again to styles.
Provenance contains its family rules, dead-variable check and unused-token check.
Ownership contains component discovery plus ownership judging: adding
phase:components to phase:ownership would count discovery twice. Tailwind
load/compile run before stylesheet collection. Class-existence work runs between
stylesheet lowering and declaration preparation. Ledger runs after analyze; cache
validation/persistence also occupies wall time outside those profiler aggregates.

This table uses adjacent **actual phase-entry timestamps**, not sums of nested
profiler marks. First/last intervals also include process startup and report-output
overhead in the PTY wall measurement. Rounded milliseconds:

| Non-overlapping execution step | Bar interval | AlgoRecall ms | MetalUI ms | Small ms |
| --- | --- | ---: | ---: | ---: |
| Config, discovery, source inventory | 0–2% | 960 | 153 | 87 |
| Source walk, including inline styles | 2–19% | 3,592 | 296 | 11 |
| Computed-class tracing | 19–27% | 2,955 | 199 | 2 |
| Tailwind load and compile | 27–39% | 953 | 337 | 75 |
| Stylesheets, modules, class existence | 39–64% | 2,750 | 3,026 | 49 |
| Declarations and decisions | 64–65% | 277 | 122 | 11 |
| Value checks: dead variables, families, dead tokens | 65–83% | 2,624 | 236 | 13 |
| Component discovery | 83–93% | 3,083 | 211 | 2 |
| Component ownership checks | 93–98% | 125 | 8 | 0 |
| Habits, imitation, report, ledger, cache persistence | 98–100% | 7,670 | 124 | 66 |

Chosen grouped weights: source 25%, Tailwind/stylesheets 37%, value checks 18%,
components/ownership 15%, setup/preparation/finalization 5%. MetalUI's stylesheet
work and the small fixture's Tailwind startup justify moving weight from the
brief's rough source/value split toward styles. Within source, 17% belongs to the
initial file walk and 8% to computed-class tracing. Within values, dead variables
get 2%, seven rule families share 14%, and unused tokens get 2%.

Fixed work weights are not an ETA. Project-dependent uncounted work can hold a
percentage until it finishes. This AlgoRecall capture holds 99% during ledger/cache
persistence while elapsed seconds advance. No synthetic time-driven movement.
The small fixture finishes analysis below 300 ms and displays nothing, despite
process/PTY startup making its total cold wall slightly longer.

## Verification

- Six real-CLI PTY E2E checks pass: non-decreasing percentages, exactly one final
  100%, 80-column fit, 24–36 cell bars, cleared final screen, ASCII/Unicode forms,
  locale precedence, short-run suppression, synchronous clock, config-time nested
  discovery, full/partial caches, errors, Ctrl+C, init/doctor and quiet output modes.
- Human stdout matches piped stdout after masking its existing elapsed field.
  Fixture decisions stdout is byte-for-byte identical. Cold/warm AlgoRecall,
  MetalUI and spacing stdout also match piped stdout after masking only that
  field. Recorded large-project percentages are monotonic, finish at 100 and fit
  100 columns. Small-project stderr is empty.
- Focused E2E: 6/6 passed. Build/type checking passed via `npm run build`.
- First full Chromium run: 423 passed / 1 expected skip; the existing 1,000-file
  Session burst test failed its 50 ms health budget at 87.31 ms. Its unchanged
  isolated retry passed all four burst tests; the adjacent large-HTTP burst's
  slowest probe was 44.05 ms. No timing assertion or production behavior was
  changed to bypass the failure. Initial log: `/tmp/plumb-cli-progress-bar-full.log`;
  isolated retry: `/tmp/plumb-cli-progress-bar-burst-retry.log`.
- Second full run passed the Session burst unchanged, but Next Turbopack fixture
  deletion raced live cache writes (`ENOTEMPTY`). All Next assertions had passed;
  teardown then hung. Stopped that run's leftover Next server. Separate commit
  `1c34cfe` stops the owned Next process group before fixture deletion, with a
  bounded shutdown fallback. The unchanged webpack and Turbopack behavior checks
  both pass (2/2) with this cleanup fix. Logs:
  `/tmp/plumb-cli-progress-bar-final-gate.log`,
  `/tmp/plumb-cli-progress-bar-next-retry.log`.
- Required full Chromium `npm test` after prerequisite fix: **passed, exit 0**.
  Main: 424 passed / 1 expected skip. Polling: 25 passed / 1 expected skip.
  Watcher-disabled: 23 passed / 3 expected skips. Zero failures in all three modes.
  Complete log: `/tmp/plumb-cli-progress-bar-green-gate.log`.

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

No changes under overlay/src or site/src; owner's Hero.jsx remains unstaged.

## Recorded cold AlgoRecall transcript

Captured 2026-10-15T09:59:35.680Z. Every stderr redraw follows, ANSI dim styling
removed and in-place frames expanded onto separate lines. Live bar: 30 cells.
Only the single cache notice remains on the final terminal screen.

Equivalent command (a temporary observer also captured existing profile marks and
phase events):

```sh
PLUMBER_PROFILE=1 LC_ALL=en_US.UTF-8 \
PLUMBER_CACHE_DIR=/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-bar-proof-final-uz7YV4/algorecall-cache \
node dist/cli.js --root ../algorecall --config plumber.config.ts > cold.stdout.txt
```

```text
──────────────────────────────    0%  Reading your project
──────────────────────────────    0%  Reading your project: 3,534 files
──────────────────────────────    2%  Reading styles: 0 of 3,527 files
──────────────────────────────    2%  Reading styles: 32 of 3,527 files
──────────────────────────────    2%  Reading styles: 96 of 3,527 files
──────────────────────────────    2%  Reading styles: 128 of 3,527 files
──────────────────────────────    2%  Reading styles: 160 of 3,527 files
──────────────────────────────    2%  Reading styles: 192 of 3,527 files
──────────────────────────────    3%  Reading styles: 224 of 3,527 files
──────────────────────────────    3%  Reading styles: 320 of 3,527 files
──────────────────────────────    3%  Reading styles: 352 of 3,527 files
──────────────────────────────    3%  Reading styles: 384 of 3,527 files
━─────────────────────────────    4%  Reading styles: 416 of 3,527 files
━─────────────────────────────    4%  Reading styles: 448 of 3,527 files
━─────────────────────────────    4%  Reading styles: 544 of 3,527 files
━─────────────────────────────    4%  Reading styles: 576 of 3,527 files
━─────────────────────────────    5%  Reading styles: 672 of 3,527 files
━─────────────────────────────    5%  Reading styles: 768 of 3,527 files
━─────────────────────────────    6%  Reading styles: 896 of 3,527 files
━─────────────────────────────    6%  Reading styles: 960 of 3,527 files
━─────────────────────────────    6%  Reading styles: 1,024 of 3,527 files
━━────────────────────────────    7%  Reading styles: 1,120 of 3,527 files
━━────────────────────────────    8%  Reading styles: 1,248 of 3,527 files
━━────────────────────────────    8%  Reading styles: 1,344 of 3,527 files
━━────────────────────────────    9%  Reading styles: 1,472 of 3,527 files
━━────────────────────────────    9%  Reading styles: 1,568 of 3,527 files
━━────────────────────────────    9%  Reading styles: 1,600 of 3,527 files
━━━───────────────────────────   10%  Reading styles: 1,664 of 3,527 files · 3s
━━━───────────────────────────   10%  Reading styles: 1,696 of 3,527 files · 3s
━━━───────────────────────────   10%  Reading styles: 1,792 of 3,527 files · 3s
━━━───────────────────────────   10%  Reading styles: 1,856 of 3,527 files · 3s
━━━───────────────────────────   11%  Reading styles: 1,920 of 3,527 files · 3s
━━━───────────────────────────   11%  Reading styles: 2,016 of 3,527 files · 3s
━━━───────────────────────────   12%  Reading styles: 2,112 of 3,527 files · 3s
━━━───────────────────────────   12%  Reading styles: 2,240 of 3,527 files · 3s
━━━───────────────────────────   13%  Reading styles: 2,432 of 3,527 files · 3s
━━━━──────────────────────────   14%  Reading styles: 2,528 of 3,527 files · 3s
━━━━──────────────────────────   14%  Reading styles: 2,592 of 3,527 files · 3s
━━━━──────────────────────────   14%  Reading styles: 2,688 of 3,527 files · 3s
━━━━──────────────────────────   15%  Reading styles: 2,752 of 3,527 files · 3s
━━━━──────────────────────────   15%  Reading styles: 2,848 of 3,527 files · 3s
━━━━──────────────────────────   16%  Reading styles: 2,944 of 3,527 files · 4s
━━━━──────────────────────────   16%  Reading styles: 3,008 of 3,527 files · 4s
━━━━──────────────────────────   16%  Reading styles: 3,072 of 3,527 files · 4s
━━━━━─────────────────────────   17%  Reading styles: 3,168 of 3,527 files · 4s
━━━━━─────────────────────────   17%  Reading styles: 3,232 of 3,527 files · 4s
━━━━━─────────────────────────   17%  Reading styles: 3,296 of 3,527 files · 4s
━━━━━─────────────────────────   18%  Reading styles: 3,488 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 0 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 32 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 96 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 160 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 192 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 288 of 3,527 files · 4s
━━━━━─────────────────────────   19%  Reading styles: 320 of 3,527 files · 4s
First run builds a cache in ../../../../var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-bar-proof-final-uz7YV4/algorecall-cache; later runs are faster.
━━━━━─────────────────────────   19%  Reading styles: 384 of 3,527 files · 5s
━━━━━━────────────────────────   20%  Reading styles: 448 of 3,527 files · 5s
━━━━━━────────────────────────   20%  Reading styles: 544 of 3,527 files · 5s
━━━━━━────────────────────────   20%  Reading styles: 672 of 3,527 files · 5s
━━━━━━────────────────────────   20%  Reading styles: 800 of 3,527 files · 5s
━━━━━━────────────────────────   21%  Reading styles: 960 of 3,527 files · 5s
━━━━━━────────────────────────   21%  Reading styles: 1,024 of 3,527 files · 5s
━━━━━━────────────────────────   21%  Reading styles: 1,184 of 3,527 files · 5s
━━━━━━────────────────────────   21%  Reading styles: 1,312 of 3,527 files · 5s
━━━━━━────────────────────────   22%  Reading styles: 1,472 of 3,527 files · 5s
━━━━━━────────────────────────   22%  Reading styles: 1,536 of 3,527 files · 5s
━━━━━━────────────────────────   22%  Reading styles: 1,568 of 3,527 files · 5s
━━━━━━────────────────────────   22%  Reading styles: 1,664 of 3,527 files · 5s
━━━━━━────────────────────────   22%  Reading styles: 1,760 of 3,527 files · 5s
━━━━━━────────────────────────   23%  Reading styles: 1,856 of 3,527 files · 6s
━━━━━━────────────────────────   23%  Reading styles: 1,952 of 3,527 files · 6s
━━━━━━────────────────────────   23%  Reading styles: 2,048 of 3,527 files · 6s
━━━━━━────────────────────────   23%  Reading styles: 2,176 of 3,527 files · 6s
━━━━━━━───────────────────────   24%  Reading styles: 2,432 of 3,527 files · 6s
━━━━━━━───────────────────────   24%  Reading styles: 2,528 of 3,527 files · 6s
━━━━━━━───────────────────────   24%  Reading styles: 2,624 of 3,527 files · 6s
━━━━━━━───────────────────────   25%  Reading styles: 2,720 of 3,527 files · 6s
━━━━━━━───────────────────────   25%  Reading styles: 2,880 of 3,527 files · 6s
━━━━━━━───────────────────────   25%  Reading styles: 2,976 of 3,527 files · 6s
━━━━━━━───────────────────────   25%  Reading styles: 3,072 of 3,527 files · 6s
━━━━━━━───────────────────────   26%  Reading styles: 3,200 of 3,527 files · 6s
━━━━━━━───────────────────────   26%  Reading styles: 3,264 of 3,527 files · 6s
━━━━━━━───────────────────────   26%  Reading styles: 3,392 of 3,527 files · 6s
━━━━━━━───────────────────────   26%  Reading styles: 3,520 of 3,527 files · 7s
━━━━━━━━──────────────────────   27%  Reading styles: 3,527 of 3,527 files · 7s
━━━━━━━━──────────────────────   27%  Compiling Tailwind from src/index.css · 7s
━━━━━━━━──────────────────────   27%  Compiling Tailwind from src/index.css · 8s
━━━━━━━━━━━───────────────────   39%  Reading stylesheets · 8s
━━━━━━━━━━━───────────────────   39%  Reading stylesheets · 9s
━━━━━━━━━━━───────────────────   39%  Reading stylesheets · 10s
━━━━━━━━━━━───────────────────   39%  Reading stylesheets: 0 of 15 stylesheets · 10s
━━━━━━━━━━━━━━━───────────────   52%  Reading stylesheets: 8 of 15 stylesheets · 10s
━━━━━━━━━━━━━━━━──────────────   55%  Reading stylesheets: 10 of 15 stylesheets · 10s
━━━━━━━━━━━━━━━━━━━───────────   64%  Reading stylesheets: 15 of 15 stylesheets · 11s
━━━━━━━━━━━━━━━━━━━───────────   64%  Reading styles · 11s
━━━━━━━━━━━━━━━━━━━───────────   65%  Checking 302,640 values against your tokens · 11s
━━━━━━━━━━━━━━━━━━━━──────────   67%  Checking values against your tokens · 11s
━━━━━━━━━━━━━━━━━━━━──────────   67%  Checking tokens: 0 of 7 rule families · 11s
━━━━━━━━━━━━━━━━━━━━──────────   69%  Checking tokens: 1 of 7 rule families · 12s
━━━━━━━━━━━━━━━━━━━━━─────────   71%  Checking tokens: 2 of 7 rule families · 12s
━━━━━━━━━━━━━━━━━━━━━─────────   73%  Checking tokens: 3 of 7 rule families · 12s
━━━━━━━━━━━━━━━━━━━━━─────────   73%  Checking tokens: 3 of 7 rule families · 13s
━━━━━━━━━━━━━━━━━━━━━━────────   75%  Checking tokens: 4 of 7 rule families · 13s
━━━━━━━━━━━━━━━━━━━━━━━───────   77%  Checking tokens: 5 of 7 rule families · 13s
━━━━━━━━━━━━━━━━━━━━━━━───────   79%  Checking tokens: 6 of 7 rule families · 13s
━━━━━━━━━━━━━━━━━━━━━━━━──────   81%  Checking unused tokens · 13s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 32 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 96 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 160 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 192 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 288 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━──────   83%  Matching components: 352 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   84%  Matching components: 416 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   84%  Matching components: 480 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   84%  Matching components: 544 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   84%  Matching components: 672 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   85%  Matching components: 832 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   85%  Matching components: 992 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   86%  Matching components: 1,088 of 3,527 files · 14s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   86%  Matching components: 1,216 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━─────   86%  Matching components: 1,408 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   87%  Matching components: 1,568 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   87%  Matching components: 1,632 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   87%  Matching components: 1,696 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   87%  Matching components: 1,728 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   87%  Matching components: 1,760 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 1,792 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 1,824 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 1,856 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 1,888 of 3,527 files · 15s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 1,984 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   88%  Matching components: 2,112 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   89%  Matching components: 2,240 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   89%  Matching components: 2,368 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━────   89%  Matching components: 2,464 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   90%  Matching components: 2,560 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   90%  Matching components: 2,656 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   90%  Matching components: 2,752 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   91%  Matching components: 2,848 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   91%  Matching components: 2,944 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   91%  Matching components: 3,040 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   91%  Matching components: 3,168 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   92%  Matching components: 3,264 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   92%  Matching components: 3,424 of 3,527 files · 16s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   93%  Matching components: 3,527 of 3,527 files · 17s
━━━━━━━━━━━━━━━━━━━━━━━━━━━───   93%  Checking component styles · 17s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━──   95%  Checking component styles: 143,872 of 302,640 values · 17s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   98%  Checking habits and component copies · 17s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 17s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 18s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 19s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 20s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 21s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 22s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 23s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Checking ledger · 24s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%  Done · 24s
[bar erased before stdout report; exit 1]
```

Warm stderr, same terminal and production delay:

```text
──────────────────────────────    0%  Reading your project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─   99%  Reading cached report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%  Done
[bar erased before stdout report; exit 1]
```

Raw PTY captures, stdout, profile marks, phase timestamps, read-only Git status
evidence and parity checks remain locally in
`/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-bar-proof-final-uz7YV4`.
Initial calibration snapshots (before display implementation) remain at
`/tmp/plumb-bar-{algorecall,metalui,small}.json`.
