# Site replay result — 2026-10-13

Finished the explicit Vite demo opt-in, production source stamping/client bundle, real-server recorder, static replay transport, and development guard. Fixed the broken middleware-client import with a variable dynamic import marked `@vite-ignore`. Re-recorded against the current six-drift hero. Existing Tailwind safelist covers the intended fixes and the spacing/radius alternatives; no UI or reading-card files were edited.

The recording contains all stamped openings in the hero and its three owner files, plus every offered before/intermediate/after class combination per element. Applying a fix changes matching live DOM classes, updates the in-memory source hash/revision, returns the server-shaped apply response, and emits `plumb:demo-applied`. Re-reading selects the recorded fixed state. Writes are serialized; stale hashes, unknown edits, overlapping edits, and unsupported combinations are refused. Malformed JSON objects are refused without throwing. Unrecorded reads use captured real-server fallbacks.

Verification output:

```text
$ npm run build
> @unlocalhosted/plumb@0.1.0 build
> tsc -p tsconfig.json
[exit 0]

$ node site/scripts/record-replay.mjs
Recorded site state 1: src/hero/DriftedCard.jsx:24:5
... [states 2–20 omitted]
Recorded site state 21: src/hero/DriftedCard.jsx:41:9
Replay saved: 77 stamped hosts/owners, 21 site states, 233 distinct answers.

$ npx vite build --config site/vite.config.mjs
✓ 498 modules transformed.
✓ built in 473ms
[exit 0; dependency "use client" directive warnings]

$ node --check e2e/site-replay.test.mjs
$ node --check site/src/hero/replay.js
$ git diff --check -- src/hosts/vite.ts src/hosts/source-stamping.ts
[exit 0]

Source unchanged after dev and three static orders: true

Additional production build without demo, into a temporary directory:
Ordinary production build: no Plumb stamps, client, or injected overlay entry.

$ npm --prefix site run build -- --logLevel error
> build
> vite build --logLevel error
[exit 0; final build after replay validation change]
```

The requested standalone e2e is `e2e/site-replay.test.mjs`. It builds the static site, serves `site/dist` through a plain HTTP file server, starts a separate dev server on an ephemeral port, drives real overlay choices/writes, and checks all six classes removed, source bytes unchanged, rendered CSS, each corrected element on-scale, six emitted events, no static overlay API traffic, and no page errors. It uses only integration/e2e coverage.

The standalone test could not get past browser launch in this restricted shell:

```text
$ node --test e2e/site-replay.test.mjs
browserType.launch: Executable doesn't exist at .../chromium_headless_shell-1248/...

$ PLUMB_CHROMIUM='<installed Chromium headless shell>' node --test e2e/site-replay.test.mjs
browserType.launch: Target page, context or browser has been closed
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer.38910: Permission denied (1100)
tests 1
pass 0
fail 1
```

Instead, the connected browser's Playwright locator surface verified the same visible feature through isolated dev `127.0.0.1:4337` and static Vite preview `127.0.0.1:4338` (the preview serves the built output without Plumb endpoints). The owner's port 4327 was not used. Each run wrote all six fixes through the actual overlay, closed/reopened each of the four corrected elements, and checked the on-scale verdict. Observed final classes:

```text
Dev guard, then static forward [0,1,2,3,4,5]:
card:   flex w-full flex-col gap-4 rounded-lg bg-card p-6 shadow-lift
header: flex items-center gap-3
name:   text-base font-medium
button: inline-flex h-8 items-center rounded-sm bg-primary px-3 font-mono text-xs uppercase text-primary-foreground

Static reverse [5,4,3,2,1,0], alternate choices:
card:   flex w-full flex-col gap-4 rounded-lg bg-card p-4 shadow-lift
header: flex items-center gap-4
name:   text-base font-medium
button: inline-flex h-8 items-center rounded-md bg-primary px-4 font-mono text-xs uppercase text-primary-foreground

Static mixed [1,4,2,0,5,3]:
card:   flex w-full flex-col gap-4 rounded-lg bg-card p-6 shadow-lift
header: flex items-center gap-3
name:   text-base font-medium
button: inline-flex h-8 items-center rounded-sm bg-primary px-3 font-mono text-xs uppercase text-primary-foreground
```

Not exact / remaining validation:

- Standalone Playwright pass, event-count assertion, and zero-API-traffic assertion remain unverified because launch is blocked. No full-suite pass is claimed. The connected-browser checks are distinct evidence.
- Raw CDP inspection of `window.__plumb` was rejected by automatic approval review. The visible real overlay mounted and read/wrote successfully, but that runtime global was not directly inspected. The e2e includes the explicit global assertion.
- Production React lacks development debug-owner metadata; source stamps remain exact, but component labels/owner-chain detail can differ.
- The recorded server offers `text-xs--line-height` beside `text-base`. The recording preserves this engine behavior; only `text-base` is verified as the intended type fix. This core-engine issue is outside this brief.
- Spacing is rem-based. The connected browser's larger default root font rendered `p-6` as 27px and `gap-3`/`px-3` as 13.5px. The e2e compares against the actual spacing unit rather than assuming a 16px root font.
- The site's pre-existing UI and parallel overlay/reading-card work remain outside this change.
- A coherent replay-only commit was attempted, but the filesystem policy makes `.git` read-only. Staging failed with `Unable to create .../.git/index.lock: Operation not permitted`; nothing was staged or committed.
