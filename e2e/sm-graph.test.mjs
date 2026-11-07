// Graph checks (spec 4): each fixture under e2e/fixtures/sm/graph/<name>/ is a machine with one structural hole, cut from the audit.
// `gaps` and `check` report exactly that rule at the state's key with the documented key and message; `after.js` is clean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, lineOf, remove, repo, sm, sorted } from './sm-helpers.mjs';

const cases = [
  { name: 'walkthrough-steps', id: 'walkthrough', rule: 'sm/graph-unreachable', at: 'done:', key: 'sm/graph-unreachable|before.js|machine:walkthrough|done|1',
    message: '`done` can never be entered: no path from `idle` reaches it.', fix: 'Add a transition into `done` from a reachable state, or remove it.' },
  { name: 'sourcemap-fallback', id: 'sourcemap', rule: 'sm/graph-dead-end', at: 'fallback:', key: 'sm/graph-dead-end|before.js|machine:sourcemap|fallback|1',
    message: '`fallback` has no way out and is not final.', fix: 'Add transitions out of `fallback`, or mark it `final: true` if nothing can happen after it.' },
  { name: 'api-latch', id: 'api-batcher', rule: 'sm/graph-no-way-home', at: 'direct:', key: 'sm/graph-no-way-home|before.js|machine:api-batcher|direct|1',
    message: 'From `direct` there is no path back to `batched` or to a final state: a latch.', fix: 'Add the event that ends it (a restart, a reset), or mark the end of the road `final: true`.' },
  { name: 'fixpanel-writing-escape', id: 'panel', rule: 'sm/graph-cancel-gap', at: 'writing:', key: 'sm/graph-cancel-gap|before.js|machine:panel|writing.escape|1',
    message: '`writing` does not decide what `escape` does.', fix: "Add `escape: '<target>'` to its `on`, or `'escape'` to its `ignores` with a comment saying why." },
  { name: 'flight-only-cancel', id: 'loader', rule: 'sm/graph-flight-no-landing', at: 'loading:', key: 'sm/graph-flight-no-landing|before.js|machine:loader|loading|1',
    message: 'Flight `read` can never land: `loading` has no non-cancel event out.', fix: 'Add the event the result sends (`landed`, `failed`).' },
];

for (const c of cases) {
  test(`graph: ${c.rule} (${c.name})`, () => {
    const before = fixture('graph', c.name, 'before.js');
    const root = repo({ 'before.js': before });
    try {
      const gaps = sm(root, ['gaps', c.id]);
      assert.equal(gaps.code, 1, gaps.stdout);
      assert.equal(gaps.json.command, 'gaps');
      assert.equal(gaps.json.findings.length, 1, gaps.stdout);
      const [f] = gaps.json.findings;
      assert.equal(f.rule, c.rule);
      assert.equal(f.line, lineOf(before, c.at), `expected the finding at the state's key\n${gaps.stdout}`);
      assert.equal(f.key, c.key);
      assert.equal(f.message, c.message);
      assert.equal(f.fix, c.fix);
      assert.equal(f.machine, c.id);
      assert.equal(f.level, 'error');
      assert.equal(gaps.stdout, sm(root, ['gaps']).stdout, '`gaps` with no id answers the same for a single machine');
      assert.equal(gaps.stdout, sorted(gaps.json));
      const check = sm(root, ['check', 'before.js']);
      assert.equal(check.code, 1);
      assert.deepEqual(check.json.findings, gaps.json.findings, '`check` carries the same graph findings');
      assert.equal(check.stdout, sm(root, ['check', 'before.js']).stdout, 'byte-identical across runs');
      assert.equal(sm(root, ['list']).json.machines[0].id, c.id, 'a machine with a graph hole is still a valid, listed machine');
    } finally { remove(root); }
    const after = repo({ 'after.js': fixture('graph', c.name, 'after.js') });
    try {
      const gaps = sm(after, ['gaps', c.id]);
      assert.equal(gaps.code, 0, gaps.stdout);
      assert.deepEqual(gaps.json.findings, []);
      assert.equal(sm(after, ['check', 'after.js']).code, 0);
    } finally { remove(after); }
  });
}

test('graph: a final state is exempt from cancel, dead-end and no-way-home', () => {
  const text = `/** @machine */
export const S = {
  id: 'session', owner: 'Session', field: 'worker', token: 'flight', initial: 'created', cancel: ['close'],
  states: {
    created: { on: { start: 'ready', close: 'closed' } },
    ready:   { on: { died: 'dead', close: 'closed' } },
    dead:    { on: { restart: 'ready', close: 'closed' } },
    closed:  { final: true },
  },
};
export class Session {
  worker = S.initial;
  flight = null;
  send(event) {
    const next = S.states[this.worker]?.on?.[event];
    if (next) this.worker = next;
    return !!next;
  }
}
`;
  const root = repo({ 'session.js': { text } });
  try {
    const gaps = sm(root, ['gaps', 'session']);
    assert.equal(gaps.code, 0, gaps.stdout);
    assert.deepEqual(gaps.json.findings, []);
    assert.deepEqual(sm(root, ['list']).json.machines[0].final, ['closed']);
  } finally { remove(root); }
});

test('graph: findings for several holes are sorted by line, then column, then rule', () => {
  const text = `/** @machine */
export const M = {
  id: 'm', owner: 'Mach', field: '#p', initial: 'a', cancel: ['close'],
  states: {
    a: { on: { go: 'b', close: 'a' } },
    b: { flight: 'f', on: { close: 'b' } },
    c: { on: { go: 'c' } },
  },
  flights: { f: { ifLeft: 'drop' } },
};
export class Mach {
  #p = M.initial;
  #send(event) { const next = M.states[this.#p]?.on?.[event]; if (next) this.#p = next; return !!next; }
}
`;
  const root = repo({ 'm.js': { text } });
  try {
    const gaps = sm(root, ['gaps']);
    assert.equal(gaps.code, 1);
    assert.deepEqual(gaps.json.findings.map(f => [f.line, f.rule]), [
      [6, 'sm/graph-flight-no-landing'],
      [6, 'sm/graph-no-way-home'],
      [7, 'sm/graph-cancel-gap'],
      [7, 'sm/graph-no-way-home'],
      [7, 'sm/graph-unreachable'],
    ]);
  } finally { remove(root); }
});
