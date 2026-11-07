# State oracle: implementation spec

Status: buildable spec, written from the signed-off draft (`docs/briefs/state-oracle.md`). The draft's architecture is
fixed; this document makes it exact. Research: `docs/research/state-machine-tooling.md`. The audit it answers:
`docs/state-machines/{overlay,engine}.md` (48 implicit machines; rows are cited as "overlay #N" and "engine #N").
Hand conversions that shaped the binding: commits `190efd1` (fix panel), `78bee38` (words editor), `2d49db8`
(clean-up `#run` tokens), `630d16f` (reader `#live(run)`), `87fb314` (pointercancel) on branch `explicit-machines`.

Owner decisions this spec does not reopen: no runtime library; static enforcement (lint + graph checks + CLI); the
consumer is a coding agent; JSON output, byte-identical across runs, no LLM inside; machines are plain-data
`/** @machine */` literals read by parsing alone; code changes state only through `#send(event)`; async work uses a
flight token; under 100 ms per file and 2 s per repo; blocking rules have no known false positives; typed phase
unions and strictness levels are a later, separate extension (section 12).

## Words used in this document

- **machine**: the declared table: states, events, transitions.
- **owner**: the class (or the module) whose field holds the machine's state.
- **phase**: the one field that holds the current state. `field` in the table.
- **event**: a name the code sends (`this.#send('close')`). The table says what each state does with it.
- **transition**: state + event → target state.
- **cancel event**: an event every state must decide about (`cancel` in the table). Esc, close, unmount.
- **flight**: async work that belongs to a state (a write to the server, a read).
- **token**: the field that says which flight is current. A result compares its own token to it before it writes.
- **guard**: the `if` that does that comparison.
- **finding**: one error or one piece of advice the tool reports: rule, file, line, column, message, fix.
- **key**: a finding's stable address that survives line shifts (section 6.2).
- **baseline**: the list of finding keys the repo already carries; CI refuses new ones.
- **sm**: the command-line tool this spec describes.

## 0. Repo layout and names

- Tool source: `tools/sm/` (plain ESM `.mjs` with `// @ts-check`, no build step, Node ≥ 22). Entry: `tools/sm/bin.mjs`.
  `package.json` gets `"sm": "node tools/sm/bin.mjs"`, so `npm run sm -- <command>` works; `sm` below means that.
- Type for TS owners: `tools/sm/types.d.ts` exports `Machine` (section 2.4).
- Project state: `.state/config.json` (committed), `.state/baseline.json` (committed), `.state/log.jsonl` and
  `.state/cache/` (git-ignored). The directory that holds `.state/config.json` is the **repo root**. Every path the
  tool prints is relative to it, with forward slashes.
- Tests: `e2e/sm-*.test.mjs`, run by the existing `scripts/test.mjs` (`node --test`). Fixtures: `e2e/fixtures/sm/`.

`.state/config.json`:

```json
{
  "schema": 1,
  "include": ["overlay/src/**/*.js", "src/**/*.ts"],
  "exclude": ["**/*.test.*", "**/fixtures/**", "src/**/*.d.ts"]
}
```

`include`/`exclude` are picomatch globs (both already dependencies). A file outside `include` is never read.

## 1. The declared format

### 1.1 Where it lives and how it is found

A machine is a named `export const` whose initializer is an object literal, in the **same file as its owner**. The
block comment immediately before the `export` (only whitespace between them) contains the word `@machine`. Example,
the fix panel as it will be declared (its `MOVES` table from `190efd1` is replaced by this):

```js
/** @machine */
export const FIX_PANEL = {
  id: 'fix-panel',
  owner: 'FixPanel',
  field: '#phase',
  token: '#flight',
  initial: 'closed',
  cancel: ['escape', 'close', 'unmount'],
  states: {
    closed:  { on: { open: 'resting', openWriting: 'writing', openUndoing: 'undoing' }, ignores: ['escape', 'close', 'unmount'] },
    resting: { on: { hold: 'holding', undo: 'undoing', close: 'closed', escape: 'closed', unmount: 'closed' } },
    holding: { on: { take: 'writing', keep: 'keeping', release: 'resting', hold: 'holding', undo: 'undoing', escape: 'resting', close: 'closed', unmount: 'closed' } },
    keeping: { on: { keepIt: 'writing', closeKeep: 'holding', release: 'resting', undo: 'undoing', escape: 'holding', close: 'closed', unmount: 'closed' } },
    writing: { flight: 'write', on: { landedNext: 'holding', landedNone: 'resting', close: 'closed', unmount: 'closed' }, ignores: ['escape'] },
    undoing: { flight: 'undo', on: { landed: 'resting', close: 'closed', unmount: 'closed' }, ignores: ['escape'] },
  },
  flights: {
    write: { ifLeft: 'handOff' },
    undo: { ifLeft: 'drop' },
  },
};
```

In TypeScript the same literal may carry a type annotation or `as const`/`satisfies` (section 2.4). Nothing else may
wrap it.

### 1.2 Grammar

Values are literals only: string literals, array literals of string literals, object literals with plain
identifier or string keys, and the booleans `true`/`false` for `final`. No identifiers, spreads, computed keys,
template literals, numbers, functions, `null`, or calls. The tool never evaluates the file.

Top level (`Machine`):

| key | required | type | meaning |
|---|---|---|---|
| `id` | yes | string, `^[a-z][a-z0-9-]*$`, unique in the repo | the name the CLI uses |
| `owner` | yes | string | the class name in this file, or `'module'` for module-level state |
| `field` | yes | string | the phase field: `'#name'` (JS private), `'name'` (public or TS `private`), or a module-level `let` name when `owner` is `'module'` |
| `initial` | yes | string | a state name |
| `states` | yes | object, ≥ 1 key | state name → `State` |
| `token` | when the owner has any `await` or `.then` | string, same shape as `field` | the flight token field. Default `'#flight'` (`'flight'` for module owners) |
| `send` | no | string, same shape as `field` | the send method name. Default `'#send'` (`'send'` for module owners) |
| `cancel` | no | array of event names | events every non-final state must handle or ignore. Default `[]` |
| `flights` | when any state has `flight` | object | flight name → `Flight` |

`State`:

| key | required | type | meaning |
|---|---|---|---|
| `on` | no | object: event name → state name | transitions. Self-targets are allowed |
| `ignores` | no | array of event names | events this state deliberately does nothing with |
| `flight` | no | string | the name of the async work that belongs to this state |
| `final` | no | `true` | a terminal state. Must have no `on` and no `flight`. Exempt from `cancel` |

`Flight`:

| key | required | type | meaning |
|---|---|---|---|
| `ifLeft` | yes | `'drop'` or `'handOff'` | what the code does with a result that lands after its state was left: discard it, or hand it to something outside the owner (a host callback, History) |

Naming: state names, event names and flight names match `^[a-z][a-zA-Z0-9]*$` (lower camel case). An unknown key
anywhere is an error. A key written twice in one object literal is an error (JavaScript allows it; the tool does not).

### 1.3 Semantics

- **Transition**: `states[s].on[e] = t` means: in state `s`, event `e` moves the phase to `t`. The code never computes
  a target by hand; `#send` looks it up (section 2.2).
- **`ignores`**: `e` in `states[s].ignores` means `#send(e)` in `s` returns `false` and changes nothing, on purpose.
  `sm on` answers `ignored`. An event in neither `on` nor `ignores` of `s` is **unhandled**: `#send` also returns
  `false`, but the oracle reports it as a gap when `e` is a cancel event.
- **`cancel`**: every non-final state must have each cancel event in `on` or in `ignores`. This is how "missing Esc,
  close, unmount" (audit class C) becomes a compile-time-style error.
- **`flight`**: the state owns async work named `flight`. Leaving the state (by any transition) orphans that work.
  `flights[name].ifLeft` records the decision for the orphaned result. The lint rule `sm/flight-check` enforces the
  code shape that makes the decision real (section 3.3); the oracle only records which decision was made.
- **`final`**: nothing happens after it. A sticky failure (audit class F) is only legal when it is declared final, which
  makes the decision visible (overlay #17's `fallback` is a real final; overlay #16's `batched = false` latch is not).
- Two machines may not name the same owner. A file may hold several machines with different owners.

### 1.4 Decision: events are domain words, never DOM key names

The draft mixed `Escape` with `take`. The table uses **domain events only** (`escape`, `close`, `unmount`, `take`).
The key-to-event mapping lives in code, in one place per owner (`key(k) { if (k === 'Escape') return this.#send('escape'); … }`).
The name pattern (`^[a-z]…`) makes `Escape` a format error (`sm/machine-name-shape`), so the decision is enforced,
not advised.

Why:
1. One event has many sources. Esc, the close button, `host.close()` and a parent's `destroy()` all mean `close` or
   `escape`. The table should say what the owner does with the intent, not which key arrived.
2. Node owners (engine `Session`, the Vite host) have no keys. One naming rule for both sides keeps `sm` output
   uniform.
3. `sm on fix-panel holding escape` reads as a sentence in the domain's words, which is what an agent writes a test
   from.
4. The key router (overlay #5) is itself a machine the owner may declare later; its events are then `escape` too, and
   the two tables compose.

Convention, not enforced: `escape` for the Esc key's intent (back out one level), `close` for "the surface goes away",
`unmount` for the owner's `destroy()`/`disconnectedCallback`, `cancel` for `pointercancel`/abort.

### 1.5 Format errors

All are blocking. `file`, `line`, `column` point at the offending key or value. Messages are exact; `<x>` is filled in.

| rule | when | message | fix |
|---|---|---|---|
| `sm/machine-not-literal` | a value is not a string/array/object literal (or `true` for `final`) | `A machine holds only string, array and object literals; <kind> is not allowed.` | `Replace <kind> with a literal; put computed values in code, not in the table.` |
| `sm/machine-not-exported` | the tagged literal is not `export const NAME = {…}` | `A @machine must be \`export const NAME = { … }\`.` | `Export it as a const; the oracle reads the file, it never runs it.` |
| `sm/machine-key-missing` | a required key is absent | `Machine <id or NAME> is missing \`<key>\`.` | `Add \`<key>\`: <one-line meaning from 1.2>.` |
| `sm/machine-key-unknown` | an unknown key at any level | `\`<key>\` is not a machine key (allowed here: <list>).` | `Remove it, or rename it to one of: <list>.` |
| `sm/machine-key-duplicate` | the same key twice in one object literal | `\`<key>\` appears twice.` | `Keep one.` |
| `sm/machine-id-shape` | `id` fails the pattern | `Machine ids are lower-case, digits and dashes: \`<id>\`.` | `Rename it to <kebab-cased suggestion>.` |
| `sm/machine-id-duplicate` | two files declare the same `id` (whole-repo runs only) | `Machine id \`<id>\` is also declared in <other file>.` | `Give one of them a new id.` |
| `sm/machine-name-shape` | a state, event or flight name fails the pattern | `\`<name>\` is not a lower-camel domain name. Key names (\`Escape\`) are mapped in code: \`if (k === 'Escape') this.#send('escape')\`.` | `Rename \`<name>\` to \`<suggestion>\`.` |
| `sm/machine-initial-unknown` | `initial` names no state | `\`initial\` is \`<name>\`, which is not a state (states: <list>).` | `Set \`initial\` to one of <list>, or add the state.` |
| `sm/machine-target-unknown` | an `on` value names no state | `\`<state>.on.<event>\` points to \`<target>\`, which is not a state.` | `Add state \`<target>\`, or point the event at one of <list>.` |
| `sm/machine-event-both` | an event is in both `on` and `ignores` of one state | `\`<state>\` both handles and ignores \`<event>\`.` | `Keep it in one of the two.` |
| `sm/machine-ignores-duplicate` | an event listed twice in `ignores` or `cancel` | `\`<event>\` is listed twice.` | `Keep one.` |
| `sm/machine-flight-unknown` | `state.flight` names no entry in `flights` | `\`<state>\` has flight \`<name>\`, but \`flights.<name>\` is not declared.` | `Add \`flights: { <name>: { ifLeft: 'drop' } }\` (or \`'handOff'\`).` |
| `sm/machine-flight-undecided` | a flight has no `ifLeft`, or an unknown value | `Flight \`<name>\` does not say what happens to a result that lands after its state was left.` | `Set \`ifLeft\` to \`'drop'\` (discard it) or \`'handOff'\` (give it to the host).` |
| `sm/machine-flight-unused` | a `flights` entry no state names | `Flight \`<name>\` belongs to no state.` | `Add \`flight: '<name>'\` to the state that runs it, or remove the entry.` |
| `sm/machine-final-shape` | a final state has `on` with keys, or a `flight` | `A final state has no transitions and no flight; \`<state>\` has <which>.` | `Remove \`final\`, or remove \`<which>\`.` |
| `sm/machine-owner-missing` | no class named `owner` in this file (or `owner: 'module'` in a file with no top-level `let`) | `Owner \`<owner>\` is not declared in this file.` | `Put the machine in the owner's file, or fix \`owner\`.` |
| `sm/machine-owner-duplicate` | two machines in one file name the same owner | `\`<owner>\` already has machine \`<id>\`.` | `One machine per owner. Merge them, or split the owner.` |
| `sm/machine-field-missing` | the owner declares no field named `field` (or `token`) | `\`<owner>\` has no field \`<field>\`.` | `Declare \`<field> = <NAME>.initial;\` on the owner.` (token: `Declare \`<token> = null;\`.`) |
| `sm/machine-token-missing` | the owner has `await` or `.then` and no `token` field exists | `\`<owner>\` has async work but no flight token.` | `Declare \`#flight = null;\` and, if you name it differently, \`token: '<name>'\` in the machine.` |

### 1.6 Canonical JSON of a machine

For hashing, `diff` and `show`, a machine is normalized to: keys in this order `id, owner, field, token, send,
initial, cancel, states, flights`; defaults filled in; `cancel` sorted; `states` as an array sorted by name, each
`{ name, final, flight, ignores (sorted), on (array of { event, to } sorted by event) }`; `flights` as an array sorted
by name. The hash is SHA-1 of that JSON.

## 2. Binding: how code uses its machine

### 2.1 Owner lookup

- `owner: 'FixPanel'`: a `ClassDeclaration` named `FixPanel`, or `const FixPanel = class …`, at the file's top level.
  Custom elements (`class PlumbOverlay extends HTMLElement`), `EventEmitter` subclasses (engine `Session`) and plain
  classes all bind the same way. Static members are never part of the owner.
- `owner: 'module'`: the file's top-level scope. Fields are top-level `let` (or `var`) declarations; "methods" are
  every function at any depth in the file (`this` is not involved). A `const` cannot be a field (it cannot change).
- `field`, `token`, `send` are looked up on the owner: `'#x'` matches a `PropertyDefinition`/`MethodDefinition` with
  `PrivateIdentifier` `x`; `'x'` matches an `Identifier` key (JS public field or TS `private x`); for module owners,
  a top-level `let x` or `function x`.

### 2.2 Canonical `#send` (JS)

```js
#phase = FIX_PANEL.initial;
#flight = null;
#send(event) {
  const next = FIX_PANEL.states[this.#phase]?.on?.[event];
  if (next) this.#phase = next;
  return !!next;
}
```

Rules the lint enforces (section 3): the field initializer is `<NAME>.initial` (or the same string literal); `#send`
is the only method that assigns the field; its one assignment is `this.#phase = next` where `next` is bound exactly as
shown (optional chaining may be present or absent at each `?.`). Anything else in the body is free (a
`console.warn` on a refused event, as `190efd1` does, is fine).

A refused event (`#send` returns `false`) is not an error at runtime and the caller decides what to do with `false`.
That is the one place where "ignored" and "unhandled" meet: the table decides which it is, `sm on` reports it.

### 2.3 Canonical flight (JS)

```js
async #write(said, key) {
  if (!this.#send('take')) return;
  const flight = (this.#flight = {});                 // this run's token
  let left;
  try { left = await this.#host.applyAll(…); } catch (error) { left = { count: 1, why: error?.message }; }
  if (this.#flight !== flight) {                      // left or replaced while it ran
    this.#host.handOff?.(left);                       // ifLeft: 'handOff' (for 'drop': just return)
    return;
  }
  this.#flight = null;
  this.#send(left.count ? 'landedNone' : 'landedNext');
}
```

The counter form from `2d49db8` is equally canonical: `#run = 0;` as the token, `const run = ++this.#run;` to capture,
`if (run !== this.#run) return;` to guard. Choose per owner; the machine's `token` names the field.

What makes it exact: the token is captured in a `const` before the `await`; after the `await`, the first thing that
touches the owner is the guard; the "left" branch writes nothing on the owner (it may call out); everything after the
guard is the owner's again. Section 3.3 gives the AST shapes.

### 2.4 TypeScript variant

```ts
import type { Machine } from '../../tools/sm/types.js';

/** @machine */
export const SESSION: Machine = {
  id: 'session-worker', owner: 'Session', field: 'worker', token: 'flight', initial: 'created',
  cancel: ['close'],
  states: {
    created:    { on: { start: 'starting', close: 'closed' } },
    starting:   { flight: 'spawn', on: { ready: 'ready', failed: 'invalid', close: 'closed' } },
    ready:      { on: { died: 'dead', restart: 'restarting', close: 'closed' } },
    restarting: { flight: 'spawn', on: { ready: 'ready', failed: 'invalid', close: 'closed' } },
    dead:       { on: { restart: 'restarting', close: 'closed' } },
    invalid:    { on: { changed: 'restarting', close: 'closed' } },
    closed:     { final: true },
  },
  flights: { spawn: { ifLeft: 'drop' } },
};

export class Session extends EventEmitter {
  private worker: string = SESSION.initial;   // the phase (the handle moves to its own field)
  private flight: object | null = null;
  private send(event: string): boolean {
    const next = SESSION.states[this.worker]?.on?.[event];
    if (next) this.worker = next;
    return !!next;
  }
}
```

`tools/sm/types.d.ts`:

```ts
export interface MachineState { on?: Record<string, string>; ignores?: string[]; flight?: string; final?: true }
export interface Machine {
  id: string; owner: string; field: string; token?: string; send?: string; initial: string;
  cancel?: string[]; states: Record<string, MachineState>; flights?: Record<string, { ifLeft: 'drop' | 'handOff' }>;
}
```

The annotation form (`: Machine`) is the canonical TS form because its index signatures let the canonical `send` body
type-check under `noUncheckedIndexedAccess`. `as const` and `satisfies Machine` are accepted by the parser for owners
who want literal types now, but then `send` needs a cast, which is their business. The parser strips
`TSTypeAnnotation`, `TSAsExpression` (`as const` only) and `TSSatisfiesExpression` and reads the literal beneath.
Type-only imports are ignored (the "no imports" rule is about values in the table).

### 2.5 Module-level owners

`overlay/src/api.js` (overlay #16) holds its state in `let batched, queued, flushing`. Its machine:

```js
/** @machine */
export const BATCHER = {
  id: 'api-batcher', owner: 'module', field: 'mode', token: 'run', send: 'send', initial: 'batched',
  states: {
    batched: { on: { refused: 'direct' } },
    direct:  { on: { serverRestarted: 'batched' } },   // the latch gets a way home (overlay #16)
  },
};
let mode = BATCHER.initial;
let run = 0;
function send(event) {
  const next = BATCHER.states[mode]?.on?.[event];
  if (next) mode = next;
  return !!next;
}
```

Lint rules treat assignments to a top-level `let` named in the machine like `this.<field>` writes, except where a
parameter or inner declaration shadows the name.

### 2.6 Node owners

An `EventEmitter` subclass or a class that holds a child process binds like any class. The emitter's or process's
events are mapped to machine events in the one place they are subscribed:

```ts
worker.on('exit', (code) => { if (this.worker === 'ready' && code !== 0) this.send('died'); });
child.on('close', () => this.send('exited'));
```

Those callbacks are not `.then` chains, so `sm/flight-check` does not apply to them; the `send` inside them is a
synchronous reaction, and the table decides whether `died` is handled in the current state. For the engine's worker
(engine #2, "dead worker, no replacement") the table above makes `dead` a state with a way out, which is the bug.

## 3. Lint rules

Each rule applies to files in `include`. "Owner with a machine" means a class or module that a valid machine in the
same file names. A file whose machine has format errors still gets lint rules that need no machine (3.4, 3.5, 3.6).
All rules walk the oxc AST (ESTree shape; TS nodes are unwrapped). Positions are 1-based line and column.

Finding shape (section 5.2): `{ rule, level, file, line, column, endLine, endColumn, machine, key, message, fix }`.

### 3.1 `sm/single-writer` (error)

**Applies to**: owners with a machine.

**Matches**: an `AssignmentExpression` (any operator) or `UpdateExpression` whose target is
`MemberExpression { object: ThisExpression, property: PrivateIdentifier|Identifier = field }` (module: an `Identifier`
bound to the top-level `let` named `field`), anywhere in the owner except inside the method named `send`. Also:
the field's declaration initializer is neither `<NAME>.initial` nor a string literal equal to `initial`.

**Not matched**: writes to other fields; writes through aliases (`const self = this; self.#phase = …` is a syntax
error for private names anyway; for public fields it is not matched and not supported); writes inside nested
`function` expressions (where `this` is rebound) are matched only for module owners.

**Message**: `` `<field>` is written outside `<send>`. `` **Fix**: `` Call `this.<send>('<event>')` instead; add `<event>` to the states that accept it if it is missing. `` (for the initializer: `` Initialize it as `<field> = <NAME>.initial;`. ``)

**Fail** (overlay #2, risk 3: `stop()` sets `idle`, then a read lands and sets `ready`):

```js
stop() { this.#settle(); this.#state = 'idle'; this.#host.render(); }
async #read() { this.#state = 'reading'; … }
```

**Pass**:

```js
stop() { this.#settle(); this.#send('stop'); this.#host.render(); }
async #read() { if (!this.#send('read')) return; … }
```

### 3.2 `sm/known-event` and `sm/send-literal` (error)

**Applies to**: owners with a machine.

**`sm/send-literal` matches**: a `CallExpression` whose callee is `this.<send>` (module: `<send>`) whose first
argument is not a string literal, and not a `ConditionalExpression` whose both arms are string literals (nesting of
conditionals allowed).

**Message**: `` `<send>` takes a string literal (or a conditional of literals), so the oracle can read it. ``
**Fix**: `` Replace the argument with the literal event names, one per branch. ``

**`sm/known-event` matches**: such a call whose literal (each literal, for conditionals) is in no state's `on`.
Events only in `ignores` count as unknown (an event nobody handles is a typo or a missing transition).

**Message**: `` `<send>('<event>')`: no state handles `<event>` (events: <sorted list>). ``
**Fix**: `` Add `<event>` to the `on` of the states that accept it, or use one of <three nearest by edit distance>. ``

**Fail** (overlay #7: `refused` is announced but never stored, a name the lifecycle table does not know; in the
declared world this is a send of a nameless event):

```js
if (!health.ready) { this.#send('refuse'); return; }   // table has no 'refuse'
```

**Pass**: `this.#send('refused')` after `refused` is added to `off.on` and `leaving.on`.

### 3.3 `sm/flight-check` (error)

**Applies to**: owners with a machine. Within them, to every function that is lexically inside the owner and binds
`this` lexically: async methods, async arrow functions, and the callback arguments of `.then(…)`, `.catch(…)`,
`.finally(…)` when the callback is an arrow or an async arrow (module owners: every function). A `function`
expression inside a class is skipped (`this` is something else). A `.then(this.#landed)` with an identifier callback is
skipped (nothing to look inside; the referenced method is checked on its own only if it is async).

**Definitions**:

- A **write** is: an `AssignmentExpression`/`UpdateExpression` whose target is a depth-one owner field
  (`this.<any field>`, private or public, including `field` and `token`; module: any top-level `let`); a
  `CallExpression` of `this.<send>` (module: `<send>`); or a `CallExpression` of `this.<m>` where `<m>` is a
  **writing method** of the owner: a method whose own body (not its nested functions) contains such an assignment,
  update or `send` call. The set of writing methods is computed once per owner, without recursion through calls
  (a method that only calls another writing method is not one; that keeps the set exact and cheap). `this.#el.hidden = x`
  (depth two), `this.#map.set(…)` (a call on a field), and writes to locals are not writes.
- An **await point** is: an `AwaitExpression`; the head of a `for await`; or the start of a then/catch/finally
  callback body (the callback runs after the promise settles, which is an await in all but spelling, and overlay #4's
  bug lives in a `.catch`).
- A write W is **after** an await point A when A ends before W starts in the same function body, or A is inside W's
  right-hand side (`this.#page = await read()` completes after the await).
- A **token capture** is `const <id> = <init>` where `<init>` is `this.<token>`, `++this.<token>`, or
  `this.<token> = {}` (with or without parentheses). It may sit in the function itself or in any enclosing function of
  the owner (a method captures `run`, its `.then` callback uses it). `this.<token>++` as an initializer is not a
  capture (it yields the old value; that is a bug the rule should not bless).
- A **token test** is `<id> !== this.<token>` / `this.<token> !== <id>` (negative) or the same with `===`
  (positive), where `<id>` is a captured token in scope. `!(positive)` is negative.
- A **guard** is either
  - **G1, early return**: `if (<test>) <stop>` where `<test>` is a negative token test, or a `||` chain with a negative
    token test as a direct operand, and `<stop>` is `return …;`, `throw …;`, or a block whose last statement is one of
    those. Every statement after G1 in the same block (and everything nested in them) is guarded, until the next await
    point. Nothing inside `<stop>` is guarded (so a write in the left branch is reported, which is what `ifLeft`
    demands).
  - **G2, wrapping**: `if (<test>) <then>` where `<test>` is a positive token test, or an `&&` chain with one as a
    direct operand. Everything inside `<then>` is guarded. The `else` is not.
- A write W is **guarded** when some guard G, with G after W's nearest preceding await point, guards W.

**Matches**: a write that is after an await point and not guarded.

**Not matched**: writes before the first await point; `if (!this.#live(run)) return` or any other helper call (the test
must be inline, so the rule stays exact; `630d16f`'s `#live(run)` becomes `if (!this.#running || run !== this.#run)
return`); phase comparisons (`if (this.#phase === 'writing')`, the `mine` pattern in `190efd1`) are not guards, because
a state can be left and re-entered while the flight is out, and only the token knows; writes in synchronous event
callbacks (`on('exit', …)`, `addEventListener`), which are not after an await.

**Message**: `` `<target>` is written after an await with no check that this run is still current. ``
**Fix**: `` Before the await: `const flight = (this.<token> = {});` (or `const run = ++this.<token>;`). After it: `if (this.<token> !== flight) return;` then the write. ``

**Fail 1** (overlay #2, risk 3; `cleanup.js` `#read` before `2d49db8`):

```js
async #read() {
  this.#state = 'reading'; this.#err = null; this.#host.render();
  try {
    const said = await post('system', { census, scope: 'project', route: location.pathname });
    this.#p = said?.proposal ?? null;                                   // reported
    this.#state = this.#page.moves ? 'ready' : 'nothing';              // reported
  } catch (error) {
    this.#state = /no census/i.test(error?.message ?? '') ? 'no-census' : 'error';   // reported (catch is after the await)
  }
}
```

**Pass** (`2d49db8`'s shape, with `#send`):

```js
async #read() {
  if (!this.#send('read')) return;
  const run = ++this.#run;
  try {
    const said = await post('system', …);
    if (run !== this.#run) return;
    this.#p = said?.proposal ?? null;
    this.#send(this.#page.moves ? 'ready' : 'nothing');
  } catch (error) {
    if (run !== this.#run) return;
    this.#err = error?.message ?? null; this.#send('failed');
  }
}
```

**Fail 2** (overlay #4: a `.catch` guarded by `#running` only; an old request's failure parks the new run):

```js
const run = this.#run;
this.#host.readMarks(item.el, …)
  .then((state) => { if (this.#running) this.#landed(item, state); })      // reported: #landed is a writing method
  .catch((error) => { if (this.#running) this.#parked([item], error); })   // reported: #parked writes #pending
  .finally(() => { if (run === this.#run) this.#inflight--, this.#settle(); });   // guarded (G2)
```

`#parked` is synchronous, so its own body is clean; the call to it inside the `.catch` callback is the write, and
`this.#running` is not a token test. Message for this case:
`` `#parked` (which writes `#pending`) is called after an await with no check that this run is still current. ``

**Pass**: `.catch((error) => { if (!this.#running || run !== this.#run) return; this.#parked([item], error); })`,
and the same for `.then`.

**Fail 3** (engine #1, TS, module `src/session/engine.ts`): `this.tag = previous` in a `finally` after `await
… .apply(this, args)` with no token. **Pass**: capture `const flight = ++this.flight` before, `if (flight !== this.flight) return` in `finally` before the restore (the unguarded restore is the LIFO bug the audit names).

**Fail 4** (overlay #16, module owner): `if (!response.ok) { batched = false; … }` after `await fetch(…)` in
`flush()`. **Pass**: `const run = ++flushRun;` at the top of `flush`, `if (run !== flushRun) return;` after the fetch,
then `send('refused')`.

### 3.4 `sm/pointer-pair` (error)

**Applies to**: every class and every module in `include` (a drag needs no machine to need a cancel).

**Matches**: an owner in which there is a call `X.addEventListener('pointermove', …)` **and** a call
`Y.addEventListener('pointerup', …)` (any targets, any handlers; the bare global `addEventListener(…)` counts) and no
call `Z.addEventListener('pointercancel', …)`. Reported once per owner, at the `pointermove` call.

**Not matched**: owners with `pointermove` only (hover tracking, overlay #24's marks layer); `onpointermove` property
assignments; React props. A drag is an owner that tracks both move and up.

**Message**: `` This owner tracks pointermove and pointerup but never pointercancel; a cancelled pointer leaves the drag live. ``
**Fix**: `` Add `addEventListener('pointercancel', cancel)` where pointerup is added, with `cancel = () => end(false)`, and remove it where pointerup is removed. ``

**Fail** (overlay #6, `elementcard.js` `#press` before `87fb314`): `addEventListener('pointermove', move); addEventListener('pointerup', up);` with no cancel. Also overlay #22, `scrub.js` (module owner).
**Pass**: `87fb314`'s shape: `const cancel = () => end(false); … addEventListener('pointercancel', cancel);`.

### 3.5 `sm/listener-pair` (error)

**Applies to**: every class and module in `include`.

**Matches**: a call `T.addEventListener(<string literal ev>, <Identifier h>, …)` where `T` is `window`, `document`,
`globalThis`, or absent (bare call), the third argument (if any) is not an object literal with a `once: true` or a
`signal` property, and no call `T'.removeEventListener('<ev>', h, …)` with the same literal and the same identifier
exists anywhere in the same owner (any `T'` in the same set). Also: such a call whose handler is an inline function
or arrow (it has no name, so it can never be removed), under the same `once`/`signal` exemption.

**Not matched**: element targets (`this.#el.addEventListener`, the owner's own DOM goes with the owner); `once` and
`signal` listeners; handlers that are member expressions (`this.#unhint`): these are matched by text equality of the
member chain instead (`addEventListener('keydown', this.#unhint, true)` pairs with `removeEventListener('keydown', this.#unhint, true)`).

**Message**: `` `<ev>` is listened for on <target> and never removed in this owner. `` (inline: `` …with a handler that has no name, so it cannot be removed. ``)
**Fix**: `` Name the handler, add `removeEventListener('<ev>', <h>)` on the exit path (`close`/`destroy`/`disconnectedCallback`), or pass `{ signal }` from an AbortController the exit aborts. ``

**Fail** (overlay #11: `elementcard.js:256` `addEventListener('keydown', space, true); addEventListener('keyup', space, true);` with no destroy; overlay #12 risk 6: history's scroll/resize listeners).
**Pass** (overlay #1, risk 6): `#undo` adds `pagehide` with `leave` and removes it on every path.

### 3.6 `sm/timer-handle` (error)

**Applies to**: owners with a machine.

**Matches**: an `ExpressionStatement` whose expression is a `CallExpression` of `setTimeout`, `setInterval`,
`window.setTimeout`, `window.setInterval`, `globalThis.setTimeout`, `globalThis.setInterval`, or
`requestAnimationFrame` (bare or on `window`), i.e. the handle is dropped.

**Not matched**: the call as an initializer, assignment value, argument, return value, or arrow expression body
(`new Promise((r) => setTimeout(r, ms))` is the sleep idiom and is not an `ExpressionStatement`). Timers in owners
without a machine (elsewhere an untracked timer is a judgment call; inside a machine it can fire into a state that
left).

**Message**: `` The <timer> handle is dropped; it can fire after this owner moved on. ``
**Fix**: `` Store it: `this.<name>Timer = <timer>(…)`, and `clear<Timeout|Interval>(this.<name>Timer)` on the exit path and before starting it again. ``

**Fail** (overlay #1, risk 2: `celebrate()` clears `#foldTimer` but `fold` returns a timer never stored; overlay #12
risk 1: the inner `setTimeout(() => { this.#toast.hidden = true; }, 160)` in `#say`; overlay #20: the 0 ms timer in
`help.js:122`). **Pass**: `190efd1`: `this.#foldTimer = setTimeout(…)`.

### 3.7 `sm/mode-flags` (advice, never blocks)

**Applies to**: every class in `include` with no machine.

**Matches**: a class with two or more fields whose declaration initializer is `true` or `false`, where each of those
fields is assigned in three or more distinct methods and read in at least one `if`/ternary/`&&`/`||` test in the
class.

**Message**: `` `<Class>` steers on <n> booleans (<names>) written from <m> methods; that is a machine without a table. ``
**Fix**: `` Declare a `@machine` with one `field`, list the states those flags encode, and route every write through `#send`. ``

**Example** (overlay #1 before `190efd1`: `#on #holding #keeping #writing #undoing #done`). Reported once per class at
the class name.

### 3.8 `sm/send-shape`, `sm/send-missing` (error)

**Applies to**: owners with a machine.

**`sm/send-missing`**: the owner has no method/function named `send`. Message: `` `<owner>` has no `<send>`. ``
Fix: the canonical body from 2.2 (module: 2.5), as text.

**`sm/send-shape`** matches a `send` method where any of these fails: it has exactly one parameter; it contains
exactly one assignment to `field`, of the form `this.<field> = <id>`; `<id>` is declared in the same body as
`const <id> = <NAME>.states[this.<field>].on[<param>]` with optional `?.` at each of the three steps; that assignment
is the consequent of `if (<id>)`. Message: `` `<send>` must look up the next state in the table and assign it once. ``
Fix: the canonical body.

### 3.9 `sm/parse` (error)

A file in `include` that oxc cannot parse. Message: oxc's first error message. Fix: `` Fix the syntax error; nothing in this file was checked. `` Line and column from oxc's span.

## 4. Graph checks

Run on the canonical table alone, after format checks pass. All blocking. Reported at the machine's `states` key, or
at the named state's key. Reachability uses BFS over states in sorted order, events in sorted order.

| rule | definition | message | fix |
|---|---|---|---|
| `sm/graph-unreachable` | a state not reachable from `initial` by following `on` edges | `` `<state>` can never be entered: no path from `<initial>` reaches it. `` | `` Add a transition into `<state>` from a reachable state, or remove it. `` Example: overlay #25, the walkthrough's steps with no entry. |
| `sm/graph-dead-end` | a non-final state whose `on` is empty or absent | `` `<state>` has no way out and is not final. `` | `` Add transitions out of `<state>`, or mark it `final: true` if nothing can happen after it. `` Example: overlay #17's `fallback` must say `final: true`. |
| `sm/graph-no-way-home` | a non-final state from which neither `initial` nor any final state is reachable | `` From `<state>` there is no path back to `<initial>` or to a final state: a latch. `` | `` Add the event that ends it (a restart, a reset), or mark the end of the road `final: true`. `` Example: overlay #16, `batched = false` forever; engine #3, a failed host Session never evicted. |
| `sm/graph-cancel-gap` | a cancel event in neither `on` nor `ignores` of a non-final state | `` `<state>` does not decide what `<event>` does. `` | `` Add `<event>: '<target>'` to its `on`, or `'<event>'` to its `ignores` with a comment saying why. `` Example: overlay #1 risk 1, `writing` with no answer for Esc. |
| `sm/graph-flight-no-landing` | a state with `flight` whose `on` has only cancel events (or none) | `` Flight `<flight>` can never land: `<state>` has no non-cancel event out. `` | `` Add the event the result sends (`landed`, `failed`). `` |

`sm gaps` is these five checks; `sm check` includes them.

## 5. The CLI

Invocation: `node tools/sm/bin.mjs <command> [args] [flags]`. All output is JSON on stdout, 2-space indented, keys
sorted at every level, trailing newline, no timestamps, no colours. Nothing goes to stderr except in `--hook` mode.
Paths are relative to the repo root with `/`. Lists are sorted as stated per command; where not stated, by the first
field.

Global flags: `--no-cache`, `--no-log`, `--root <dir>` (the repo root; default: nearest ancestor of the cwd holding
`.state/config.json`), `--advice` (include advisory findings; default off for queries, on for `check`).

Exit codes, for every command: `0` answered; `1` the answer contains error-level findings (`check`, `gaps`);
`2` usage error (unknown command, unknown machine, unknown state, bad flag, missing config); `3` the tool itself
failed (uncaught error, unreadable cache). Codes 2 and 3 print `{ "error": { "code", "message" }, "schema": 1 }`.

Usage error codes: `unknown-command`, `unknown-machine` (message lists the ids), `unknown-state` (lists the states),
`no-config`, `bad-flag`, `bad-ref` (diff), `file-outside-include`.

Every success object carries `"schema": 1` and `"command": "<name>"`.

### 5.1 Commands

**`sm list`** → every machine in `include`.

```json
{ "command": "list", "machines": [ { "cancel": ["close","escape","unmount"], "events": ["close","escape",…], "field": "#phase", "file": "overlay/src/fixpanel.js", "final": [], "flights": ["undo","write"], "id": "fix-panel", "initial": "closed", "line": 283, "owner": "FixPanel", "states": ["closed","holding",…] } ], "schema": 1 }
```

Sorted by `id`. Files with format errors appear in `"invalid": [{ "file", "findings": […] }]` and exit code stays 0
(use `check` to fail on them).

**`sm show <id>`** → the canonical JSON (1.6) plus `file` and `line`:

```json
{ "command": "show", "machine": { "cancel": […], "field": "#phase", "file": "…", "flights": [ { "ifLeft": "handOff", "name": "write" } ], "id": "fix-panel", "initial": "closed", "line": 283, "owner": "FixPanel", "send": "#send", "states": [ { "final": false, "flight": null, "ignores": [], "name": "closed", "on": [ { "event": "open", "to": "resting" } ] }, … ], "token": "#flight" }, "schema": 1 }
```

**`sm on <id> <state> <event>`**:

```json
{ "command": "on", "event": "escape", "machine": "fix-panel", "result": "to", "state": "holding", "to": "resting", "schema": 1 }
```

`result` is `to` (with `to`), `ignored` (`to: null`), or `unhandled` (`to: null`). Unknown machine/state → exit 2. An
unknown event is a legal question: `unhandled`.

**`sm paths <id> <state>`** → the shortest event path from `initial`:

```json
{ "command": "paths", "machine": "fix-panel", "path": [ { "event": "open", "from": "closed", "to": "resting" }, { "event": "hold", "from": "resting", "to": "holding" } ], "reachable": true, "state": "holding", "schema": 1 }
```

BFS, states visited in sorted order, events in sorted order, so ties break the same way every run. Unreachable:
`"path": null, "reachable": false`.

**`sm gaps [<id>]`** → `{ "command": "gaps", "findings": [ … ], "schema": 1 }` for one or all machines. Exit 1 if any.

**`sm check [files…] [--baseline <path>] [--staged] [--hook] [--changed-since <ref>]`** → lint, format and graph
findings for the given files (default: every file in `include`; `--staged`: files in the git index; `--changed-since`:
files changed since a ref, through `git diff --name-only`). Files given but outside `include` go to `skipped`.

```json
{ "command": "check", "files": ["overlay/src/cleanup.js"], "findings": [ { "column": 7, "endColumn": 29, "endLine": 186, "file": "overlay/src/cleanup.js", "fix": "…", "key": "sm/flight-check|overlay/src/cleanup.js|Cleanup.#read|#p|1", "level": "error", "line": 186, "machine": "cleanup", "message": "…", "rule": "sm/flight-check" } ], "schema": 1, "skipped": [], "suppressed": 0, "summary": { "advice": 0, "error": 1 } }
```

Findings sorted by `file`, `line`, `column`, `rule`, `key`. With `--baseline`, findings whose `key` is in the baseline
are dropped and counted in `suppressed`. Exit 1 if any error-level finding remains.

`--hook` (section 8.1): read Claude Code's hook JSON from stdin, take `tool_input.file_path`, run `check` on that one
file with `--baseline .state/baseline.json` if it exists; if error-level findings remain, print the JSON to **stderr**
and exit 2; otherwise print nothing and exit 0. A file outside `include` exits 0 silently.

**`sm diff <ref> [files…]`** → machines changed between `<ref>` (`git show <ref>:<path>`) and the working tree:

```json
{ "command": "diff", "machines": [ { "change": "changed", "id": "fix-panel", "states": { "added": ["keeping"], "removed": [] }, "transitions": { "added": [ { "event": "keep", "from": "holding", "to": "keeping" } ], "removed": [] }, "cancel": { "added": [], "removed": [] }, "flights": { "added": [], "removed": [], "changed": [] }, "ignores": { "added": [ { "event": "escape", "state": "writing" } ], "removed": [] } } ], "ref": "main", "schema": 1 }
```

`change` is `added`, `removed` or `changed`; `added`/`removed` machines carry empty detail. Sorted by `id`. Files
at the ref are those matching `include` in `git ls-tree -r --name-only <ref>`, pre-filtered by the text `@machine`.

**`sm baseline write [--allow-growth]`** → regenerates `.state/baseline.json` from a full `check`. If the new key
set contains keys not in the old file and `--allow-growth` is absent: write nothing, print
`{ "error": { "code": "baseline-growth", "message": "…", "new": [keys] } }`, exit 1. **`sm baseline show`** prints
the file. Shape: `{ "schema": 1, "keys": [sorted keys] }`.

**`sm cache clear`** → removes `.state/cache/`.

### 5.2 Finding schema

| field | type | notes |
|---|---|---|
| `rule` | string | `sm/…` |
| `level` | `"error"` or `"advice"` | |
| `file` | string | repo-relative |
| `line`, `column`, `endLine`, `endColumn` | integers, 1-based | from the oxc span of the matched node |
| `machine` | string or null | the id, when the finding belongs to one |
| `key` | string | section 6.2 |
| `message` | string | exact text from sections 1.5, 3, 4 |
| `fix` | string | one instruction |

### 5.3 Determinism rules

- Keys sorted at every object level (`JSON.stringify` with a replacer that sorts), arrays ordered as each command says.
- No timestamps, durations, absolute paths, machine names, or environment values in any answer.
- The cache changes speed only: `--no-cache` must give byte-identical output. A test asserts it (section 9).
- Spans come from the parser; the tool never reads the clock in an answer path.
- `diff` and `--staged` call `git` with fixed arguments and `LC_ALL=C`; output depends on the repo contents only.

## 6. The log

### 6.1 Schema

`.state/log.jsonl`, one JSON object per line, written by every command unless `--no-log`. Fields:

```json
{ "seq": 1041, "at": "2026-11-07T10:12:03.412Z", "kind": "drift", "rule": "sm/flight-check", "file": "overlay/src/cleanup.js", "line": 186, "machine": "cleanup", "key": "sm/flight-check|overlay/src/cleanup.js|Cleanup.#read|#p|1", "detail": "`#p` is written after an await with no check that this run is still current." }
```

`kind`:
- `asked`: a query (`list`, `show`, `on`, `paths`, `gaps`, `diff`). `detail` is the argv joined by spaces; `machine`
  when one was named.
- `drift`: a `check` reported an error-level finding whose key is not already open. Opening it adds the key to
  `.state/open.json`.
- `aligned`: a `check` covered the file and the open key was not reported. Carries `resolves: <seq of the drift>`.
  The key is removed from `open.json`.
- `machine-changed`: a `check` or `list` saw a machine whose canonical hash (1.6) differs from the hash stored for
  that id in the cache index. `detail` is the `diff`-style summary against the cached table (states and transitions
  added/removed).

`seq` is a monotonic integer from `.state/open.json` (`{ "nextSeq": n, "open": { "<key>": seq } }`). `at` is the
only timestamp the tool ever writes; it never reaches stdout.

### 6.2 The stable key

`<rule>|<file>|<scope>|<detail>|<n>`:

- `scope`: `Owner.method` (`Cleanup.#read`), `Owner.<field>` for a field-declaration finding, `module.flush` for a
  module function, `Owner` for class-level findings (`pointer-pair`, `mode-flags`), `machine:<id>` for format and
  graph findings.
- `detail`: the written field or sent event (`flight-check`, `single-writer`, `known-event`), `<ev>:<handler>`
  (`listener-pair`), the timer name (`timer-handle`), the state or key name (format, graph), empty otherwise.
- `n`: 1-based ordinal among findings that share `rule|file|scope|detail`, in source order.

Line numbers are not part of it, so an edit above the method does not open a new drift. Renaming the method or
reordering the writes does; that is accepted. When one of two same-detail findings in a method is fixed, the survivor
takes `n = 1` and `n = 2` is logged as aligned; the view built later reads this as "one of two fixed".

### 6.3 Rotation

When `log.jsonl` exceeds 5 MB after a write, it is renamed to `log.1.jsonl` (replacing any previous one) and a new
file starts. `seq` keeps counting (it lives in `open.json`), so a `resolves` can point into the rotated file; a reader
looks in `log.jsonl` then `log.1.jsonl`. Older history is gone by design.

## 7. Implementation choices

### 7.1 Parser: oxc-parser (recommended)

`oxc-parser@0.153.0` is already in `dependencies` and used by `src/data-config.ts`, `src/try.ts`,
`src/collect/*.ts`. It parses JS, JSX, TS and TSX from one `parseSync(filename, text, { lang })` call, returns an
ESTree-shaped `program`, the `comments` array with spans (needed to find `/** @machine */`), and error diagnostics
with spans. It is a native binding (`@oxc-parser/binding-darwin-arm64` is installed) with a wasm fallback.

Rejected: **acorn** parses JS only; TS needs `acorn-typescript`, which is unmaintained, so the engine's `.ts` owners
would need a second parser. **TypeScript's parser API** parses everything but is a different AST shape, is slower
(prediction: tens of ms per file against low single-digit ms for oxc), and tempts type-checker use on the per-edit
path, which the owner excluded.

Node positions: oxc gives `start`/`end` byte offsets; the tool computes line/column once per file from a line-start
table. With `range: true` the ESTree `range` is also present; the tool uses `start`/`end`.

### 7.2 Lint host: inside `sm check` (recommended)

Not an ESLint plugin, not an oxlint plugin. Reasons:
- `known-event`, `single-writer`, `send-shape` and `flight-check` need the machine table and the AST in one pass; a
  lint plugin would parse and extract the table again, or read it from a side channel.
- One parse per file serves machine extraction, graph checks and lint. An ESLint run adds its own parse, config
  loading and startup (prediction: hundreds of ms per invocation, which alone breaks the 100 ms budget).
- oxlint's JS plugin API is alpha (research, section 4); building on it means tracking its churn.
- The output schema, exit codes and the log are ours; a host would wrap them.

An ESLint adapter that shells out to `sm check --format eslint` can be added later for editors (section 12). It adds
nothing to the checks.

### 7.3 Caching

- Per file: `.state/cache/<sha1>.json` where `sha1 = SHA-1(toolVersion + '\0' + configHash + '\0' + file + '\0' + contents)`. Contents: `{ machines: [canonical…], findings: [...], hash }`. Findings are per file by construction
  (owner and machine share a file), so a cache hit is exact. The whole-repo-only check (`machine-id-duplicate`) runs on
  the aggregate, outside the cache.
- Index: `.state/cache/index.json`: `{ "<id>": { "file", "hash" } }` so `on`/`show`/`paths` open one file: read it,
  hash it, use the cache entry if the hash matches, else re-extract and update. If the id is not in the index (or the
  file moved), fall back to scanning `include` for the text `@machine` and parsing those files only.
- `machine-changed` log entries come from comparing the new canonical hash with the index's.
- Nothing in the cache is needed for correctness. `--no-cache` ignores and does not write it.

### 7.4 File discovery

`tinyglobby` (already a dependency) over `include` minus `exclude`, results sorted. For `check` on named files, no
glob: the names are matched against the patterns with `picomatch`. For whole-repo commands, a file is parsed only
when it is in `include`; machine extraction is attempted only when the text contains `@machine` (a substring test
before parsing), but lint rules 3.4, 3.5, 3.7 need every file parsed, so whole-repo `check` parses them all and the
cache carries the repeated runs.

### 7.5 Bench plan

Run with no dev servers up (`~/.claude/bin/dev-server --list` first; the laptop has 16 GB). Numbers are not known
until this runs; everything below marked *prediction* is a guess to be replaced by the measurement.

```sh
# 0. the floor: Node start-up alone
hyperfine --warmup 3 --runs 30 'node -e 0'
# 1. parser floor: every included file, 20 passes, min/median per file and for the set
node tools/sm/bench/parse.mjs
# 2. per-file budget (< 100 ms median, process start included)
hyperfine --warmup 3 --runs 30 'node tools/sm/bin.mjs check overlay/src/fixpanel.js --no-log'
hyperfine --warmup 3 --runs 30 'node tools/sm/bin.mjs check src/session/engine.ts --no-log'   # the biggest file, 1.9k lines
hyperfine --warmup 3 --runs 30 'node tools/sm/bin.mjs on fix-panel holding escape --no-log'
# 3. whole repo (< 2 s), cold cache and warm cache
hyperfine --warmup 1 --runs 10 --prepare 'rm -rf .state/cache' 'node tools/sm/bin.mjs check --no-log'
hyperfine --warmup 1 --runs 10 'node tools/sm/bin.mjs check --no-log'
hyperfine --warmup 1 --runs 10 'node tools/sm/bin.mjs check --no-cache --no-log'
```

If `hyperfine` is not installed (`brew install hyperfine`), `node tools/sm/bench/cli.mjs` spawns the same commands 30
times and prints min/median. The bench scripts live in `tools/sm/bench/` and are not run by the test suite.

Predictions, to be replaced: Node start-up 35–50 ms on this machine; oxc parse 1–3 ms per thousand lines, so the
included set (~48k lines: 22k overlay JS, 26k engine TS) parses in 100–200 ms; a per-file `check` lands at 50–80 ms
with Node start-up as the largest part; whole-repo cold under 1 s, warm under 300 ms. If the per-file number misses
100 ms, the first lever is start-up (`--snapshot-blob`, or lazy-loading the git and diff code paths), not the parser.

## 8. Agent-loop wiring

### 8.1 Post-edit hook (Claude Code)

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write|MultiEdit", "hooks": [ { "type": "command", "command": "node tools/sm/bin.mjs check --hook" } ] }
    ]
  }
}
```

Claude Code pipes the tool call as JSON on stdin; `--hook` reads `tool_input.file_path`. Exit 2 with the findings on
stderr is what Claude Code feeds back to the agent; exit 0 is silent. The baseline applies, so the agent sees only
drift it introduced (plus anything it touched that was not yet in the baseline, which is the point).

### 8.2 Pre-commit and CI

- `scripts/pre-commit.mjs` (wired by `git config core.hooksPath .githooks`, with `.githooks/pre-commit` calling it):
  `node tools/sm/bin.mjs check --staged --baseline .state/baseline.json`; a non-zero exit blocks the commit and
  prints the JSON.
- CI step: `node tools/sm/bin.mjs check --baseline .state/baseline.json`. Same exit rule.
- Debt only shrinks: `sm baseline write` refuses new keys (5.1). Removing fixed keys is a normal commit; adding keys
  needs `--allow-growth` in the commit message's reasoning and the flag on the command.

### 8.3 Project instruction

One line in each project `CLAUDE.md`:

> State: every phase field has a `/** @machine */` table in its file; change it only through `#send(event)`; before
> writing async code or a test, ask `npm run sm -- on|paths|gaps <machine> …`; `sm check` runs on every edit and its
> JSON is the fix list.

## 9. Test plan

Integration tests only: every test spawns the real CLI (`node tools/sm/bin.mjs …`) on fixture files inside a
temporary repo root (a temp dir with its own `.state/config.json` whose `include` is `*.js`/`*.ts`), parses the JSON,
and asserts rule, line, key and exit code. No module of the tool is imported by a test. Files: `e2e/sm-format.test.mjs`,
`e2e/sm-graph.test.mjs`, `e2e/sm-lint.test.mjs`, `e2e/sm-cli.test.mjs`, `e2e/sm-loop.test.mjs`, picked up by
`scripts/test.mjs` as every `e2e/*.test.mjs` is.

Each lint/graph fixture is a pair `before.<ext>` / `after.<ext>` under `e2e/fixtures/sm/<rule>/<name>/`, where
`before` is the audited code cut down to the owner and the lines around the bug, with a machine added, and `after` is
the same with the canonical fix. The test asserts: `before` yields exactly the expected finding(s) (rule, line, key),
`after` yields none for that rule, and running `check` twice on `before` gives byte-identical stdout.

Fixtures:

| rule | fixture | source |
|---|---|---|
| `sm/single-writer` | `single-writer/cleanup-stop` | overlay #2 risk 3, `cleanup.js` `stop()`/`#read` |
| `sm/known-event`, `sm/send-literal` | `known-event/blueprint-refused`, `known-event/template-arg` | overlay #7 |
| `sm/flight-check` | `flight-check/cleanup-read` (await + catch), `flight-check/reader-catch` (then/catch chain, sync helper write), `flight-check/engine-traced.ts` (TS, finally), `flight-check/api-flush` (module owner), `flight-check/assign-await` (`this.#x = await f()`), `flight-check/capture-in-parent` (token captured in the method, tested in the callback: must pass) | overlay #2, #4, engine #1, overlay #16 |
| `sm/pointer-pair` | `pointer-pair/elementcard-press`, `pointer-pair/scrub-module`, `pointer-pair/marks-hover` (pointermove only: must pass) | overlay #6, #22, #24 |
| `sm/listener-pair` | `listener-pair/elementcard-space`, `listener-pair/history-scroll-inline`, `listener-pair/fixpanel-pagehide` (must pass), `listener-pair/signal` (must pass) | overlay #11, #12, #1 |
| `sm/timer-handle` | `timer-handle/fixpanel-fold`, `timer-handle/history-toast-inner`, `timer-handle/help-zero`, `timer-handle/sleep-idiom` (must pass) | overlay #1, #12, #20 |
| `sm/mode-flags` | `mode-flags/fixpanel-six-flags` (advice, level `advice`, exit 0) | overlay #1 |
| `sm/send-shape`, `sm/send-missing` | `send-shape/to-state` (the `#to(next)` shape from `190efd1`: fails), `send-shape/canonical-ts.ts` (passes) | `190efd1` |
| format (1.5) | one fixture per rule under `format/<rule-suffix>`; `format/escape-key-name` for `Escape` | draft open question 3 |
| `sm/graph-unreachable` | `graph/walkthrough-steps` | overlay #25 |
| `sm/graph-dead-end` | `graph/sourcemap-fallback` (fails without `final`, passes with) | overlay #17 |
| `sm/graph-no-way-home` | `graph/api-latch` | overlay #16 |
| `sm/graph-cancel-gap` | `graph/fixpanel-writing-escape` | overlay #1 risk 1 |
| `sm/graph-flight-no-landing` | `graph/flight-only-cancel` | constructed |
| `sm/parse` | `parse/broken.js` | constructed |

CLI tests (`sm-cli.test.mjs`): `list`/`show`/`on`/`paths` against the fix-panel fixture, including `ignored` and
`unhandled` answers and an unreachable `paths`; exit codes 1/2/3 with the documented error shapes; `--no-cache`
equals cached output byte for byte; `diff` against a temp git repo with two commits (state added, transition removed,
machine removed); determinism across two runs for every command.

Loop tests (`sm-loop.test.mjs`): `--hook` with a stdin payload (exit 2 + stderr JSON, then exit 0 after the fix);
`baseline write` refusing growth and accepting shrink; the log: a `drift` line on the first check, an `aligned` line
with the right `resolves` after the fix, a `machine-changed` line after editing the table, and rotation when the file
is pre-filled past 5 MB.

Real-app proof (owner rule: real app first): after layer 3, `e2e/blueprint.test.mjs` "Esc while a fix is being
written…" and `e2e/text-edit.test.mjs` "while the words are being saved…" must still pass on the converted owners, and
`sm check overlay/src/fixpanel.js overlay/src/text-edit.js` must be clean.

## 10. Build order

Each layer is committed alone with its proof. No layer starts before the previous one's proof passes.

1. **Format, graph, queries.** `tools/sm/`: config, discovery, oxc parse, `@machine` extraction, canonical JSON,
   format errors, graph checks, `list`/`show`/`on`/`paths`/`gaps`, exit codes, sorted output. Done when
   `sm-format.test.mjs`, `sm-graph.test.mjs` and the query half of `sm-cli.test.mjs` pass, and `hyperfine` step 2 for
   `on` is under 100 ms (recorded in the commit message).
2. **Core lint.** `single-writer`, `send-shape`/`send-missing`, `known-event`/`send-literal`, `flight-check`;
   `check` with the finding schema; `parse`. Done when their fixtures pass before/after and the determinism test
   passes.
3. **First users.** Convert `fixpanel.js` (from `MOVES`/`#to` to the table and `#send`; its events as in 1.1) and
   `text-edit.js` on `explicit-machines`, plus `cleanup.js` (already has `#run`). Done when `sm check` is clean on the
   three files, the three existing e2e proofs still pass, and `sm paths fix-panel keeping` answers.
4. **Remaining rules, diff, log.** `pointer-pair`, `listener-pair`, `timer-handle`, `mode-flags`, `diff`, the
   log with `open.json` and rotation, the cache and index. Done when `sm-lint.test.mjs` is complete, the log tests
   pass, and `hyperfine` step 3 is under 2 s cold.
5. **Loop.** `--hook`, `.claude/settings.json`, pre-commit, CI step, `baseline write` and the first baseline (the
   repo's current debt, committed). Done when `sm-loop.test.mjs` passes and one real edit in a Claude Code session
   shows the stderr JSON.
6. **Engine owners.** Declare machines for engine #2 (worker lifecycle) and engine #4 (transaction/hold) in TS using
   2.4; fix the dead-worker and overlapping-apply bugs through them. Done when `sm check src/session/engine.ts
   src/hosts/vite.ts` is clean and the apply-all e2e tests pass.
7. **Human view** of the log: its own design pass, after everything above.

## 11. Risks and open questions

Risks:
- **Node start-up may eat the per-file budget.** If step 2 of the bench shows start-up above ~60 ms, a `check` cannot
  reach 100 ms by parser work alone. Levers, in order: lazy `import()` of git/diff/log code; a V8 startup snapshot;
  as a last resort, a `--batch` mode that checks several files per process so the hook amortizes (one process per
  edit is still the model; no daemon, by the memory rule).
- **`flight-check` strictness on legitimate post-await writes.** A write such as `this.#inflight--` in a `.finally`
  is reported unless guarded. The rule is exact (no false matches of its pattern) but demanding; the repo's own
  reader already guards exactly that way (`630d16f`). Accepted.
- **Phase-check idiom is rejected.** `190efd1`'s `const mine = this.#phase === 'writing'` must become a token guard
  in layer 3. The behaviour is the same; the code moves a few lines.
- **`listener-pair` by identifier name** can miss a removal that uses a different alias for the same function. That
  produces a finding, not a missed bug; the fix is to use the same name. Accepted.
- **Dead code that declares no machine** (overlay #26, #27) is never seen by the oracle. Deleting it is a separate
  task.
- **Duplicated state across memory, DOM and sessionStorage** (audit class E, overlay #8, #9) is not covered by any
  rule here. The draft's `persists` idea is deferred (section 12).

Open questions (settled here unless the owner objects):
- `token` must exist whenever an owner has `await`/`.then` even if no state declares a flight. Settled: yes; a flight
  without a state is still a result that can land late.
- Should `pointer-pair` and `listener-pair` run on owners without a machine? Settled: yes (3.4, 3.5); the audit's
  drags and leaks are in owners that will not all get tables.
- Should `timer-handle` run outside machine owners? Settled: no (3.6); outside a machine it is advice territory.
- Where the repo root is when a worktree has no `.state/config.json`: settled by `--root`; the hook passes nothing and
  relies on the cwd Claude Code gives it (the project dir).

## 12. Later, not core

Kept apart so nothing above depends on it.

- **Typed phase.** Owners may type the field as a union of the machine's states (TS: `private phase: 'created' |
  'ready' | …`; JS: `/** @type {'closed' | 'resting' | …} */`). A rule `sm/union-matches-table` (advice first, then
  error on request) requires the union's members to equal the table's state set. Needs no type checker: the union is
  read from the annotation's AST.
- **Strictness ladder** (advice, one finding per owner naming the current rung and the next): flags → string field
  with a table → literal union → tagged union (`{ t: 'writing', flight }`) → exhaustive `switch` with `never`.
- **`ifLeft: '<event>'`**: deliver the late result as an event in whatever state the owner is in now. Needs a rule that
  the event is handled or ignored in every state the flight state can reach.
- **`persists`**: list the storage keys an owner mirrors state into, and a rule that every `sessionStorage.setItem`
  key in an owner is listed. Covers audit class E by declaration, not proof.
- **Hierarchy and parallel regions.** The flat table is enough for the 48; nested states would come as `states.<s>.states`.
- **ESLint adapter** for editors: `sm check --format eslint`.
- **MCP wrapper**: `tools/sm/mcp.mjs`, one tool per command, no logic of its own.
- **Human view** of the log (layer 7).

## Build notes (layers 1 and 2, 2026-11-07)

Choices made where the spec was ambiguous or met real code. Each keeps the spec's intent; none is silent.

1. **`check` arrived in layer 1**, with format, graph and `sm/parse` findings, `files`/`skipped`/`summary`/`suppressed`,
   `--baseline <path>` (read only), `--staged` and `--changed-since`; layer 2 added the lint rules. The format and
   graph tests assert through the finding schema, which needed `check`. `--hook` and `baseline write` stay in layer 5.
2. **Two grades of format error.** Table errors (grammar, keys, names, targets, flights, final) make a machine
   invalid: not in `list.machines`, `show`/`on`/`paths` answer `unknown-machine`, no graph or lint. Binding errors
   (`owner-missing`, `owner-duplicate`, `field-missing`, `token-missing`, `id-duplicate`) leave the table answerable,
   so an agent can still ask `on`/`paths`; `owner-missing`, `field-missing` and `owner-duplicate` switch lint off for
   that owner, `token-missing` does not. `list.invalid` lists every file with any format finding, so a file can appear
   in both lists.
3. **`machine-id-duplicate`** is reported by whole-repo `check` and `list` only (a single-file `check` cannot see the
   other file); both machines leave `list.machines` while the id is ambiguous.
4. **Default `send` and `token` follow the field's spelling**: `field: '#phase'` → `#send`/`#flight`;
   `field: 'worker'` (TS `private`, JS public) → `send`/`flight`; module owners → `send`/`flight`. Section 2.4's own
   example (`private send`, no `send` key) needs this; 1.2's flat default of `#send` would reject it.
5. **`machine-not-literal` for a literal of the wrong shape** fills `<kind>` with the shape and what the key takes:
   "an array (`id` takes a string) is not allowed." A number, identifier, call, template, function, spread, computed
   key or `null` is named plainly.
6. **`machine-key-missing`** covers `id`, `owner`, `field`, `initial`, `states` and an empty `states`. A state's
   `flight` with no `flights` entry is `machine-flight-unknown`; a missing token is `machine-token-missing`; an
   `ifLeft` with an unknown value is `machine-flight-undecided`. Never two findings for one gap.
7. **Positions**: `machine-not-exported` at the tagged statement; `machine-token-missing` at the `owner` value;
   `send-missing` at the class name (module: the machine's `send` key, else its `id`); `send-shape` at the send
   method's key; graph findings at the state's key; `single-writer` on the initializer at the initializer.
   `line` in `list`/`show` is the `export` statement's line.
8. **`single-writer` fix text** fills `<event>` with the assigned string literal when there is one
   (`this.#state = 'idle'` → "Call `this.#send('idle')` instead…"), else the word `event`.
9. **`flight-check`**: a `send` call after an await reads "`#send` (which writes `#phase`) is called after an await…",
   the writing-method form, since `send` is one. Only the function's own body counts (spec: "in the same function
   body"): a nested function is never after the enclosing function's awaits; nested async functions and
   then/catch/finally callbacks are analysed on their own. Only `!==`/`===` are token tests. A captured id is taken
   from the function and every enclosing function, at any position.
10. **`check <files>`** resolves names against the cwd (as every CLI does) and reports them repo-relative; a name
    outside `include`, or not a file, goes to `skipped`.
11. **`@machine` must be a block comment** right before the statement (whitespace only between); a `//` comment or a
    comment before a class member is not a tag.
12. **Graph**: the initial state is its own way home (a path of length 0); `no-way-home` is checked only on states
    with a non-empty `on` (an empty one is `dead-end` already).
13. **Tests**: `e2e/sm-helpers.mjs` holds the temp-root and spawn helper (not a test file; nothing from `tools/sm`
    is imported). `flight-check/engine-traced.ts` is the pair `flight-check/engine-traced/before.ts`/`after.ts`;
    `send-shape/canonical-ts` and `flight-check/capture-in-parent` are `after.*` alone (must pass);
    `send-shape/missing` was added for `sm/send-missing`. Exit 3 is proven with an unreadable (mode 000) file.
    `sm/parse` findings carry scope `module` and an empty detail.
14. **Bench**: `hyperfine` is not installed; `node tools/sm/bench/cli.mjs --runs 20` spawns each command 20 times
    after 2 warm-ups and prints min/median/max. Layer 1 and 2 medians: Node start-up 31 ms; `sm on` 53 ms;
    `sm check` on one file 50–70 ms; whole repo (253 files) 417 ms with no cache.
