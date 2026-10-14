# Verify writes result

All required checks passed. CraftingAttention and AlgoRecall each performed one real overlay Write in the final four-app run. MetalUI and Kamui had no eligible exact edit on the sampled pages; no write was fabricated.

Run: `plumb-verify-11xqLR`. All four apps used the same frozen Plumb build.

| App | Result | Sampled | Write | Write to current reading, ms | Original unchanged |
| --- | --- | ---: | --- | ---: | --- |
| metalui | passed | 450 | INFO: no single fitting token with an exact edit | — | yes |
| kamui | passed | 113 | INFO: no single fitting token with an exact edit | — | yes |
| craftingattention | passed | 150 | `duration-150` → `duration-quick` | 17912.22 | yes |
| algorecall | passed | 150 | `font-mono` → `font-numeric` | 48914.28 | yes |

## Writes

- **craftingattention:** `src/components/home/LandingPage.tsx:179:143`, `duration-150` → `duration-quick`. One overlay POST returned 200. The edited file matched the exact replacement byte-for-byte; the current reading matched the written file hash and omitted the old site. CLI site count: 1 before, 0 after. Preview and source-computed value: `0.15s`.
- **algorecall:** `src/pages/home/figure/laminate.tsx:192:26`, `font-mono` → `font-numeric`. One overlay POST returned 200. The edited file matched the exact replacement byte-for-byte; the current reading matched the written file hash and omitted the old site. CLI site count: 1 before, 0 after. Preview and source-computed value: `"JetBrains Mono Variable", ui-monospace, monospace`.

Both available writes were token renames with equal computed values. Candidate search preferred a changing computed value; none of the eligible single-token edits changed it. Token and Write controls were activated through the rendered overlay with keyboard controls, without a direct Node apply request.

After each server stopped, only the exact proven edit was restored. The existing whole-copy fingerprint guard then passed. Primary and linked original repositories retained identical input hashes and HEADs. All copies and the frozen tool were removed.

AlgoRecall disables HMR in its own configuration. The frozen verification host enables HMR and records that adaptation; the original configuration is untouched. CLI JSON is streamed into scratch (AlgoRecall produced about 243 MB). Its transient browser 503 busy read recovered, with ready health below 100 ms at the original response and retry; full evidence is retained.

## Checks

- `npm run build`: passed.
- `npm run typecheck`: passed.
- `node bench/apps/verify.mjs`: passed, all four apps in one run, exit 0.
- `node --test e2e/verify-frozen.test.mjs`: passed, 1 integration test.
- `node --test e2e/verify-writes.test.mjs`: passed, 1 integration test covering the complete write slice and a recovered browser busy response.
- Independent report validation: passed; shared run/tool, source hashes, current values, CLI site removal, original integrity and cleanup verified.

Chromium: `/Users/vijaysingh/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.

[Four-app report](../verification/overlay-e2e.md) · [Independent validation](../verification/verify-writes.validation.json) · [Run log](../verification/verify-writes.run.log)

## Scope exception

Initial build/typecheck commands inherited npm’s default logging and created four debug logs under `/Users/vijaysingh/.npm/_logs`, violating the output-path restriction. Their exact paths are recorded in the validation JSON. Those external files were left untouched; subsequent npm runs used cache and log paths inside Plumb.

No app repository was written. No commits, pushes, worktrees or global installs were performed. `overlay/`, `e2e/dock.test.mjs` and `site/` were not modified by this work.
