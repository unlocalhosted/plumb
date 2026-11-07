// The CLI (spec 5): queries against the fix-panel fixture, exit codes with the documented error shapes, and determinism.
// `diff` (layer 4) is not here yet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, remove, repo, sm, sorted } from './sm-helpers.mjs';

const EVENTS = ['close', 'closeKeep', 'escape', 'hold', 'keep', 'keepIt', 'landed', 'landedNext', 'landedNone', 'open', 'openUndoing', 'openWriting', 'release', 'take', 'undo', 'unmount'];

function fixpanelRoot() {
  return repo({ 'fixpanel.js': fixture('cli', 'fixpanel.js'), 'walkthrough.js': fixture('graph', 'walkthrough-steps', 'before.js') });
}

test('cli: list names every machine in include, sorted by id, with its summary', () => {
  const root = fixpanelRoot();
  try {
    const result = sm(root, ['list']);
    assert.equal(result.code, 0, result.stdout);
    assert.equal(result.json.command, 'list');
    assert.equal(result.json.schema, 1);
    assert.deepEqual(result.json.invalid, []);
    assert.deepEqual(result.json.machines.map(m => m.id), ['fix-panel', 'walkthrough']);
    assert.deepEqual(result.json.machines[0], {
      cancel: ['close', 'escape', 'unmount'], events: EVENTS, field: '#phase', file: 'fixpanel.js', final: [], flights: ['undo', 'write'],
      id: 'fix-panel', initial: 'closed', line: 3, owner: 'FixPanel', states: ['closed', 'holding', 'keeping', 'resting', 'undoing', 'writing'],
    });
    assert.equal(result.stdout, sorted(result.json), 'keys sorted at every level, 2-space indent, trailing newline');
  } finally { remove(root); }
});

test('cli: show prints the canonical table with defaults filled in and every list sorted', () => {
  const root = fixpanelRoot();
  try {
    const result = sm(root, ['show', 'fix-panel']);
    assert.equal(result.code, 0, result.stdout);
    const m = result.json.machine;
    assert.equal(m.file, 'fixpanel.js');
    assert.equal(m.line, 3);
    assert.equal(m.send, '#send', 'the default send is filled in');
    assert.equal(m.token, '#flight');
    assert.deepEqual(m.flights, [{ ifLeft: 'drop', name: 'undo' }, { ifLeft: 'handOff', name: 'write' }]);
    assert.deepEqual(m.states.map(s => s.name), ['closed', 'holding', 'keeping', 'resting', 'undoing', 'writing']);
    assert.deepEqual(m.states[0], {
      final: false, flight: null, ignores: ['close', 'escape', 'unmount'], name: 'closed',
      on: [{ event: 'open', to: 'resting' }, { event: 'openUndoing', to: 'undoing' }, { event: 'openWriting', to: 'writing' }],
    });
    assert.equal(m.states[5].flight, 'write');
    assert.equal(result.stdout, sorted(result.json));
  } finally { remove(root); }
});

test('cli: on answers to, ignored and unhandled', () => {
  const root = fixpanelRoot();
  try {
    const to = sm(root, ['on', 'fix-panel', 'holding', 'escape']);
    assert.equal(to.code, 0, to.stdout);
    assert.deepEqual(to.json, { command: 'on', event: 'escape', machine: 'fix-panel', result: 'to', schema: 1, state: 'holding', to: 'resting' });
    const ignored = sm(root, ['on', 'fix-panel', 'writing', 'escape']);
    assert.equal(ignored.code, 0);
    assert.deepEqual(ignored.json, { command: 'on', event: 'escape', machine: 'fix-panel', result: 'ignored', schema: 1, state: 'writing', to: null });
    const unhandled = sm(root, ['on', 'fix-panel', 'closed', 'hold']);
    assert.equal(unhandled.code, 0);
    assert.deepEqual(unhandled.json, { command: 'on', event: 'hold', machine: 'fix-panel', result: 'unhandled', schema: 1, state: 'closed', to: null });
    const unknownEvent = sm(root, ['on', 'fix-panel', 'closed', 'noSuchEvent']);
    assert.equal(unknownEvent.code, 0, 'an unknown event is a legal question');
    assert.equal(unknownEvent.json.result, 'unhandled');
  } finally { remove(root); }
});

test('cli: paths gives the shortest event path from initial, and null when unreachable', () => {
  const root = fixpanelRoot();
  try {
    const keeping = sm(root, ['paths', 'fix-panel', 'keeping']);
    assert.equal(keeping.code, 0, keeping.stdout);
    assert.deepEqual(keeping.json, {
      command: 'paths', machine: 'fix-panel', reachable: true, schema: 1, state: 'keeping',
      path: [{ event: 'open', from: 'closed', to: 'resting' }, { event: 'hold', from: 'resting', to: 'holding' }, { event: 'keep', from: 'holding', to: 'keeping' }],
    });
    const initial = sm(root, ['paths', 'fix-panel', 'closed']);
    assert.deepEqual(initial.json.path, [], 'the initial state is reached by no event');
    assert.equal(initial.json.reachable, true);
    const unreachable = sm(root, ['paths', 'walkthrough', 'done']);
    assert.equal(unreachable.code, 0);
    assert.deepEqual(unreachable.json, { command: 'paths', machine: 'walkthrough', path: null, reachable: false, schema: 1, state: 'done' });
  } finally { remove(root); }
});

test('cli: exit codes 1 and 2 with the documented error shapes', () => {
  const root = fixpanelRoot();
  try {
    const clean = sm(root, ['gaps', 'fix-panel']);
    assert.equal(clean.code, 0);
    assert.deepEqual(clean.json.findings, []);
    const gaps = sm(root, ['gaps']);
    assert.equal(gaps.code, 1, 'exit 1 when the answer holds error-level findings');
    assert.deepEqual(gaps.json.findings.map(f => f.rule), ['sm/graph-unreachable']);
    for (const [args, code, pattern] of [
      [['frobnicate'], 'unknown-command', /Commands: list, show, on, paths, gaps, check/],
      [[], 'unknown-command', /Commands:/],
      [['show', 'nope'], 'unknown-machine', /fix-panel, walkthrough/],
      [['on', 'nope', 'closed', 'open'], 'unknown-machine', /fix-panel, walkthrough/],
      [['paths', 'fix-panel', 'nope'], 'unknown-state', /closed, holding, keeping, resting, undoing, writing/],
      [['on', 'fix-panel', 'nope', 'open'], 'unknown-state', /States:/],
      [['list', '--bogus'], 'bad-flag', /--bogus/],
      [['list', '--root'], 'bad-flag', /needs a value/],
      [['check', '--changed-since', 'no-such-ref-anywhere'], 'bad-ref', /git diff/],
    ]) {
      const result = sm(root, args);
      assert.equal(result.code, 2, `${args.join(' ')}: ${result.stdout}`);
      assert.equal(result.json.error.code, code, result.stdout);
      assert.match(result.json.error.message, pattern);
      assert.equal(result.json.schema, 1);
      assert.deepEqual(Object.keys(result.json).sort(), ['error', 'schema']);
      assert.equal(result.stderr, '', 'nothing on stderr');
    }
    const skipped = sm(root, ['check', 'not-included.md']);
    assert.equal(skipped.code, 0);
    assert.deepEqual(skipped.json.skipped, ['not-included.md']);
    assert.deepEqual(skipped.json.files, []);
  } finally { remove(root); }
  const bare = repo({}, { config: null });
  try {
    const result = sm(bare, ['list']);
    assert.equal(result.code, 2);
    assert.equal(result.json.error.code, 'no-config');
    const pointed = sm(bare, ['list', '--root', 'nowhere']);
    assert.equal(pointed.json.error.code, 'no-config');
  } finally { remove(bare); }
});

test('cli: exit 3 when the tool itself fails, with the error shape', { skip: process.getuid?.() === 0 ? 'root reads everything' : false }, () => {
  const root = repo({ 'secret.js': { text: '/** @machine */\nexport const X = {};\n' } });
  try {
    chmodSync(join(root, 'secret.js'), 0o000);
    const result = sm(root, ['list']);
    assert.equal(result.code, 3, result.stdout);
    assert.equal(result.json.error.code, 'internal');
    assert.match(result.json.error.message, /EACCES|permission denied/i);
    assert.equal(result.json.schema, 1);
  } finally { chmodSync(join(root, 'secret.js'), 0o644); remove(root); }
});

test('cli: --root finds the repo from elsewhere, and paths stay repo-relative', () => {
  const root = fixpanelRoot();
  try {
    const result = sm(root, ['list', '--root', root], { cwd: '/' });
    assert.equal(result.code, 0, result.stdout);
    assert.equal(result.json.machines[0].file, 'fixpanel.js');
    const fromChild = sm(root, ['list', '--root', '.']);
    assert.equal(fromChild.stdout, result.stdout);
  } finally { remove(root); }
});

test('cli: determinism: every command is byte-identical across runs and with --no-cache / --no-log', () => {
  const root = fixpanelRoot();
  try {
    for (const args of [['list'], ['show', 'fix-panel'], ['on', 'fix-panel', 'holding', 'escape'], ['paths', 'fix-panel', 'keeping'], ['gaps'], ['check'], ['check', 'fixpanel.js']]) {
      const first = sm(root, args);
      assert.equal(first.stdout, sm(root, args).stdout, args.join(' '));
      assert.equal(first.stdout, sm(root, [...args, '--no-cache']).stdout, `${args.join(' ')} --no-cache`);
      assert.equal(first.stdout, sm(root, [...args, '--no-log', '--no-cache']).stdout, `${args.join(' ')} --no-log`);
      assert.equal(first.stdout, sorted(first.json), `${args.join(' ')}: sorted keys`);
      assert.ok(first.stdout.endsWith('}\n'), 'trailing newline');
      assert.doesNotMatch(first.stdout, /\d{4}-\d{2}-\d{2}T/, 'no timestamps');
      assert.ok(!first.stdout.includes(root), 'no absolute paths');
    }
  } finally { remove(root); }
});
