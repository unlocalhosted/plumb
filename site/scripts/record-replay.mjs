// Record the real dev server in an isolated copy. Responses are independent per JSX site, so fixes commute.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { parseSync, visitorKeys } from 'oxc-parser';
import { stampJSX } from '../../dist/hosts/source-stamping.js';
import { textSites } from '../../dist/session/text.js';

const site = fileURLToPath(new URL('../', import.meta.url));
const config = (await import('../vite.config.mjs')).default({ mode: 'record-replay' });
const file = 'src/hero/DriftedCard.jsx', source = await readFile(join(site, file), 'utf8');
const { HERO_DRIFTS: drifts } = await import('data:text/javascript;base64,' + Buffer.from(source.slice(0, source.indexOf('export function'))).toString('base64'));
const root = await realpath(await mkdtemp(join(tmpdir(), 'plumb-site-replay-')));
let server;
try {
  await cp(site, root, { recursive: true, filter: path => !/(?:^|\/)(?:node_modules|dist|\.plumb-cache)(?:\/|$)/.test(path) });
  await symlink(join(site, 'node_modules'), join(root, 'node_modules'));
  server = await createServer({ ...config, configFile: false, root, mode: 'record-replay', cacheDir: join(root, '.vite'),
    logLevel: 'error', server: { ...config.server, port: 0, watch: null, fs: { allow: [root, resolve(site, '..')] } } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const call = async (method, params = {}, post = false) => {
    const url = new URL('/__plumb/' + method, base);
    if (!post) for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, post ? { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(params) } : {});
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body)); return body;
  };
  for (let attempt = 0; ; attempt++) {
    const health = await call('health');
    if (health.status === 'ready') break;
    assert.ok(attempt < 600 && health.status !== 'failed', JSON.stringify(health));
    await new Promise(done => setTimeout(done, 100));
  }
  const normalize = value => JSON.parse(JSON.stringify(value).replaceAll(root + '/', '').replaceAll(root, '.'));
  const positions = [];
  // Enumerate the stamped JSX directly: the card and every opening in the files that own its React/DOM chain.
  // No browser is needed for recording; every answer still comes from the real HTTP endpoints.
  for (const path of [file, 'src/hero/Hero.jsx', 'src/Home.jsx', 'src/entry.jsx']) {
    const text = await readFile(join(root, path), 'utf8');
    const stamped = stampJSX(text, join(root, path), path).code;
    const walk = node => {
      if (node.type === 'JSXOpeningElement') {
        const props = Object.fromEntries(node.attributes.filter(a => a.type === 'JSXAttribute').map(a => [a.name.name, a.value?.value]));
        if (props['data-plumb-source']) positions.push({ stamp: props['data-plumb-source'], tag: node.name.name || '*', classes: props.className || '' });
      }
      for (const key of visitorKeys[node.type] || []) for (const child of Array.isArray(node[key]) ? node[key] : [node[key]]) if (child && typeof child === 'object') walk(child);
    };
    walk(parseSync(path, stamped).program);
  }
  const responses = [], interned = new Map();
  const intern = value => {
    const normalized = normalize(value);
    const clean = item => { if (item && typeof item === 'object') { if ('revision' in item) item.revision = 0; for (const child of Object.values(item)) clean(child); } };
    clean(normalized);
    const key = JSON.stringify(normalized);
    if (!interned.has(key)) { interned.set(key, responses.length); responses.push(normalized); }
    return interned.get(key);
  };
  const capture = async (element, classes = element.classes) => {
    const params = { file: element.location.file, line: element.location.line, column: element.location.column };
    const answers = await Promise.all(['site', 'edits', 'classes', 'text'].map(method => call(method, { ...params, ...(method === 'classes' ? { classes } : {}) })));
    return { classes, site: intern(answers[0]), edits: intern(answers[1]), traced: intern(answers[2]), text: intern(answers[3]) };
  };
  for (const element of positions) {
    const [, source, line, column, hash] = /^(.+):(\d+):(\d+)#(.+)$/.exec(element.stamp);
    element.params = { source, line, column, hash, tag: /^[a-z]/.test(element.tag) ? element.tag : '*', stamp: '1' };
    element.location = normalize(await call('resolve', element.params));
    assert.ok(element.location.file, element.stamp);
    element.key = `${element.location.file}:${element.location.line}:${element.location.column}`;
    element.authored = await capture(element);
    const originalText = await readFile(join(root, element.location.file), 'utf8');
    const offset = originalText.split('\n').slice(0, element.location.line - 1).reduce((sum, line) => sum + line.length + 1, 0) + element.location.column - 1;
    element.textRuns = textSites(element.location.file, originalText).find(site => site.element.openingElement.start === offset)?.runs || [];
  }
  const originals = { edits: positions.filter(element => element.location.file === file).flatMap(element => responses[element.authored.edits].edits) };
  const groups = [];
  for (const drift of drifts) {
    const choices = originals.edits.filter(edit => edit.from === drift.bad);
    assert.ok(choices.length, `Real server must offer writes for ${drift.bad}`);
    const element = positions.find(element => element.location.file === file && element.location.line === choices[0].line && element.classes.split(/\s+/).includes(drift.bad));
    assert.ok(element, drift.bad);
    let group = groups.find(group => group.key === element.key);
    if (!group) { group = { key: element.key, drifts: [], states: {} }; groups.push(group); }
    group.drifts.push({ ...drift, choices: choices.map(edit => edit.to), line: choices[0].line });
  }
  let count = 0;
  for (const group of groups) {
    const element = positions.find(element => element.key === group.key);
    let combinations = [[]];
    for (const drift of group.drifts) combinations = combinations.flatMap(combination => [null, ...drift.choices].map(to => [...combination, to ? { from: drift.bad, to } : null]));
    for (const combination of combinations) {
      await writeFile(join(root, file), source); await call('refresh');
      const authored = await call('edits', { file, line: element.location.line, column: element.location.column });
      const selected = combination.filter(Boolean);
      const applied = selected.length ? await call('apply', { file, hash: authored.hash, edits: selected.map(fix => ({ id: authored.edits.find(edit => edit.from === fix.from && edit.to === fix.to).id })) }, true) : null;
      let classes = element.classes;
      for (const fix of selected) classes = classes.split(/\s+/).map(token => token === fix.from ? fix.to : token).join(' ');
      const reading = await capture(element, classes);
      group.states[classes] = { ...reading, applied: applied ? intern(applied) : null };
      console.log(`Recorded site state ${++count}: ${group.key}`);
    }
  }
  const fallback = {};
  for (const method of ['resolve', 'site', 'edits', 'classes', 'text']) {
    const url = new URL('/__plumb/' + method, base);
    for (const [key, value] of Object.entries(method === 'resolve' ? { source: 'src/untracked.jsx', line: 1, column: 1 } : { file: 'src/untracked.jsx', line: 1, column: 1, classes: '' })) url.searchParams.set(key, value);
    const response = await fetch(url); fallback[method] = { status: response.status, body: normalize(await response.json()) };
  }
  const health = normalize(await call('health')); delete health.pid; delete health.rss;
  await writeFile(join(site, 'src/hero/replay.json'), JSON.stringify({ version: 1, file, source, groups, positions, health, fallback, responses }) + '\n');
  assert.equal(await readFile(join(site, file), 'utf8'), source, 'The working source must remain untouched while recording');
  console.log(`Replay saved: ${positions.length} stamped hosts/owners, ${count} site states, ${responses.length} distinct answers.`);
} finally {
  await server?.close(); await rm(root, { recursive: true, force: true });
}
