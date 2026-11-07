// Format errors (spec 1.5): each fixture under e2e/fixtures/sm/format/<rule-suffix>/ is one valid machine with one thing wrong.
// `check before.js` reports exactly that rule at the offending line with the documented key; `after.js` is clean; output is byte-identical across runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, lineOf, remove, repo, sm, sorted } from './sm-helpers.mjs';

const cases = [
  { name: 'not-literal', rule: 'sm/machine-not-literal', at: 'initial: INITIAL', key: 'sm/machine-not-literal|before.js|machine:lamp|initial|1',
    message: 'A machine holds only string, array and object literals; an identifier is not allowed.' },
  { name: 'not-exported', rule: 'sm/machine-not-exported', at: 'const LAMP = {', key: 'sm/machine-not-exported|before.js|machine:LAMP||1',
    message: 'A @machine must be `export const NAME = { … }`.' },
  { name: 'key-missing', rule: 'sm/machine-key-missing', at: 'export const LAMP = {', key: 'sm/machine-key-missing|before.js|machine:lamp|initial|1',
    message: 'Machine lamp is missing `initial`.' },
  { name: 'key-unknown', rule: 'sm/machine-key-unknown', at: "persist: 'session'", key: 'sm/machine-key-unknown|before.js|machine:lamp|persist|1',
    message: '`persist` is not a machine key (allowed here: `cancel`, `field`, `flights`, `id`, `initial`, `owner`, `send`, `states`, `token`).' },
  { name: 'key-duplicate', rule: 'sm/machine-key-duplicate', at: "initial: 'on'", key: 'sm/machine-key-duplicate|before.js|machine:lamp|initial|1',
    message: '`initial` appears twice.' },
  { name: 'id-shape', rule: 'sm/machine-id-shape', at: "id: 'Lamp'", key: 'sm/machine-id-shape|before.js|machine:Lamp|Lamp|1',
    message: 'Machine ids are lower-case, digits and dashes: `Lamp`.', fix: 'Rename it to lamp.' },
  { name: 'escape-key-name', rule: 'sm/machine-name-shape', at: "Escape: 'off'", key: 'sm/machine-name-shape|before.js|machine:lamp|Escape|1',
    message: "`Escape` is not a lower-camel domain name. Key names (`Escape`) are mapped in code: `if (k === 'Escape') this.#send('escape')`.", fix: 'Rename `Escape` to `escape`.' },
  { name: 'initial-unknown', rule: 'sm/machine-initial-unknown', at: "initial: 'dim'", key: 'sm/machine-initial-unknown|before.js|machine:lamp|dim|1',
    message: '`initial` is `dim`, which is not a state (states: `off`, `on`).' },
  { name: 'target-unknown', rule: 'sm/machine-target-unknown', at: "toggle: 'dim'", key: 'sm/machine-target-unknown|before.js|machine:lamp|off.on.toggle|1',
    message: '`off.on.toggle` points to `dim`, which is not a state.' },
  { name: 'event-both', rule: 'sm/machine-event-both', at: "ignores: ['close']", key: 'sm/machine-event-both|before.js|machine:lamp|close|1',
    message: '`on` both handles and ignores `close`.' },
  { name: 'ignores-duplicate', rule: 'sm/machine-ignores-duplicate', at: "cancel: ['close', 'close']", key: 'sm/machine-ignores-duplicate|before.js|machine:lamp|close|1',
    message: '`close` is listed twice.' },
  { name: 'flight-unknown', rule: 'sm/machine-flight-unknown', at: "flight: 'glow'", key: 'sm/machine-flight-unknown|before.js|machine:lamp|glow|1',
    message: '`on` has flight `glow`, but `flights.glow` is not declared.' },
  { name: 'flight-undecided', rule: 'sm/machine-flight-undecided', at: 'flights: { glow: {} }', key: 'sm/machine-flight-undecided|before.js|machine:lamp|glow|1',
    message: 'Flight `glow` does not say what happens to a result that lands after its state was left.' },
  { name: 'flight-unused', rule: 'sm/machine-flight-unused', at: "flights: { glow: { ifLeft: 'drop' } }", key: 'sm/machine-flight-unused|before.js|machine:lamp|glow|1',
    message: 'Flight `glow` belongs to no state.' },
  { name: 'final-shape', rule: 'sm/machine-final-shape', at: 'final: true', key: 'sm/machine-final-shape|before.js|machine:lamp|on|1',
    message: 'A final state has no transitions and no flight; `on` has `on`.' },
  { name: 'owner-missing', rule: 'sm/machine-owner-missing', at: "owner: 'Bulb'", key: 'sm/machine-owner-missing|before.js|machine:lamp|Bulb|1',
    message: 'Owner `Bulb` is not declared in this file.' },
  { name: 'owner-duplicate', rule: 'sm/machine-owner-duplicate', at: "id: 'lamp-b', owner: 'Lamp'", key: 'sm/machine-owner-duplicate|before.js|machine:lamp-b|Lamp|1',
    message: '`Lamp` already has machine `lamp`.' },
  { name: 'field-missing', rule: 'sm/machine-field-missing', at: "field: '#state'", key: 'sm/machine-field-missing|before.js|machine:lamp|#state|1',
    message: '`Lamp` has no field `#state`.', fix: 'Declare `#state = LAMP.initial;` on the owner.' },
  { name: 'token-missing', rule: 'sm/machine-token-missing', at: "owner: 'Lamp'", key: 'sm/machine-token-missing|before.js|machine:lamp|#flight|1',
    message: '`Lamp` has async work but no flight token.' },
];

for (const c of cases) {
  test(`format: ${c.rule} (${c.name})`, () => {
    const before = fixture('format', c.name, 'before.js');
    const root = repo({ 'before.js': before });
    try {
      const first = sm(root, ['check', 'before.js']);
      assert.equal(first.code, 1, first.stdout);
      assert.deepEqual([...new Set(first.json.findings.map(f => f.rule))], [c.rule], first.stdout);
      const [f] = first.json.findings;
      assert.equal(f.line, lineOf(before, c.at), `expected the finding at the line holding ${c.at}\n${first.stdout}`);
      assert.equal(f.key, c.key);
      assert.equal(f.message, c.message);
      if (c.fix) assert.equal(f.fix, c.fix);
      assert.equal(f.level, 'error');
      assert.equal(f.file, 'before.js');
      assert.deepEqual(first.json.summary, { advice: 0, error: first.json.findings.length });
      assert.equal(first.stdout, sm(root, ['check', 'before.js']).stdout, 'byte-identical across runs');
      assert.equal(first.stdout, sorted(first.json), 'keys sorted at every level');
      const listed = sm(root, ['list']);
      assert.equal(listed.code, 0);
      assert.equal(listed.json.invalid.length, 1, 'the file is listed as invalid');
      assert.equal(listed.json.invalid[0].file, 'before.js');
    } finally { remove(root); }
    const after = repo({ 'after.js': fixture('format', c.name, 'after.js') });
    try {
      const fixed = sm(after, ['check', 'after.js']);
      assert.equal(fixed.code, 0, fixed.stdout);
      assert.deepEqual(fixed.json.findings, []);
    } finally { remove(after); }
  });
}

test('format: sm/machine-id-duplicate across two files (whole-repo check only)', () => {
  const root = repo({ 'lamp.js': fixture('format', 'id-duplicate', 'before', 'lamp.js'), 'torch.js': fixture('format', 'id-duplicate', 'before', 'torch.js') });
  try {
    const result = sm(root, ['check']);
    assert.equal(result.code, 1, result.stdout);
    assert.deepEqual(result.json.findings.map(f => [f.rule, f.file, f.key, f.message]), [
      ['sm/machine-id-duplicate', 'lamp.js', 'sm/machine-id-duplicate|lamp.js|machine:lamp|lamp|1', 'Machine id `lamp` is also declared in torch.js.'],
      ['sm/machine-id-duplicate', 'torch.js', 'sm/machine-id-duplicate|torch.js|machine:lamp|lamp|1', 'Machine id `lamp` is also declared in lamp.js.'],
    ]);
    const one = sm(root, ['check', 'lamp.js']);
    assert.equal(one.code, 0, 'a single-file check cannot see the other file');
    const listed = sm(root, ['list']);
    assert.deepEqual(listed.json.machines, [], 'neither machine is listed while the id is ambiguous');
    assert.deepEqual(listed.json.invalid.map(i => i.file), ['lamp.js', 'torch.js']);
  } finally { remove(root); }
  const after = repo({ 'lamp.js': fixture('format', 'id-duplicate', 'after', 'lamp.js'), 'torch.js': fixture('format', 'id-duplicate', 'after', 'torch.js') });
  try {
    assert.equal(sm(after, ['check']).code, 0);
    assert.deepEqual(sm(after, ['list']).json.machines.map(m => m.id), ['lamp', 'torch']);
  } finally { remove(after); }
});

test('format: the value kinds the grammar refuses are each named', () => {
  const text = `/** @machine */
export const M = {
  id: 'm', owner: 'module', field: 'mode', initial: 'a',
  token: ['t'],
  cancel: [\`x\`],
  states: { a: { on: { go: 'a' }, ...rest }, b: { on: { go: () => 'a' } }, c: { final: 1 }, d: { on: null } },
  flights: 3,
};
let mode = M.initial;
function send(event) { const next = M.states[mode]?.on?.[event]; if (next) mode = next; return !!next; }
`;
  const root = repo({ 'm.js': { text } });
  try {
    const result = sm(root, ['check', 'm.js']);
    assert.equal(result.code, 1);
    assert.deepEqual(result.json.findings.map(f => f.message), [
      'A machine holds only string, array and object literals; an array (`token` takes a string) is not allowed.',
      'A machine holds only string, array and object literals; a template literal is not allowed.',
      'A machine holds only string, array and object literals; a spread is not allowed.',
      'A machine holds only string, array and object literals; a function is not allowed.',
      'A machine holds only string, array and object literals; a number is not allowed.',
      'A machine holds only string, array and object literals; null is not allowed.',
      'A machine holds only string, array and object literals; a number is not allowed.',
    ]);
  } finally { remove(root); }
});
