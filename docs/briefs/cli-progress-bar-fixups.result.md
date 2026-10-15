# CLI progress bar fixups result

Two fixes: source walking retains `Reading styles`; the second file pass is
`Tracing computed classes`. Each label owns one counter. Ledger no longer carries
cache work: validation, serialization, disk writing and atomic publication have
separate measured steps. Stylesheet module tracing also exposes its visited-module
count; the previous label hid a 3.023 s gap before lowering began.

## Measurement and cause

Captured 2026-10-15T10:48:03.582Z, Node v25.9.0, 100-column controlling PTY on stderr,
stdout piped separately, production 300 ms / 5 s thresholds, UTF-8, CI and NO_COLOR
unset, PLUMBER_PROFILE=1. Each capture used a fresh PLUMBER_CACHE_DIR outside the
project, reused only for its warm check. AlgoRecall Git status matched before/after;
no downstream files were written. A sibling checkout's full suite ran concurrently,
so these are observed durations under that load, not a speed comparison.

Baseline reproduced the count reset in the real CLI PTY test:

`Reading styles count decreased: … 19% Reading styles: 0 of 66 files`

Baseline cold AlgoRecall took 28.284 s. Ledger entered at 19.568 s; its profiler
mark was 0.862 s. CheckCache.save ran from 20.462 to 27.949 s: **7.488 s** of hidden
cache work. The observer's temporary I/O probes separated reading and validating
source/component/module receipts, input hashing/stamps, V8 serialization/writing,
JSON serialization/writing, and final metadata/renames. JSON preparation took
0.982 s and its disk write 0.544 s in that baseline; they therefore receive 3% and
2% respectively. Under later concurrent load the combined step reached 3.008 s,
which justified exposing both boundaries.

Weights reserve 27% for cache work, following that measured 7.488 / 28.284 ratio.
The earlier pipeline receives the remaining 73%, distributed from adjacent phase
entries rather than overlapping aggregate profiler marks. Optional skipped work
is granted on the next real step; no synthetic clock-driven percentages.

Final cold wall: **30.367 s**. Warm wall: **1.491 s**.
Both exit 1 for existing findings. Cold/warm stdout and baseline/fixed stdout match
after masking only the existing elapsed field. Final ledger profiler mark:
0.914 s.

| Non-overlapping measured step | Bar interval | Final seconds |
| --- | --- | ---: |
| Cache admission, config, inventory | 0–7% | 2.259 |
| Source walk | 7–22% | 3.807 |
| Computed-class tracing | 22–34% | 3.167 |
| Tailwind load / compile | 34–37% | 1.083 |
| Stylesheet module imports | 37–46% | 2.507 |
| Stylesheet graph | 46–47% | 0.008 |
| Stylesheet lowering / class existence | 47–48% | 0.628 |
| Declaration preparation | 48–49% | 0.329 |
| Token decisions | 48–49% | 0.027 |
| Token setup | 49% | 0.039 |
| Dead variables | 49–50% | 0.489 |
| Token rule families | 50–58% | 2.158 |
| Unused tokens | 58–59% | 0.285 |
| Component discovery | 59–69% | 2.962 |
| Component styles | 69–70% | 0.163 |
| Habits / copies / report | 70% | 0.239 |
| Ledger / final messages | 70–73% | 0.974 |
| Project inventory / source hashes | 73–76% | 0.886 |
| Source receipt validation | 76–79% | 0.970 |
| Component receipt validation | 79–81% | 0.545 |
| Module receipt / resolution validation | 81–86% | 1.482 |
| File identity validation | 86–90% | 0.929 |
| Analysis serialization / write | 90–94% | 1.204 |
| Report JSON serialization | 94–97% | 1.658 |
| Report JSON write | 97–99% | 1.123 |
| Cache metadata / atomic publication | 99% | <0.1 |

The longest visible interval with unchanged percentage, label and count, ignoring
clock-only redraws, was **1.874 s** (initial project reading).
Every cache-tail interval was below 2 s. The 99% publication step lasted less than
0.1 s. No label's count decreased, percentages never decreased, 100% appeared once,
and all frames fit 100 columns. Counts complete between redraws in some short
steps; the worker may coalesce those frames.

## Verification

- Real CLI PTY regression failed before the fix, then passed. Every counted label
  is checked for non-decreasing counts, alongside existing percent/width/clear checks.
- Added a real cold/warm complete-result-cache PTY check. It requires validation,
  analysis serialization, report serialization, report write and completion in
  order; a small preload slows actual boundaries to make sampling deterministic.
  No test replaces analysis or emits fake progress.
- Focused progress + CLI + documented-command suites: **53 passed, 0 failed**.
  Build/type checking passed. No unit tests added.
- Full `npm test`: **passed, exit 0**. Main: 425 passed / 1 expected skip.
  Polling: 25 passed / 1 expected skip. Watcher-disabled: 23 passed / 3 expected
  skips. Zero failures across all three modes. Log:
  `/tmp/plumb-progress-fixups-full.log`.

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

Artifacts: `/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-progress-fixups-verified-XPOLGR`. Baseline with temporary I/O probes:
`/var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-progress-fixups-G8FyfL`. Both contain observer.mjs, capture.mjs, cold/warm stdout,
PTY captures and profile events/marks. The final observer uses the original
result's onProgress + performance-measure capture, with a worker writeSync tap to
record actual redraw timestamps. The tap writes only to the external proof folder.
The observer is temporary and is not shipped.

Capture command (the proof folder and cache were new for this invocation):

```sh
node /var/folders/t_/j83k01rs3l1fhn2rkj64lzd80000gn/T/plumb-progress-fixups-verified-XPOLGR/capture.mjs
```

The capture invokes the equivalent CLI below inside the helper's 100-column PTY;
set PLUMBER_BAR_MARKS, PLUMBER_BAR_FRAMES and PLUMBER_BAR_STARTED for the observer,
and point PLUMBER_CACHE_DIR at a new empty directory to repeat a cold measurement.

```sh
PLUMBER_PROFILE=1 LC_ALL=en_US.UTF-8 PLUMBER_CACHE_DIR=<fresh-cache> \
node --import <proof-folder>/observer.mjs dist/cli.js \
  --root ../algorecall --config plumber.config.ts > cold.stdout.txt
```

## Recorded cold AlgoRecall transcript

Actual semantic redraws: wall seconds since helper launch, percent, label/count.
ANSI styling and bar cells omitted; clock-only repeats omitted. Times include
process startup. First-run notice appeared once at 5 s; it was the only text left
on stderr after the live line cleared.

```text
  0.427s    0%  Reading your project
  2.301s    0%  Reading your project: 3,534 files
  2.379s    7%  Reading styles: 0 of 3,527 files
  2.642s    7%  Reading styles: 32 of 3,527 files
  2.734s    7%  Reading styles: 64 of 3,527 files
  2.805s    7%  Reading styles: 128 of 3,527 files
  2.876s    7%  Reading styles: 160 of 3,527 files
  2.954s    7%  Reading styles: 192 of 3,527 files
  3.078s    8%  Reading styles: 256 of 3,527 files
  3.161s    8%  Reading styles: 288 of 3,527 files
  3.231s    8%  Reading styles: 320 of 3,527 files
  3.302s    8%  Reading styles: 352 of 3,527 files
  3.373s    8%  Reading styles: 384 of 3,527 files
  3.444s    8%  Reading styles: 416 of 3,527 files
  3.515s    8%  Reading styles: 448 of 3,527 files
  3.586s    9%  Reading styles: 512 of 3,527 files
  3.657s    9%  Reading styles: 576 of 3,527 files
  3.727s    9%  Reading styles: 672 of 3,527 files
  3.799s   10%  Reading styles: 768 of 3,527 files
  3.869s   10%  Reading styles: 896 of 3,527 files
  3.941s   11%  Reading styles: 960 of 3,527 files
  4.012s   11%  Reading styles: 1,024 of 3,527 files
  4.083s   11%  Reading styles: 1,088 of 3,527 files
  4.154s   12%  Reading styles: 1,248 of 3,527 files
  4.224s   12%  Reading styles: 1,344 of 3,527 files
  4.294s   13%  Reading styles: 1,472 of 3,527 files
  4.365s   13%  Reading styles: 1,568 of 3,527 files
  4.444s   13%  Reading styles: 1,600 of 3,527 files
  4.528s   14%  Reading styles: 1,664 of 3,527 files
  4.613s   14%  Reading styles: 1,728 of 3,527 files
  4.691s   14%  Reading styles: 1,760 of 3,527 files
  4.781s   14%  Reading styles: 1,856 of 3,527 files
  4.862s   15%  Reading styles: 1,920 of 3,527 files
  4.934s   15%  Reading styles: 2,016 of 3,527 files
  5.005s   15%  Reading styles: 2,112 of 3,527 files
  5.075s   16%  Reading styles: 2,304 of 3,527 files
  5.146s   17%  Reading styles: 2,432 of 3,527 files
  5.216s   17%  Reading styles: 2,528 of 3,527 files
  5.287s   18%  Reading styles: 2,624 of 3,527 files
  5.357s   18%  Reading styles: 2,688 of 3,527 files
  5.429s   18%  Reading styles: 2,784 of 3,527 files
  5.504s   19%  Reading styles: 2,880 of 3,527 files
  5.574s   19%  Reading styles: 2,944 of 3,527 files
  5.659s   19%  Reading styles: 3,040 of 3,527 files
  5.747s   20%  Reading styles: 3,136 of 3,527 files
  5.827s   20%  Reading styles: 3,200 of 3,527 files
  5.912s   20%  Reading styles: 3,232 of 3,527 files
  5.997s   21%  Reading styles: 3,296 of 3,527 files
  6.070s   21%  Reading styles: 3,392 of 3,527 files
  6.140s   22%  Tracing computed classes: 0 of 3,527 files
  6.251s   22%  Tracing computed classes: 32 of 3,527 files
  6.345s   22%  Tracing computed classes: 128 of 3,527 files
  6.422s   22%  Tracing computed classes: 160 of 3,527 files
  6.512s   22%  Tracing computed classes: 256 of 3,527 files
  6.620s   23%  Tracing computed classes: 352 of 3,527 files
  6.697s   23%  Tracing computed classes: 416 of 3,527 files
  6.775s   23%  Tracing computed classes: 448 of 3,527 files
  6.846s   23%  Tracing computed classes: 576 of 3,527 files
  6.917s   24%  Tracing computed classes: 704 of 3,527 files
  6.987s   24%  Tracing computed classes: 832 of 3,527 files
  7.058s   25%  Tracing computed classes: 960 of 3,527 files
  7.129s   25%  Tracing computed classes: 1,024 of 3,527 files
  7.199s   26%  Tracing computed classes: 1,184 of 3,527 files
  7.270s   26%  Tracing computed classes: 1,344 of 3,527 files
  7.341s   27%  Tracing computed classes: 1,504 of 3,527 files
  7.413s   27%  Tracing computed classes: 1,568 of 3,527 files
  7.483s   27%  Tracing computed classes: 1,664 of 3,527 files
  7.554s   28%  Tracing computed classes: 1,792 of 3,527 files
  7.625s   28%  Tracing computed classes: 1,888 of 3,527 files
  7.695s   28%  Tracing computed classes: 1,984 of 3,527 files
  7.767s   29%  Tracing computed classes: 2,112 of 3,527 files
  7.837s   29%  Tracing computed classes: 2,336 of 3,527 files
  7.908s   30%  Tracing computed classes: 2,432 of 3,527 files
  7.980s   30%  Tracing computed classes: 2,560 of 3,527 files
  8.051s   31%  Tracing computed classes: 2,688 of 3,527 files
  8.122s   31%  Tracing computed classes: 2,784 of 3,527 files
  8.205s   31%  Tracing computed classes: 2,880 of 3,527 files
  8.347s   31%  Tracing computed classes: 2,912 of 3,527 files
  8.417s   32%  Tracing computed classes: 3,008 of 3,527 files
  8.489s   32%  Tracing computed classes: 3,072 of 3,527 files
  8.559s   32%  Tracing computed classes: 3,200 of 3,527 files
  8.629s   33%  Tracing computed classes: 3,296 of 3,527 files
  8.699s   33%  Tracing computed classes: 3,456 of 3,527 files
  8.770s   33%  Tracing computed classes: 3,520 of 3,527 files
  8.841s   34%  Tracing computed classes: 3,527 of 3,527 files
  9.289s   34%  Compiling Tailwind from src/index.css
 10.371s   37%  Tracing stylesheet imports
 10.441s   37%  Tracing stylesheet imports: 448 modules
 10.511s   37%  Tracing stylesheet imports: 2,976 modules
 10.614s   37%  Tracing stylesheet imports: 3,520 modules
 10.685s   37%  Tracing stylesheet imports: 3,552 modules
 10.757s   37%  Tracing stylesheet imports: 3,648 modules
 10.834s   37%  Tracing stylesheet imports: 3,904 modules
 10.908s   37%  Tracing stylesheet imports: 4,160 modules
 10.978s   37%  Tracing stylesheet imports: 4,256 modules
 11.048s   37%  Tracing stylesheet imports: 4,416 modules
 11.129s   37%  Tracing stylesheet imports: 4,512 modules
 11.200s   37%  Tracing stylesheet imports: 4,704 modules
 11.273s   37%  Tracing stylesheet imports: 4,992 modules
 11.358s   37%  Tracing stylesheet imports: 5,312 modules
 11.435s   37%  Tracing stylesheet imports: 5,536 modules
 11.517s   37%  Tracing stylesheet imports: 5,568 modules
 11.591s   37%  Tracing stylesheet imports: 5,888 modules
 11.667s   37%  Tracing stylesheet imports: 6,176 modules
 11.744s   37%  Tracing stylesheet imports: 6,464 modules
 11.814s   37%  Tracing stylesheet imports: 6,816 modules
 11.891s   37%  Tracing stylesheet imports: 7,168 modules
 11.968s   37%  Tracing stylesheet imports: 7,424 modules
 12.042s   37%  Tracing stylesheet imports: 7,776 modules
 12.114s   37%  Tracing stylesheet imports: 8,192 modules
 12.187s   37%  Tracing stylesheet imports: 8,640 modules
 12.259s   37%  Tracing stylesheet imports: 9,088 modules
 12.333s   37%  Tracing stylesheet imports: 9,472 modules
 12.404s   37%  Tracing stylesheet imports: 9,824 modules
 12.474s   37%  Tracing stylesheet imports: 10,208 modules
 12.554s   37%  Tracing stylesheet imports: 10,592 modules
 12.625s   37%  Tracing stylesheet imports: 10,688 modules
 12.700s   37%  Tracing stylesheet imports: 10,816 modules
 12.774s   37%  Tracing stylesheet imports: 10,976 modules
 12.853s   37%  Tracing stylesheet imports: 11,200 modules
 12.937s   47%  Reading stylesheets: 0 of 15 stylesheets
 13.121s   47%  Reading stylesheets: 8 of 15 stylesheets
 13.335s   47%  Reading stylesheets: 10 of 15 stylesheets
 13.434s   48%  Reading stylesheets: 15 of 15 stylesheets
 13.515s   48%  Reading styles
 13.871s   49%  Checking 302,640 values against your tokens
 14.399s   50%  Checking values against your tokens
 14.504s   50%  Checking tokens: 0 of 7 rule families
 14.675s   51%  Checking tokens: 1 of 7 rule families
 15.346s   52%  Checking tokens: 2 of 7 rule families
 15.425s   53%  Checking tokens: 3 of 7 rule families
 16.317s   54%  Checking tokens: 4 of 7 rule families
 16.424s   55%  Checking tokens: 5 of 7 rule families
 16.495s   56%  Checking tokens: 6 of 7 rule families
 16.567s   58%  Checking unused tokens
 16.842s   59%  Matching components
 16.918s   59%  Matching components: 32 of 3,527 files
 16.994s   59%  Matching components: 96 of 3,527 files
 17.064s   59%  Matching components: 128 of 3,527 files
 17.135s   59%  Matching components: 160 of 3,527 files
 17.205s   59%  Matching components: 224 of 3,527 files
 17.276s   59%  Matching components: 288 of 3,527 files
 17.348s   59%  Matching components: 320 of 3,527 files
 17.418s   60%  Matching components: 384 of 3,527 files
 17.490s   60%  Matching components: 416 of 3,527 files
 17.561s   60%  Matching components: 480 of 3,527 files
 17.631s   60%  Matching components: 544 of 3,527 files
 17.702s   60%  Matching components: 672 of 3,527 files
 17.773s   61%  Matching components: 800 of 3,527 files
 17.843s   61%  Matching components: 928 of 3,527 files
 17.914s   61%  Matching components: 992 of 3,527 files
 17.985s   62%  Matching components: 1,120 of 3,527 files
 18.055s   62%  Matching components: 1,248 of 3,527 files
 18.125s   62%  Matching components: 1,408 of 3,527 files
 18.196s   63%  Matching components: 1,568 of 3,527 files
 18.267s   63%  Matching components: 1,696 of 3,527 files
 18.338s   63%  Matching components: 1,760 of 3,527 files
 18.408s   64%  Matching components: 1,856 of 3,527 files
 18.480s   64%  Matching components: 1,984 of 3,527 files
 18.550s   64%  Matching components: 2,112 of 3,527 files
 18.621s   65%  Matching components: 2,304 of 3,527 files
 18.692s   65%  Matching components: 2,400 of 3,527 files
 18.763s   66%  Matching components: 2,528 of 3,527 files
 18.833s   66%  Matching components: 2,624 of 3,527 files
 18.904s   66%  Matching components: 2,752 of 3,527 files
 18.975s   67%  Matching components: 2,880 of 3,527 files
 19.045s   67%  Matching components: 2,976 of 3,527 files
 19.116s   67%  Matching components: 3,040 of 3,527 files
 19.187s   67%  Matching components: 3,136 of 3,527 files
 19.257s   67%  Matching components: 3,168 of 3,527 files
 19.329s   68%  Matching components: 3,200 of 3,527 files
 19.473s   68%  Matching components: 3,232 of 3,527 files
 19.558s   68%  Matching components: 3,328 of 3,527 files
 19.683s   69%  Matching components: 3,527 of 3,527 files
 19.805s   69%  Checking component styles
 19.875s   69%  Checking component styles: 92,160 of 302,640 values
 19.947s   69%  Checking component styles: 264,960 of 302,640 values
 20.036s   70%  Checking habits and component copies
 20.249s   70%  Checking ledger
 21.243s   73%  Checking project files for cache
 22.068s   76%  Validating source cache
 23.038s   79%  Validating component cache
 23.583s   81%  Validating module cache
 25.065s   86%  Validating cache inputs
 25.139s   86%  Validating cache inputs: 160 of 12,081 files
 25.209s   86%  Validating cache inputs: 384 of 12,081 files
 25.280s   86%  Validating cache inputs: 512 of 12,081 files
 25.350s   86%  Validating cache inputs: 864 of 12,081 files
 25.422s   86%  Validating cache inputs: 1,120 of 12,081 files
 25.493s   86%  Validating cache inputs: 2,112 of 12,081 files
 25.564s   87%  Validating cache inputs: 3,168 of 12,081 files
 25.636s   87%  Validating cache inputs: 4,000 of 12,081 files
 25.706s   87%  Validating cache inputs: 5,760 of 12,081 files
 25.776s   88%  Validating cache inputs: 8,064 of 12,081 files
 25.846s   89%  Validating cache inputs: 10,304 of 12,081 files
 25.917s   89%  Validating cache inputs: 11,584 of 12,081 files
 25.994s   90%  Saving analysis cache
 27.259s   94%  Saving report cache
 28.858s   97%  Writing report cache
 29.978s   99%  Finishing cache
 30.040s  100%  Done
```
