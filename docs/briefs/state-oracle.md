# State oracle: explicit machines, checked statically, queried by agents

Status: draft for sign-off. No code yet.
Research behind it: `docs/research/state-machine-tooling.md`.
The audit it answers: `docs/state-machines/{overlay,engine}.md` (48 implicit machines).

## Problem

Agents write most of the code, and they reason badly about state: every state × every event × every async interleaving.
The audit's bugs fall into six kinds:

1. impossible flag combinations
2. missing exits (Esc, cancel, unmount)
3. async results landing after the state moved on
4. one fact kept in two places
5. leaked listeners, timers and workers
6. interleavings nobody tested

No existing tool checks plain-class code for kinds 2, 3 and 5. XState would cover some of it, but at runtime. pstack's statechart skill is an LLM process, not a deterministic tool.

## Decision

- **No runtime library.** Machines are plain data in the source file, and the code stays ordinary JS/TS.
- **Enforcement is static.** Lint rules and graph checks give exact, file:line errors with one canonical fix. Models
  reliably fix errors like that.
- **The oracle is a deterministic CLI** an agent queries for answers about state. It has no LLM inside, and the same
  input always gives the same output.

## Goals and budgets

- Speed: under 100 ms per file for a query or per-file check; under 2 s for the whole repo.
- Determinism: output is byte-identical across runs, with sorted keys and no timestamps in answers.
- Precision: a blocking rule has no known false positives. Anything heuristic is advisory and never blocks.
- Output an agent can act on: `{ rule, file, line, column, message, fix }`, where `fix` is one concrete instruction.

Non-goals: inferring machines from code that hasn't declared one, a UI in the agent loop, and runtime instrumentation.

## 1. The declared machine (the only source of truth)

It's an exported object literal with a `/** @machine */` tag. It's readable by parsing alone (no imports, no
computed keys), and it uses the event-keyed shape models already know from statecharts:

```js
/** @machine */
export const FIX_PANEL = {
  owner: 'FixPanel',                 // the class (or module) that holds this state
  field: '#phase',                   // the one field the phase lives in
  initial: 'closed',
  cancel: ['Escape', 'close', 'unmount'], // every state must handle these or list them under `ignores`
  states: {
    closed:  { on: { open: 'resting' } },
    resting: { on: { hold: 'holding', undo: 'undoing', close: 'closed', Escape: 'closed' }, ignores: ['unmount'] },
    holding: { on: { take: 'writing', keep: 'keeping', release: 'resting', Escape: 'resting', close: 'closed' }, ignores: ['unmount'] },
    writing: { flight: 'write', on: { landed: 'holding', empty: 'resting', close: 'closed' }, ignores: ['Escape', 'unmount'] },
    // …
  },
  flights: { write: { ifLeft: 'handOff' } }, // what happens when its state is left before it lands
};
```

Rules of the format:
- Only literals are allowed: strings, arrays and objects. Anything else is an error.
- Each state appears once, and every target names a state that exists.
- A `flight` names async work that belongs to the state. Its `ifLeft` says what happens to a result that lands after
  the state was left. It is required, so that case is always decided.

## 2. Binding: how code uses its machine (the pattern models copy)

```js
#phase = FIX_PANEL.initial;
#flight = null;
#send(event) { const next = FIX_PANEL.states[this.#phase].on[event]; if (next) this.#phase = next; return !!next; }

async #write() {
  if (!this.#send('take')) return;
  const flight = (this.#flight = {});       // the run's token
  const result = await this.#host.applyAll(…);
  if (this.#flight !== flight) return;      // left or replaced: the result isn't ours to apply
  this.#flight = null;
  this.#send(result.ok ? 'landed' : 'empty');
}
```

`#send` is the only writer of `#phase`. Transitions come from the table, never computed by hand.

## 3. Lint rules (blocking: exact, one fix each)

| id | catches | fix the error states |
|---|---|---|
| `sm/single-writer` | `field` assigned anywhere but `#send` | "Call `this.#send('<event>')`; add the event to the machine if it is missing." |
| `sm/known-event` | `#send('x')` where `x` is in no state's `on` | "Add `x` to the states that accept it, or use an existing event." |
| `sm/flight-check` | in an owner's async method, a write to `this.*` after an `await` with no `this.#flight !== token` check between them | "Capture `const flight = (this.#flight = {})` before the await and `if (this.#flight !== flight) return` after it." |
| `sm/pointer-pair` | `pointerdown`/`pointermove` listener in a class with no `pointercancel` listener | "Handle `pointercancel` the same as `pointerup` with `cancel`." |
| `sm/listener-pair` | `addEventListener` on `window`/`document` with no matching `removeEventListener` in the same owner | "Remove it in the exit path (`close`/`destroy`)." |
| `sm/timer-handle` | `setTimeout`/`setInterval` result not stored in a field or variable, inside an owner with a machine | "Store the handle and clear it on exit." |

Advisory (never blocks): `sm/mode-flags`. Flags a class with two or more boolean fields that are each assigned in
three or more methods and read in conditions, as a suggestion to declare a machine. This is how undeclared machines
get found, without blocking on a guess.

## 4. Graph checks (on the declared data alone, exact)

- unreachable states, and states with no way out (other than declared final states)
- a `cancel` event neither handled nor listed under `ignores` in some state
- a flight without `ifLeft`
- a target that names no state, and duplicate or unknown keys

## 5. The oracle CLI (agent-facing, JSON output)

```
sm list                          → every machine: owner, file, states
sm show <machine>                → states, transitions, flights
sm on <machine> <state> <event>  → target state, or "unhandled" (or "ignored")
sm gaps [<machine>]              → graph-check results
sm paths <machine> <state>       → shortest event path from initial (for writing tests)
sm check [files…]                → lint and graph results as { rule, file, line, fix }
sm diff <git-ref>                → machine changes since the ref: states and transitions added or removed
```

An MCP wrapper over the same commands comes later, as a thin layer with no extra logic.

## 6. Log (for the human view later)

Every `check` and query appends `{ seq, kind: asked|drift|aligned|machine-changed, rule, file, line, machine, detail }`
to `.state/log.jsonl`. When a later check finds the same rule and place clean, it writes an `aligned` entry linked to
the drift it resolves. The view that shows how the agent drifted and was brought back is built from this log after
the core works, in its own design pass.

## 7. Wiring into the agent loop

- A post-edit hook runs `sm check <edited files>`, and its JSON goes back to the agent.
- A pre-commit hook and CI run `sm check` on the whole repo, with a baseline file for the existing debt that refuses
  growth.
- Project instructions add one line: "State: declare a `@machine`, change it only through `#send`, query `sm`."

## Build order (each layer verified before the next)

1. Format, parser and graph checks, plus `list`/`show`/`on`/`gaps` (pure data, no lint yet).
2. Lint rules `single-writer`, `known-event` and `flight-check`, each with a fixture taken from a real audit bug that
   fails before and passes after.
3. Convert the Fix panel and the words editor, already on branch `explicit-machines`, to the declared format as the
   first users.
4. `pointer-pair`, `listener-pair`, `timer-handle`, `sm/mode-flags`, `diff`, and the log.
5. Hooks and baseline; then the human view.

## Open questions for sign-off

1. **Lint host:** ESLint custom plugin (mature, slower) or oxlint JS plugins (fast, newer API). Also, can `sm check`
   be standalone on oxc-parser? To be decided by a timing bench on this repo.
2. **Scope:** overlay first (plain JS, `// @ts-check`), engine (TS) second?
3. **Event naming:** DOM key names (`Escape`) mixed with domain events (`take`), or always domain events with
   key mapping kept in the code?
