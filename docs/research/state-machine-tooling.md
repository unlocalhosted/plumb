# Deterministic tooling for implicit state machines

Research, 2026-11-07. No code changed. Versions and dates come from the npm registry (queried today). "UNVERIFIED" marks claims I could not confirm from a primary source.

Audit bug classes referred to below (from `docs/state-machines/overlay.md` and `engine.md`):
- **A. Scattered flags / string `#state`.** Modes encoded as booleans, with no transition table (fix panel #1, cleanup `#state` #2, Blueprint `#state` #7).
- **B. Stale async write.** A continuation writes state without checking the run is still current (cleanup `reading` overwritten when the read lands; `#seq` not invalidated by `close()` in the cards #10/#11; reader `#parked` #4; engine `Session` fields held across `await` #1).
- **C. Missing cancel path.** Esc, `pointercancel`, or unmount is not handled (drag gestures #6, scrub #22, Esc during `#writing` #1).
- **D. Re-entrancy / double fire.** Enter runs `#apply` twice (#2); `applyAll` overlaps because one `transaction` boolean is shared (engine #4).
- **E. Duplicated or persisted state.** Memory, DOM and sessionStorage disagree (#8, #9).
- **F. Sticky failure / latch.** `batched = false` (#16); a failed host `Session` is never evicted (engine #3).
- **G. Unreachable or dead states** (#25, #26, #27).

Measured locally (this repo, `src/`, 190 .ts files): `tsc --noEmit --incremental` takes 5.5 s cold and 1.2 s when nothing changed. That is the only speed number I measured myself. Every other timing below is documented by the vendor, or marked UNVERIFIED.

---

## 1. XState v5 (Stately)

**What it is.** A statechart library with an actor runtime. https://stately.ai/docs
- Versions: `xstate` stable is 5.33.3 (2026-10-17). `xstate@6.0.0-beta.0` and `beta.1` were published on 5 and 6 Nov 2026 (https://github.com/statelyai/xstate/releases).
- v6 removes several v5 APIs, for example `machine.restoreSnapshot()` and `services`. Pin v5 and expect a migration (`@xstate/codemod@0.1.0-beta.1` exists).
- Size: bundlephobia reports 46.8 kB min, 14.5 kB gzip, with no dependencies.

**Deterministic?** Yes. Transitions are pure functions of snapshot and event. A snapshot can be computed without running effects via `getNextSnapshot` / `transition` (UNVERIFIED in detail; the API is described in the Stately docs).

**`setup()` typing.** `setup({types:{context,events}, actions, guards, actors}).createMachine(...)` gives typed events and context, and the named actions and guards are checked to exist (https://stately.ai/docs/setup). It needs TypeScript 5.0 or later. In plain JS there is no compile-time check; the safeguard is the TS-checked `.d.ts` or `// @ts-check`.

**Async.**
- `invoke` actors are "created and started when the state is entered, and stopped when the state is exited" (https://stately.ai/docs/invoke).
- For `fromPromise`: "If the state where the invoked promise is active is exited before the promise settles, the result of the promise is discarded."
- The docs do not say the underlying work is aborted. In v5, `fromPromise` passes a `signal` (AbortSignal) to its creator function. I believe this is true but did not confirm it on the page I read, so UNVERIFIED. Check before relying on it.
- This directly removes bug class B: a late result cannot write state, because the actor is stopped. It also covers the cleanup `reading` overwrite and the `#parked` bug.

**Inspection and visualisation.**
- Stately Inspector: `createBrowserInspector()` from `@statelyai/inspect` (0.7.2, 2026-06-14). It opens a browser tab or popup, so it is browser-only (https://stately.ai/docs/inspector). `@xstate/inspect` is the old package; the docs now document only `@statelyai/inspect`.
- Stately Studio is the visual editor and codegen, and is a commercial web app. I did not verify what it exports or its pricing.
- Static "extract a machine from existing code" tooling: none found. The only extractor I know of, `xstate-codegen`, is dead (last release 2020-12, v0.3.0).

**Graph and model-based testing.**
- `@xstate/graph` 3.0.4 (2025-05-31) provides `getShortestPaths`, `getSimplePaths`, and `getAdjacencyMap`.
- `@xstate/test` 0.5.1 is deprecated: "Superseded by @xstate/test@2 (model-based and property-based testing for XState v6). Path utilities live in xstate/graph."
- The docs I fetched (`@xstate/test@beta`) say the package "has been superseded by `@xstate/graph`". They describe `createModel(machine)`, `.withEvents({EVENT:{exec}})`, `meta.test` assertions on states, `getShortestPathPlans` / `getSimplePathPlans`, and `testCoverage()` (https://stately.ai/docs/xstate-test).
- I found no `createTestModel` on the docs page (the name exists in later versions, UNVERIFIED).
- Gotcha: the testing story is in flux between v5 and v6 betas. Do not build on `@xstate/test@2` yet.

**Plain JS classes, no React.** Works. A class holds `this.actor = createActor(machine).start()`, and methods call `actor.send({type:'ESC'})`. Zero DOM dependency; Node usage is the same API. A refactor from "string `#state` + setters" to a machine is mostly mechanical but touches every transition site.

**Catches.**
- A (explicit table).
- B (stop on exit).
- C, if the machine declares an `ESC` / `CANCEL` handler on each state. Nothing forces you to.
- D, because an event in the wrong state is ignored by construction.
- G, by graph analysis (unreachable states).
- E is not covered, though `persist` and `restoreActor` exist.
- F is not covered unless you model an `error` state with a way out.

**Cost.** High for the 48 machines. A rewrite per machine, plus ~14 kB gzip into the overlay bundle (check what the overlay's size budget is; the budget itself is UNVERIFIED).

**Agent-loop fit.**
- Speed: no extra step beyond `tsc`.
- Precision: no false positives from the library itself.
- Output: type errors in `setup()` machines point at file:line.
- Compile-error conversion: partial. Typed events and named actions yield compile errors in TS only; guards on states are not exhaustively enforced.

---

## 2. poteto "pstack" and its statechart skill

**What it is, verified.**
- pstack is an LLM skill collection (a Cursor plugin) by Lauren Tan (poteto), also usable in Claude Code and Codex. The upstream is https://github.com/cursor/plugins (pstack folder), 33 skills as listed there. Ports: https://github.com/michael-denyer/pstack-claude. Background article: https://flaviocopes.com/pstack.
- `poteto-mode` is a router skill. It recommends encoding the domain in a structure ("state machine, typed model, table or registry, reducer...") instead of scattered conditionals (search summary, not from primary text).
- There is a `statechart` skill (https://skills.sh/cursor/plugins/statechart). Its pipeline: check a TLA+ model of the behaviour, draw what the user sees as a Mermaid statechart, mark each state that breaks a rule, and give the shortest path to each broken state.
- It is driven by `node <skill dir>/scripts/statechart.mjs`, which runs TLC (a Java model checker). The first run installs TLC and Java via mise, about 305 MB, and needs network.
- The determinism of the output is not stated on the page. TLC itself is deterministic, but the Mermaid output is UNVERIFIED.

**So:** the skill is a prompt-plus-script bundle. The TLA+ model comes from the LLM; the checker is deterministic, but the model is not tied to the real code, so the check says nothing about drift between code and spec. It is best viewed as a review aid for stakeholders ("what does this feature do?"), not a bug-finder on the code.

**Fit.** Slow (JVM, seconds to minutes; UNVERIFIED), not per-edit. Good for the 2-3 most critical machines (fix panel, cleanup), not for the loop.

---

## 3. Alternatives

| Option | What it is | Status (registry) | Notes |
|---|---|---|---|
| Robot (`robot3`) | Functional immutable FSM, 1.3 kB gzip, no deps | 1.4.0, 2026-10-05 | Small and plain JS. Async `invoke` is supported; the cancel-on-exit semantics are UNVERIFIED. No graph or test tooling. |
| Zag.js (`@zag-js/core`) | Statechart core behind headless UI components (Ark, Chakra) | 1.47.0, 2026-10-26 | Built to avoid effect-coordination bugs (https://zagjs.com/overview/introduction). Authoring API for your own machines is not documented on the intro page, so UNVERIFIED. Meant for its own components, so a poor fit for custom overlay logic. |
| Finity | Typed-ish FSM lib | 0.5.4, 2018 | Dead. |
| `typestate` | TS FSM | 1.0.6, 2018 | Dead. |
| `ts-pattern` | `match(x).with(...).exhaustive()` | 5.9.2, 2026-10-14 | Not a state-machine lib. Makes a `switch` over a discriminated union a compile error when a case is missing. |
| SCXML (`@xstate/scxml`) | Run SCXML on XState | 1.0.0-beta.0, 2026-11-05 | Standard interchange; no use here. |
| Effect | Effect-TS (Fiber interruption, `Scope`) | not checked | Fiber interruption gives cancel-on-exit for async. A full runtime change, so likely too large. UNVERIFIED. |

**Discriminated unions + `never` exhaustiveness (zero dependencies).**
- Model state as `type S = {t:'idle'} | {t:'reading', run:number} | ...`.
- `switch (s.t)` with `default: const _x: never = s` makes a missing state a compile error.
- typescript-eslint `switch-exhaustiveness-check` does the same as a lint rule.
- This kills A and G partially and makes illegal combinations of flags unrepresentable (the "make impossible states impossible" idea).
- It does not enforce which transitions are legal (D) unless you add a `MOVES` table typed as `Record<S['t'], readonly S['t'][]>`. That is what the owner's hand conversions (fixpanel-spec.md, text-edit-spec.md) already do.
- The overlay is plain JS, so it needs `// @ts-check` + JSDoc types or a TS migration to get any compile error.

---

## 4. Static analysis for these bug classes

**ESLint `require-atomic-updates`** (https://eslint.org/docs/latest/rules/require-atomic-updates).
- Catches: a variable read, then `await`/`yield`, then assigned from the earlier value. Examples it reports: `result += await x`; `if (!result) { result = await init(); }`; and property writes through a variable (`obj.p = await f()`).
- Does NOT catch: a write after `await` where the read came before and nothing is re-read between (the "is this run still current?" check is the missing part, and the rule cannot know a run id is the right guard).
- It is documented as stricter for properties and ships `allowProperties`. I did not find the docs listing specific false positives; the rule has a reputation for noise on `this.x = await ...` in classes (reputation only, UNVERIFIED).
- So it mostly flags the engine #1 style (`this.tag` held across `await`). It would be noisy and weak on the overlay's `#seq` pattern.

**typescript-eslint.**
- `no-floating-promises` flags unhandled promises; it needs type info (https://typescript-eslint.io/rules/no-floating-promises/).
- `no-misused-promises`, `switch-exhaustiveness-check` also need types.
- Documented cost: "your lint times should be roughly the same as your build times" (https://typescript-eslint.io/troubleshooting/typed-linting/performance/). No numbers are given. That puts it near tsc's cost; my measured warm tsc is 1.2 s for 190 files, so a typed lint of one file is likely seconds, not sub-second (UNVERIFIED).
- Neither rule finds a stale write; they find missing handling.

**oxlint.** Project benchmark: 50-100x faster than ESLint (https://oxc.rs/docs/guide/usage/linter, their own benchmark). It has 872 native rules, and type-aware linting via tsgo. JS plugins (custom rules) are alpha. `require-atomic-updates`, `switch-exhaustiveness-check` were not mentioned on the page, so presence is UNVERIFIED. Sub-second per file is plausible for non-typed rules.

**`eslint-plugin-xstate`** 3.2.1, last release 2023-12-16. Rules: `no-async-guard`, `no-imperative-action`, `invoke-usage`, `spawn-usage`, `no-infinite-loop`, etc. The version targeted is not stated; given its age it is probably v4 (UNVERIFIED). It will not help with v5 `setup()`.

**`react-hooks/exhaustive-deps`.** Only for hooks; the overlay is plain classes, so it does not apply. It matters for the homepage and site React code.

**Semgrep.** Pattern syntax (https://docs.semgrep.dev/writing-rules/pattern-syntax):
- The ellipsis `...` matches statement sequences but "does not jump from inner to outer statement blocks".
- Metavariable unification can bind the same target twice.
- The page does not mention `await`, `pattern-not-inside` or speed.
- I could not confirm that "write after await with no guard" is expressible. A rough version ("`this.$X = ...` after `await` with no `if (... this.$SEQ ...)` in between") is plausible with `pattern-inside` + `pattern-not-inside`, but guard detection will be syntactic. High false-positive risk; UNVERIFIED.
- Timing: no figures found. Semgrep is fast on single files in practice (seconds including start-up; UNVERIFIED).

**CodeQL JS.** I did not find a race-condition query pack (the Concurrency folder URL I tried returned 404). The data-flow docs cover local/global flow and taint, and guards for sanitizers, not statement ordering across `await`. Database creation is a build step (minutes on large repos; UNVERIFIED), so it fits CI, not an agent loop.

**Facebook Infer / RacerD.** Documented languages are Java, C, C++, Objective-C (and Erlang, Hack, Python in some checkers). No JS/TS support seen (https://fbinfer.com/docs/all-issue-types/; page truncated, so UNVERIFIED for completeness). Not applicable.

**Typestate checkers for JS/TS.** None maintained found. The practical typestate approach is the type-level one (discriminated unions, branded phases).

**Custom lint rule on top of the audit's own pattern.** Because the owner's hand-made pattern is "phase + MOVES + `#to()` + flight", a custom rule (ESLint, or an `oxlint` JS plugin) can be exact: "no assignment to `this.#phase` outside `#to()`", "every `await` in a class with `#phase` is followed by a `flight.isCurrent()` check before any `this.#` write". That is precise because the pattern is a convention the project controls. Cost: write and maintain 3-4 small rules.

---

## 5. Model-based and property-based testing

**fast-check** 4.10.2 (2026-09-19), https://fast-check.dev.
- `fc.commands` with `check(model)`, `run(model, real)`; runners `modelRun` (sync), `asyncModelRun`, `scheduledModelRun` (https://fast-check.dev/docs/advanced/model-based-testing/). Failing sequences shrink, and a `seed`, `path` and `replayPath` reproduce them.
- `fc.scheduler`: wraps promises and chooses the order in which they resolve (`schedule`, `scheduleFunction`, `scheduleSequence`, `waitIdle`, `waitNext`, `report()`) (https://fast-check.dev/docs/advanced/race-conditions/).
- Limits: it controls only promises you route through it. `fetch`, event emitters and native timers are not controlled, and `scheduleFunction` only delays resolution (the call still starts immediately).
- Deterministic given a seed, and the failing seed is printed.
- Catches B (stale write after reorder), C (add `cancel` / `unmount` / `pointercancel` as commands), D (random double Enter), F (random failure injection). It cannot find a missing state.
- It needs the code under test to take its async dependencies injected (a `fetch` seam). The overlay classes would need small seams; the engine's worker messaging probably does too.
- Per the project rule: these are integration tests through the real boundary, not unit tests.
- Run time: depends on `numRuns` (default 100 runs). A model with a few commands typically runs in well under a second to a few seconds (UNVERIFIED for this code).

**XState model testing.** See section 1: path generation (shortest/simple) is good for coverage of the machine. It does not explore races on its own.

**Playwright network timing.** `page.route()` can hold, delay or fail a request (documented in the Playwright network docs; not re-fetched here, so UNVERIFIED in detail). The repo already uses a route-hold in `craft-probe.ts` ("armed", "hold"). It gives real-browser deterministic ordering for a specific named scenario, but not random exploration, and runs in seconds. Good as the end-to-end proof for each fixed bug.

---

## 6. Formal options (briefly)

- **TLA+ with TLC** (Java). Exhaustive check of a model. Costs: learn the language, a model that is separate from the code (drift), and runs in seconds to minutes. pstack's statechart skill wraps this with a 305 MB first-run install.
- **Quint** (https://github.com/informalsystems/quint): TLA-based executable spec language with a type checker, a simulator, a REPL, an LSP and Apalache for model checking. Friendlier syntax than TLA+. The repo page shows no releases tab entry, so its release date is UNVERIFIED. The tutorials target distributed protocols.
- **P language** (AWS): state machine language that compiles to code. Not researched in detail here; UNVERIFIED.
- **Value for a small team.** Worth it for 2-3 machines whose bugs are expensive and whose rules are subtle (e.g. engine write attribution / transaction, fix panel). Not worth it for the other ~45. Does not run per edit, and the model/code gap means it needs periodic human review.

---

## Comparison

"Loop fit" = suitable inside an agent edit loop (target under 1 s/file, low false positives, file:line output, ideally a compile error).

| Option | Deterministic | Classes caught | Adoption in plain-JS classes | Maintenance | Loop fit (speed / precision / output / compile error) |
|---|---|---|---|---|---|
| XState v5 machine | Yes | A, B, D, G; C if declared | High: rewrite each machine; ~14.5 kB gzip | Active; v6 beta Nov 2026 | Needs `tsc`: ~1.2 s warm in this repo. Precision: high. Output: type errors file:line. Compile error: partly (TS only) |
| `@xstate/graph` / `@xstate/test` | Yes | G; coverage of transitions | Needs an XState machine first | graph 3.0.4 (2025-05); test deprecated for v6 | Test run, seconds. Precision high. Output is a failing path; not a type error |
| TS discriminated unions + `never` + `MOVES` table | Yes | A, D, G, many E | Medium: JSDoc + `@ts-check`, or migrate to TS | n/a (language feature) | Fast: `tsc` ~1.2 s warm. Precision highest. Output: file:line. Compile error: yes (strongest signal) |
| `ts-pattern` `.exhaustive()` | Yes | A, G | Small dependency, TS only | 5.9.2, 2026-10 | Same as tsc. Compile error: yes |
| typescript-eslint typed rules | Yes | B (floating only), switch exhaustiveness | Needs a TS project | Active | Documented as roughly build-time. Precision medium. Output: rule id + file:line, many auto-fixes |
| `require-atomic-updates` | Yes | Partial B (engine #1 style) | Config only | Core ESLint | Fast (untyped). Precision low-to-medium (noise on `this.x`). Fix is not obvious to an agent |
| oxlint | Yes | Only what rules cover | Config only; custom rules alpha | Active | 50-100x ESLint (vendor). Precision depends on the rules. Output: file:line |
| Custom project rule (ESLint / oxlint plugin) for `#to()`, flight check | Yes | A, B, D, C (as conventions) | 3-4 small rules, needs the convention first | You maintain it | Fast. Precision high (project-specific). Output: file:line + exact fix text |
| Semgrep | Yes | B, A (syntactic guesses) | Rules only | Active | Fast per file (UNVERIFIED). Precision: low for ordering. `await`/guards not confirmed |
| CodeQL JS | Yes | None found for races | DB build step | Active | CI only. No race queries found |
| Infer / RacerD | Yes | None | Not for JS | n/a | Not applicable |
| fast-check commands + scheduler | Yes (seed) | B, C, D, F | Medium: needs injectable async seams | 4.10.2, 2026-09 | Test run, sub-second to seconds (UNVERIFIED). Failure shows seed + shrunk steps; not a type error |
| Playwright route hold | Yes | One named race at a time | Low | Active | Seconds. Good as proof per bug; not for exploration |
| Robot / Zag | Yes | A (small) | Medium | Active | No better than hand-rolled tables for our needs |
| TLA+/Quint/P | Yes | Logic bugs in the model | High; model separate from code | Quint: unknown | Not loop-able. Use for 2-3 machines |
| pstack `statechart` skill | TLC part yes; LLM part no | Review aid | Java, 305 MB | Active | Not loop-able |

---

## Candidate stacks

**Stack 1: types first, lightweight (best for the agent loop).**
- Per machine: a discriminated-union `State`, a `MOVES` table typed on it, `#to()` as the only writer, `flight` for in-flight work, `switch` with `never` exhaustiveness.
- Add `// @ts-check` + JSDoc to the overlay (or migrate those files), so `tsc --noEmit --incremental` turns missing states and illegal moves into compile errors (about 1.2 s warm here; the overlay itself was not measured).
- Add 3-4 custom lint rules that enforce the convention (no writes to `#phase` outside `#to()`, a flight check after every `await`).
- Add fast-check scheduler/commands tests for the async-heavy machines.
- Trade-offs: no new runtime dependency; the enforcement is only as good as the convention; no graph or visual tooling; no help for E (persisted state).

**Stack 2: XState for the async-heavy machines, types for the rest.**
- XState v5 + `setup()` for fix panel, cleanup, reader, text editor (where B and C bugs cluster). Cancel-on-exit comes from the runtime, and `@xstate/graph` gives reachability. Stately Inspector and Studio give visual debugging.
- Discriminated unions for the small ones. Same lint and fast-check as Stack 1.
- Trade-offs: ~14.5 kB gzip and a v5 to v6 migration coming; XState's own testing package is mid-transition; agents must learn XState idioms; stronger guarantees on B than Stack 1 because the runtime enforces them rather than a convention.

**Stack 3: Stack 1 plus formal modelling of the highest-risk 2-3.**
- Same as Stack 1, plus a TLA+ or Quint model (or the pstack `statechart` skill) for engine write attribution / transaction and the fix panel. Run in CI or on demand, not per edit.
- Trade-offs: the highest assurance on logic bugs; the biggest learning cost for a non-expert; the model drifts from the code unless it is reviewed; JVM install.

**What none of them cover:** E (state duplicated across memory/DOM/sessionStorage) needs a design decision (one owner per fact), not a tool. Integration tests that reload the page are the only check I found.

---

## 7. Agent-facing "state oracle" (refined goal: no visual tooling, consumer is a coding agent)

Queries the agent wants: list states/transitions of owner X; what happens on event E in state S; which states have no exit on cancel/Esc/unmount; which writes happen after an await without a run check; is this combination reachable.

### 7a. Existing tools that expose a machine as queryable data

| Tool | Queryable? | Runs offline/local? | Fit for the five queries |
|---|---|---|---|
| `xstate/graph` (https://stately.ai/docs/graph) | Yes, as library calls: `getShortestPaths`, `getSimplePaths` (options `fromState`, `toState`, `stopWhen`, `limit`), `getAdjacencyMap` (state -> outgoing `{event,state}`), `toDirectedGraph`. | Yes, plain Node. Whether it avoids running effects is not stated; test before relying on it. | Queries 1, 2, 3, 5 once the machine is an XState object. Needs the module to be imported and run, so the machine file must have no DOM imports. Query 4 not covered. |
| `xstate` pure `transition(machine, snapshot, event)` / `initialTransition(machine)` (https://stately.ai/docs/machines) | Yes: gives next snapshot and the actions without executing them. | Yes | Query 2 exactly. The docs say `getNextSnapshot` / `getInitialSnapshot` "will be deprecated" in favour of these. |
| Stately MCP (`npx @statelyai/mcp`, https://stately.ai/docs/packages/mcp) | Yes, tools: `list_machines`, `get_machine`, `validate_machine`, `diff_machines`, `generate_graph_paths` (up to 5 paths), `simulate_machine` (up to 100 events), `convert_machine` (XState, SCXML, XGraph, D2), `extract_machines_from_code` (static, JS/TS XState configs). | Only `list_machines` and `get_machine` are documented as running entirely locally. The doc says every other tool calls Stately's HTTP API (needs a credential). This is not deterministic-offline, so not a fit for a fast loop, and it sends source machines to a third party. | Closest existing thing to an oracle, but it covers only XState-shaped machines, not our `#state` classes, and has no "write after await" or "no exit on Esc" query. |
| SCXML (`@xstate/scxml` 1.0.0-beta.0, 2026-11-05) | XML standard; any XML/XPath tool can query it. | Yes | Interchange only; verbose; no tooling for our queries. |
| XGraph (Stately's graph format) | Used by the MCP converter. I did not find a spec. UNVERIFIED. | | |
| `@statelyai/graph` 2.6.0 (2026-10-12) | Appears to be a graph data library from Stately. UNVERIFIED what it offers. | | |
| LSP servers for statecharts | None found. | | |
| `eslint-plugin-xstate` | Lint only; last release 2023-12. | | |

Conclusion: nothing existing answers "which writes happen after an await without a run check" or "which states have no exit on Esc" for plain-class code. XState gives queries 1, 2, 3, 5 cheaply only if you adopt XState machines.

### 7b. pstack's `statechart`: queryable or LLM-only?

Verified from the SKILL.md (https://github.com/cursor/plugins, `pstack/skills/statechart`, fetched via the raw file):
- It is a skill with `disable-model-invocation: true`, so only the user's `/statechart` invokes it.
- The agent writes a TLA+ spec and config in a scratch folder (outside the repo), optionally a "view" JS module (`state(vars)`, `step(action, from, to)`), then runs `scripts/statechart SPEC.tla [--config] [--view] [--out]`. The script is TypeScript, and installs TLC and Java via mise on first run (needs network).
- The report gives the shortest path to each state that breaks an invariant, plus a Mermaid statechart. It writes files next to its input; I did not see a JSON query interface and did not read the `scripts/backends` folder.
- The TLA+ spec is written by the LLM; nothing ties it to the real code except comments with file:line. So it is a verification skill around a deterministic checker (TLC), not a queryable oracle of the codebase. The answer to "is this combination reachable?" is exact only for the model, not the code.

### 7c. Minimal declared format for exact, sub-100ms queries

Principle: the machine is declared as plain data inside the owner's source file, readable by a script that parses the file and never runs it (so no DOM, no app start-up). Then queries are graph walks over a few dozen nodes and take milliseconds; the dominant cost is parsing one file (a few ms with a native parser such as oxc, or tens of ms with TypeScript's API; both UNVERIFIED for this repo).

Sketch (illustrative, not a decision):

```js
// at the top of fixpanel.js, JSON-compatible literal, no functions, no computed keys
export const MACHINE = {
  id: 'fixpanel', owner: 'FixPanel', field: '#phase', initial: 'closed',
  events: ['open','hold','write','done','esc','cancel','unmount'],
  states: {
    closed:  { on: { open: 'resting' } },
    resting: { on: { hold: 'inHand', esc: 'closed', unmount: 'closed' } },
    writing: { flight: 'write',            // async work owned by this state
               on: { done: 'resting', esc: 'writing', cancel: 'resting', unmount: 'closed' },
               ignores: ['hold'] },        // explicit: event deliberately ignored here
  },
  persists: ['sessionStorage:plumb-resume'],   // facts duplicated outside memory (class E)
}
```

What the script can then answer exactly:
1. States/transitions of owner X: read the literal.
2. What happens on E in S: lookup; an event neither in `on` nor in `ignores` is a reported gap.
3. States with no exit on esc/cancel/unmount: for each state, check the three events are handled or declared in `ignores`. Exact and complete over the declared table.
4. Reachability of a state or combination: BFS from `initial` (and "can reach `closed` from every state" as a deadlock/sticky-failure check, class F).
5. Table vs code drift: a second AST pass over the class finds every `this.#to('x')` / write to `field` and checks that `x` is a declared state and the source state's `on` allows it; flags any write to the field outside `#to()`.
6. "Writes after an await without a run check": an AST pass in each class method: for every `await` (or `.then`) find later writes to `this.#...` in the same function, and check for a guard call (e.g. `flight.current(token)`) between them. The query is exact only as far as the project fixes the guard's spelling; it is a syntactic rule, so it needs a convention, which the hand conversions (`flight`) already supply.

Costs and limits:
- This is custom code to write (a table reader, a graph walker, an AST scan); I estimate it is small (hundreds of lines), but that is my estimate, not researched.
- Class E (duplication) is only recorded by `persists`, not verified; a scan for `sessionStorage.setItem` keys not listed in some machine is possible.
- Machines that are legitimately dynamic (parallel regions, hierarchy) need extra fields; keep the format flat first.
- The same literal can be fed to XState later (`createMachine(MACHINE)` with named actions) if the project adopts it, because it is close to XState's config shape.

CLI/MCP wrapper: a CLI with `--json` output (`oracle states fixpanel`, `oracle on fixpanel writing esc`, `oracle gaps --events esc,cancel,unmount`, `oracle stale-writes src/...`) is enough. An MCP server around the same functions is possible with the MCP SDK (version not checked, UNVERIFIED), but a CLI that prints JSON is usable by any agent with Bash and has no server to keep alive.

### Best substrate for an agent-facing state oracle

1. **Declared plain-data table (above) + a small own CLI/AST scanner.** It answers all five queries exactly, offline, in milliseconds, and produces file:line output with exact fixes ("add `esc` to state `writing`"). It turns drift between table and code into a reported error, not a type error; combine with discriminated unions + `never` (Stack 1) so the strongest signal, a `tsc` error, still exists for exhaustiveness.
2. **XState machines read through `xstate/graph` + `transition()`** as the second-best substrate: free graph queries and cancel-on-exit semantics, but needs a pure machine module (no DOM imports), a v5 to v6 migration, and still needs your own AST scan for "write after await" (XState removes most such writes, but class-bound code around it remains).
3. **Stately MCP / pstack statechart** are not suited as the oracle: the first sends code to a hosted API and covers XState only; the second is an LLM-driven TLA+ workflow with a Java checker, not a query interface.

Candidate stack 1 therefore gains an oracle layer: the table is the one source for the oracle, the runtime `MOVES`/`#to()`, and the exhaustiveness types.

## Sources
- XState: https://stately.ai/docs, /docs/setup, /docs/invoke, /docs/inspector, /docs/xstate-test; https://github.com/statelyai/xstate/releases; npm registry (`xstate`, `@xstate/graph`, `@xstate/test`, `@statelyai/inspect`)
- pstack: https://github.com/cursor/plugins, https://flaviocopes.com/pstack, https://skills.sh/cursor/plugins/statechart, https://github.com/michael-denyer/pstack-claude
- ESLint: https://eslint.org/docs/latest/rules/require-atomic-updates; typescript-eslint: https://typescript-eslint.io/rules/no-floating-promises/, https://typescript-eslint.io/troubleshooting/typed-linting/performance/; https://github.com/statelyai/eslint-plugin-xstate
- oxlint: https://oxc.rs/docs/guide/usage/linter
- Semgrep: https://docs.semgrep.dev/writing-rules/pattern-syntax; CodeQL: https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-javascript-and-typescript/; Infer: https://fbinfer.com/docs/all-issue-types/
- fast-check: https://fast-check.dev/docs/advanced/model-based-testing/, /race-conditions/
- Quint: https://github.com/informalsystems/quint; Zag: https://zagjs.com/overview/introduction
- Stately MCP: https://stately.ai/docs/packages/mcp; @xstate/graph: https://stately.ai/docs/graph; machine/transition API: https://stately.ai/docs/machines
- pstack statechart SKILL.md: https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/statechart/SKILL.md
