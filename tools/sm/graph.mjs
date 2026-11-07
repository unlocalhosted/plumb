// @ts-check
// Graph checks (spec 4) and the `on`/`paths` answers (spec 5.1) over a canonical table.
import { finding, cmp } from './findings.mjs';

/** @typedef {import('./machine.mjs').Canonical} Canonical */
/** @typedef {import('./machine.mjs').Machine} Machine */

/** @param {Canonical} c */
function index(c) {
  /** @type {Map<string, Canonical['states'][number]>} */
  const states = new Map();
  for (const s of c.states) states.set(s.name, s);
  return states;
}

/** BFS from `from`, states in sorted order, events in sorted order. Returns parent links. @param {Canonical} c @param {string} from */
function bfs(c, from) {
  const states = index(c);
  /** @type {Map<string, { from: string, event: string } | null>} */
  const seen = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const name = /** @type {string} */ (queue.shift());
    const s = states.get(name);
    if (!s) continue;
    for (const { event, to } of s.on) {
      if (seen.has(to)) continue;
      seen.set(to, { from: name, event });
      queue.push(to);
    }
  }
  return seen;
}

/** @param {Canonical} c @param {string} state @param {string} event */
export function on(c, state, event) {
  const s = index(c).get(state);
  if (!s) return null;
  const hit = s.on.find(t => t.event === event);
  if (hit) return { result: 'to', to: hit.to };
  if (s.ignores.includes(event)) return { result: 'ignored', to: null };
  return { result: 'unhandled', to: null };
}

/** The shortest event path from `initial` to `state`, or null. @param {Canonical} c @param {string} state */
export function paths(c, state) {
  const seen = bfs(c, c.initial);
  if (!seen.has(state)) return null;
  /** @type {{ event: string, from: string, to: string }[]} */
  const path = [];
  for (let cur = state; ; ) {
    const link = seen.get(cur);
    if (!link) break;
    path.unshift({ event: link.event, from: link.from, to: cur });
    cur = link.from;
  }
  return path;
}

/** @param {string} file @param {number[]} lines @param {Machine} m */
export function graphFindings(file, lines, m) {
  const c = /** @type {Canonical} */ (m.canonical);
  /** @type {any[]} */
  const out = [];
  const at = (/** @type {string} */ name) => m.stateKeys[name] ?? m.spans.states ?? m.node;
  const add = (/** @type {string} */ rule, /** @type {string} */ name, /** @type {string} */ detail, /** @type {string} */ message, /** @type {string} */ fix) =>
    out.push(finding({ rule, file, lines, node: at(name), machine: c.id, scope: `machine:${c.id}`, detail, message, fix }));
  const reachable = bfs(c, c.initial);
  const finals = c.states.filter(s => s.final).map(s => s.name);
  const cancel = new Set(c.cancel);
  for (const s of c.states) {
    if (!reachable.has(s.name)) {
      add('sm/graph-unreachable', s.name, s.name, `\`${s.name}\` can never be entered: no path from \`${c.initial}\` reaches it.`,
        `Add a transition into \`${s.name}\` from a reachable state, or remove it.`);
    }
    if (s.final) continue;
    if (!s.on.length) {
      add('sm/graph-dead-end', s.name, s.name, `\`${s.name}\` has no way out and is not final.`,
        `Add transitions out of \`${s.name}\`, or mark it \`final: true\` if nothing can happen after it.`);
    } else {
      const from = bfs(c, s.name);
      const home = s.name === c.initial || from.has(c.initial) || finals.some(f => from.has(f));
      if (!home) {
        add('sm/graph-no-way-home', s.name, s.name, `From \`${s.name}\` there is no path back to \`${c.initial}\` or to a final state: a latch.`,
          'Add the event that ends it (a restart, a reset), or mark the end of the road `final: true`.');
      }
    }
    for (const event of c.cancel) {
      if (s.on.some(t => t.event === event) || s.ignores.includes(event)) continue;
      add('sm/graph-cancel-gap', s.name, `${s.name}.${event}`, `\`${s.name}\` does not decide what \`${event}\` does.`,
        `Add \`${event}: '<target>'\` to its \`on\`, or \`'${event}'\` to its \`ignores\` with a comment saying why.`);
    }
    if (s.flight && !s.on.some(t => !cancel.has(t.event))) {
      add('sm/graph-flight-no-landing', s.name, s.name, `Flight \`${s.flight}\` can never land: \`${s.name}\` has no non-cancel event out.`,
        'Add the event the result sends (`landed`, `failed`).');
    }
  }
  return out;
}

/** @param {Canonical} c */
export function summary(c) {
  const events = new Set();
  for (const s of c.states) for (const t of s.on) events.add(t.event);
  return {
    cancel: c.cancel, events: [...events].sort(cmp), field: c.field, final: c.states.filter(s => s.final).map(s => s.name), flights: c.flights.map(f => f.name),
    id: c.id, initial: c.initial, owner: c.owner, states: c.states.map(s => s.name),
  };
}
