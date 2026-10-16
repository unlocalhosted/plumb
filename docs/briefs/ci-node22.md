# Brief: the last two CI failures (Node 22, ubuntu-latest)

CI run 38888362788 on 0d649d3: **Node 24 passed everything.** Node 22 failed two tests. Log excerpts:
docs/briefs/ci-node22.log (delete it in your final commit). The ordinary React 19 locate case now passes on Linux
on both Node versions, so the awaitWriteFinish fix from docs/briefs/ci-react19.result.md holds for the real case.

1. **e2e/locate.test.mjs "Vite React 19 (rapid watcher)"** (added in 0d649d3, polling at 1 ms) times out at
   hmrAssertions line 223 on Linux. Decide honestly: if it models something real users hit (any Linux/Docker/WSL
   setup with polling, e.g. CHOKIDAR_USEPOLLING), find a watcher configuration that survives it and say what users
   should configure (and whether the CLI/overlay docs should say so). If it only models an artificial timing that the
   ordinary Linux case already covers, remove it and say why in the result. No timeout bumps.
2. **e2e/cli-progress.test.mjs:176 "cold-cache notice appears once…"**: at line 192 the warm run is expected not to
   show `Reading styles:|Matching components|Checking tokens:` (i.e. the report cache hits), but on Node 22 Linux the
   second run re-read everything. Find out why the cache missed there: a cache key that differs between runs on Linux
   (mtime resolution, inode, tmp path realpath, Node 22 vs 24 differences in fs or hashing), or the test's own setup
   (the warm run starting before the cold run's cache publication finished). If the product cache genuinely misses on
   Linux/Node 22, that's a real bug: "later runs are faster" is printed to users. Fix the cause, with an e2e that would
   catch it. Try Node 22 locally (`npx -p node@22 node …` or nvm if present) since Node 24/25 pass.

Then the full suite locally once: `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`.
Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src, site/src,
or the unstaged site/src/hero/Hero.jsx. Don't push. Write docs/briefs/ci-node22.result.md and commit it.
