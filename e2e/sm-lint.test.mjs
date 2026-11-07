// Core lint (spec 3.1, 3.2, 3.3, 3.8, 3.9): each fixture pair under e2e/fixtures/sm/<rule>/<name>/ is audited code cut down
// to the owner and the lines around the bug, with a machine added; `after` is the same with the canonical fix.
// `check before` yields exactly the expected findings (rule, line, key, message); `check after` is clean; stdout is byte-identical across runs.
// The remaining rules (pointer-pair, listener-pair, timer-handle, mode-flags) arrive in layer 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, lineOf, remove, repo, sm, sorted } from './sm-helpers.mjs';

const CANONICAL_SEND = '#send(event) {\n  const next = LAMP.states[this.#phase]?.on?.[event];\n  if (next) this.#phase = next;\n  return !!next;\n}';

const cases = [
  {
    dir: 'single-writer/cleanup-stop', rule: 'sm/single-writer',
    expect: [
      { at: "stop() { this.#settle(); this.#state = 'idle';", key: 'sm/single-writer|before.js|Cleanup.stop|#state|1', message: '`#state` is written outside `#send`.',
        fix: "Call `this.#send('idle')` instead; add `idle` to the states that accept it if it is missing." },
      { at: "    this.#state = 'reading';", key: 'sm/single-writer|before.js|Cleanup.#read|#state|1', message: '`#state` is written outside `#send`.' },
    ],
  },
  {
    dir: 'known-event/blueprint-refused', rule: 'sm/known-event',
    expect: [
      { at: "this.#send('refuse')", key: 'sm/known-event|before.js|Blueprint.toggle|refuse|1',
        message: "`#send('refuse')`: no state handles `refuse` (events: `left`, `refused`, `turnOff`, `turnOn`, `unmount`).",
        fix: /^Add `refuse` to the `on` of the states that accept it, or use one of `refused`, `\w+`, `\w+`\.$/ },
    ],
  },
  {
    dir: 'known-event/template-arg', rule: 'sm/send-literal',
    expect: [
      { at: 'this.#send(`turn${mode}`)', key: 'sm/send-literal|before.js|Blueprint.set||1',
        message: '`#send` takes a string literal (or a conditional of literals), so the oracle can read it.', fix: 'Replace the argument with the literal event names, one per branch.' },
    ],
  },
  {
    dir: 'flight-check/cleanup-read', rule: 'sm/flight-check',
    expect: [
      { at: 'this.#p = said?.proposal ?? null;', key: 'sm/flight-check|before.js|Cleanup.#read|#p|1', message: '`#p` is written after an await with no check that this run is still current.',
        fix: 'Before the await: `const flight = (this.#run = {});` (or `const run = ++this.#run;`). After it: `if (this.#run !== flight) return;` then the write.' },
      { at: "this.#send(this.#p ? 'ready' : 'nothing');", key: 'sm/flight-check|before.js|Cleanup.#read|#send|1', message: '`#send` (which writes `#state`) is called after an await with no check that this run is still current.' },
      { at: 'this.#err = error?.message ?? null;', key: 'sm/flight-check|before.js|Cleanup.#read|#err|1', message: '`#err` is written after an await with no check that this run is still current.' },
      { at: "this.#send('failed');", key: 'sm/flight-check|before.js|Cleanup.#read|#send|2' },
    ],
  },
  {
    dir: 'flight-check/reader-catch', rule: 'sm/flight-check',
    expect: [
      { at: '.then((state) => { if (this.#running) this.#landed(item, state); })', key: 'sm/flight-check|before.js|Reader.#scan|#landed|1',
        message: '`#landed` (which writes `#marks`) is called after an await with no check that this run is still current.' },
      { at: '.catch((error) => { if (this.#running) this.#parked([item], error); })', key: 'sm/flight-check|before.js|Reader.#scan|#parked|1',
        message: '`#parked` (which writes `#pending`) is called after an await with no check that this run is still current.' },
    ],
  },
  {
    dir: 'flight-check/engine-traced', ext: 'ts', rule: 'sm/flight-check',
    expect: [
      { at: 'this.tag = previous;', key: 'sm/flight-check|before.ts|Engine.traced|tag|1', message: '`tag` is written after an await with no check that this run is still current.',
        fix: 'Before the await: `const flight = (this.flight = {});` (or `const run = ++this.flight;`). After it: `if (this.flight !== flight) return;` then the write.' },
    ],
  },
  {
    dir: 'flight-check/api-flush', rule: 'sm/flight-check',
    expect: [
      { at: "if (!response.ok) send('refused');", key: 'sm/flight-check|before.js|module.flush|send|1', message: '`send` (which writes `mode`) is called after an await with no check that this run is still current.',
        fix: 'Before the await: `const flight = (flushRun = {});` (or `const run = ++flushRun;`). After it: `if (flushRun !== flight) return;` then the write.' },
    ],
  },
  {
    dir: 'flight-check/assign-await', rule: 'sm/flight-check',
    expect: [
      { at: 'this.#page = await this.#host.read();', key: 'sm/flight-check|before.js|Pager.#load|#page|1', message: '`#page` is written after an await with no check that this run is still current.' },
      { at: "this.#send('loaded');", key: 'sm/flight-check|before.js|Pager.#load|#send|1' },
    ],
  },
  {
    dir: 'send-shape/to-state', rule: 'sm/send-shape', others: ['sm/single-writer'],
    expect: [
      { at: '#send(event) {', key: 'sm/send-shape|before.js|Panel.#send||1', message: '`#send` must look up the next state in the table and assign it once.',
        fix: CANONICAL_SEND.replace('LAMP', 'PANEL') },
    ],
  },
  {
    dir: 'send-shape/missing', rule: 'sm/send-missing', others: ['sm/single-writer'],
    expect: [
      { at: 'export class Lamp {', key: 'sm/send-missing|before.js|Lamp|#send|1', message: '`Lamp` has no `#send`.', fix: CANONICAL_SEND },
    ],
  },
];

for (const c of cases) {
  const ext = c.ext ?? 'js';
  test(`lint: ${c.rule} (${c.dir})`, () => {
    const before = fixture(c.dir, `before.${ext}`);
    const name = `before.${ext}`;
    const root = repo({ [name]: before });
    try {
      const first = sm(root, ['check', name]);
      assert.equal(first.code, 1, first.stdout);
      const mine = first.json.findings.filter(f => f.rule === c.rule);
      assert.deepEqual(mine.map(f => [f.line, f.key]), c.expect.map(e => [lineOf(before, e.at), e.key]), first.stdout);
      for (const [i, e] of c.expect.entries()) {
        const f = mine[i];
        if (e.message) assert.equal(f.message, e.message);
        if (e.fix instanceof RegExp) assert.match(f.fix, e.fix); else if (e.fix) assert.equal(f.fix, e.fix);
        assert.equal(f.level, 'error');
        assert.equal(f.file, name);
        assert.ok(f.machine, 'the finding names its machine');
        assert.ok(f.endLine >= f.line && f.endColumn > 0, 'a span');
      }
      const others = [...new Set(first.json.findings.filter(f => f.rule !== c.rule).map(f => f.rule))].sort();
      assert.deepEqual(others, c.others ?? [], `only the expected rules fire\n${first.stdout}`);
      assert.equal(first.stdout, sm(root, ['check', name]).stdout, 'byte-identical across runs');
      assert.equal(first.stdout, sm(root, ['check', name, '--no-cache', '--no-log']).stdout, 'the cache changes speed only');
      assert.equal(first.stdout, sorted(first.json));
      assert.equal(first.json.summary.error, first.json.findings.length);
    } finally { remove(root); }
    const afterName = `after.${ext}`;
    const after = repo({ [afterName]: fixture(c.dir, afterName) });
    try {
      const fixed = sm(after, ['check', afterName]);
      assert.equal(fixed.code, 0, fixed.stdout);
      assert.deepEqual(fixed.json.findings, [], 'the canonical fix is clean under every rule');
    } finally { remove(after); }
  });
}

for (const [dir, file] of [['flight-check/capture-in-parent', 'after.js'], ['flight-check/await-call', 'after.js'], ['send-shape/canonical-ts', 'after.ts']]) {
  test(`lint: ${dir} must pass`, () => {
    const root = repo({ [file]: fixture(dir, file) });
    try {
      const result = sm(root, ['check', file]);
      assert.equal(result.code, 0, result.stdout);
      assert.deepEqual(result.json.findings, []);
      assert.equal(sm(root, ['list']).json.machines.length, 1);
    } finally { remove(root); }
  });
}

test('lint: sm/parse on a file oxc cannot parse', () => {
  const root = repo({ 'broken.js': fixture('parse', 'broken.js') });
  try {
    const result = sm(root, ['check', 'broken.js']);
    assert.equal(result.code, 1, result.stdout);
    assert.deepEqual(result.json.findings.map(f => [f.rule, f.line, f.key, f.fix]), [
      ['sm/parse', 3, 'sm/parse|broken.js|module||1', 'Fix the syntax error; nothing in this file was checked.'],
    ]);
    assert.ok(result.json.findings[0].message.length > 0, "oxc's message");
    assert.equal(result.stdout, sm(root, ['check', 'broken.js']).stdout);
    const listed = sm(root, ['list']);
    assert.equal(listed.code, 0);
    assert.deepEqual(listed.json.machines, []);
  } finally { remove(root); }
});

test('lint: a machine with format errors gets no lint findings; one with graph holes still does', () => {
  const root = repo({ 'lamp.js': fixture('format', 'field-missing', 'before.js'), 'walk.js': fixture('graph', 'walkthrough-steps', 'before.js') });
  try {
    const result = sm(root, ['check']);
    assert.equal(result.code, 1);
    assert.deepEqual(result.json.findings.map(f => [f.file, f.rule]), [['lamp.js', 'sm/machine-field-missing'], ['walk.js', 'sm/graph-unreachable']]);
    assert.deepEqual(result.json.summary, { advice: 0, error: 2 });
  } finally { remove(root); }
});
