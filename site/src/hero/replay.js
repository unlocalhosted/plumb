import fixture from './replay.json';
import { encodeJSXText, encodeTextLiteral, textWriteErrors } from '../../../src/session/text-encoding.ts';

// Install synchronously, before the real overlay imports its API. Guarded writes never reach the dev server.
const liveFetch = window.fetch.bind(window);
const production = import.meta.env.PROD;
let revision = 0, source = fixture.source;
let hash = fixture.responses[fixture.positions.find(position => position.location.file === fixture.file).authored.edits].hash;
const classes = new Map(fixture.positions.map(position => [position.key, position.classes]));
const textRuns = new Map(fixture.positions.map(position => [position.key, structuredClone(position.textRuns)]));
// Track original source ranges as visitor edits change their lengths. Text and class writes commute.
const classRanges = new Map();
for (const group of fixture.groups) {
  const position = fixture.positions.find(position => position.key === group.key);
  for (const edit of fixture.responses[position.authored.edits].edits) classRanges.set(group.key + ':' + edit.from, { start: edit.start, end: edit.end });
}
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
function replaceSource(start, end, replacement) {
  const delta = replacement.length - (end - start);
  const shift = range => {
    if (range.start >= end) { range.start += delta; range.end += delta; }
    else if (range.end > start) range.end += delta;
  };
  for (const position of fixture.positions.filter(position => position.location.file === fixture.file)) for (const run of textRuns.get(position.key)) {
    shift(run); if (run.literal) shift(run.literal);
  }
  for (const range of classRanges.values()) shift(range);
  source = source.slice(0, start) + replacement + source.slice(end);
}
async function textReading(position) {
  const body = structuredClone(fixture.responses[position.authored.text]);
  if (position.location.file !== fixture.file) return body;
  body.hash = hash;
  if (body.editable) body.runs = await Promise.all(textRuns.get(position.key).map(async run => ({
    id: await digest(JSON.stringify([hash, run.start, run.end])), text: run.text, start: run.start, end: run.end,
  })));
  return body;
}
const fileOf = value => {
  let path = String(value || '');
  try { path = decodeURIComponent(new URL(path, location.href).pathname); } catch {}
  return fixture.positions.find(position => path.endsWith('/' + position.location.file) || path === position.location.file)?.location.file || value;
};
const answer = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const recorded = id => {
  const body = structuredClone(fixture.responses[id]);
  if (body && typeof body === 'object') {
    if ('revision' in body) body.revision = revision;
    if (body.file === fixture.file && 'hash' in body) body.hash = hash;
  }
  return body;
};
const refusal = method => {
  const fallback = fixture.fallback[method];
  return fallback ? answer(fallback.body, fallback.status) : answer({ error: `Unknown method: ${method}.` }, 400);
};
const readAt = key => fixture.groups.find(group => group.key === key)?.states[classes.get(key)] || fixture.positions.find(position => position.key === key)?.authored;

// Serialize writes like the real Session; a second request with the old hash becomes stale.
let writing = Promise.resolve();
async function apply(params, file) {
  if (file !== fixture.file) return answer({ error: 'This demo only writes the recorded hero card.' }, 400);
  if (params.hash !== hash) return answer({ error: 'The file changed since the overlay read it. Read it again.' }, 400);
  if (!Array.isArray(params.edits) || !params.edits.length || params.edits.some(edit => typeof edit?.id !== 'string')) return answer({ error: 'edits must be a non-empty array of edit ids.' }, 400);
  const available = new Map();
  for (const group of fixture.groups) for (const edit of recorded(readAt(group.key).edits).edits) available.set(edit.id, { edit, group });
  const selected = params.edits.map(requested => available.get(requested.id));
  if (selected.some(item => !item) || new Set(selected.map(item => item.edit.line + ':' + item.edit.column)).size !== selected.length) return answer({ error: 'Unknown or overlapping edit id. Read the site\'s edits again.' }, 400);
  const next = new Map(classes);
  for (const { edit, group } of selected) next.set(group.key, next.get(group.key).split(/\s+/).map(token => token === edit.from ? edit.to : token).join(' '));
  if (selected.some(({ group }) => !group.states[next.get(group.key)])) return answer({ error: 'That combination is not in this recording. Re-record the hero.' }, 400);
  const changes = selected.map(({ edit, group }) => ({ edit, group, nodes: [...document.querySelectorAll('[data-plumb-source]')].filter(node => {
    const position = fixture.positions.find(position => position.stamp === node.getAttribute('data-plumb-source'));
    return position?.key === group.key && node.classList.contains(edit.from);
  }) }));
  if (changes.some(change => !change.nodes.length)) return answer({ error: 'The demo element changed since Plumb read it. Read it again.' }, 400);
  const replacements = selected.map(({ edit, group }) => ({ ...classRanges.get(group.key + ':' + edit.from), to: edit.to, from: edit.from }));
  if (replacements.some(edit => source.slice(edit.start, edit.end) !== edit.from)) return answer({ error: 'The file changed since the overlay read it. Read it again.' }, 400);
  for (const edit of replacements.sort((a, b) => b.start - a.start)) replaceSource(edit.start, edit.end, edit.to);
  hash = await digest(source); revision++;
  for (const { edit, group, nodes } of changes) {
    classes.set(group.key, next.get(group.key));
    for (const node of nodes) node.classList.replace(edit.from, edit.to);
    window.dispatchEvent(new CustomEvent('plumb:demo-applied', { detail: { kind: 'class', file, line: edit.line, before: edit.from, after: edit.to } }));
  }
  const result = recorded(selected[0].group.states[next.get(selected[0].group.key)].applied);
  result.hash = hash; result.applied = params.edits.map(edit => edit.id);
  result.remaining = [...new Set(selected.map(({ group }) => group))].flatMap(group => recorded(group.states[next.get(group.key)].applied).remaining);
  return answer(result);
}

async function applyText(params, file) {
  const refuse = error => answer({ error }, 400);
  if (typeof params.file !== 'string' || !params.file.trim() || typeof params.hash !== 'string' || !params.hash.trim() || typeof params.run !== 'string' || !params.run.trim() || typeof params.from !== 'string' || typeof params.to !== 'string') return refuse(textWriteErrors.parameters);
  if (!params.to.trim()) return refuse(textWriteErrors.empty);
  if (params.to.length > 500) return refuse(textWriteErrors.length);
  if (file !== fixture.file) return refuse('This demo only writes the recorded hero card.');
  if (params.hash !== hash) return refuse('The file changed since the overlay read it. Read it again.');
  let selected;
  for (const position of fixture.positions.filter(position => position.location.file === file)) {
    const reading = await textReading(position);
    const index = reading.runs?.findIndex(run => run.id === params.run) ?? -1;
    if (index >= 0) { selected = { position, run: textRuns.get(position.key)[index] }; break; }
  }
  if (!selected) return refuse(textWriteErrors.unknown);
  const { position, run } = selected;
  if (run.text !== params.from) return refuse(textWriteErrors.mismatch);
  const hosts = [...document.querySelectorAll('[data-plumb-source]')].filter(node => node.getAttribute('data-plumb-source') === position.stamp);
  const targets = hosts.map(host => [...host.childNodes].filter(node => node.nodeType === Node.TEXT_NODE &&
    (run.domText !== undefined ? node.data === run.domText : run.literal ? node.data === run.text : node.data.trim() === run.text)));
  if (!targets.length || targets.some(nodes => nodes.length !== 1)) return refuse('The demo element changed since Plumb read it. Read it again.');
  const node = targets[0][0];
  const padding = run.domPadding ?? (run.literal ? ['', ''] : [node.data.match(/^\s*/)?.[0] || '', node.data.match(/\s*$/)?.[0] || '']);
  const start = run.literal?.start ?? run.start, end = run.literal?.end ?? run.end;
  const raw = source.slice(start, end);
  const replacement = run.literal ? encodeTextLiteral(params.to, run.literal.quote) : encodeJSXText(raw, params.to);
  const originalStart = run.start;
  const wasLiteral = Boolean(run.literal);
  replaceSource(start, end, replacement);
  if (!wasLiteral && encodeJSXText('', params.to).startsWith('{')) {
    run.start = originalStart + (raw.match(/^\s*/)?.[0].length || 0);
    run.end = originalStart + replacement.length - (raw.match(/\s*$/)?.[0].length || 0);
    run.literal = { start: run.start + 1, end: run.end - 1, quote: '"' };
  }
  hash = await digest(source); revision++;
  run.text = params.to; run.domPadding = padding; run.domText = padding[0] + params.to + padding[1];
  for (const nodes of targets) nodes[0].data = run.domText;
  window.dispatchEvent(new CustomEvent('plumb:demo-applied', { detail: { kind: 'text', file, line: position.location.line, before: params.from, after: params.to } }));
  return answer({ revision, file, hash, applied: [params.run], remaining: recorded(readAt(position.key).site).findings });
}

window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith('/__plumb/')) return liveFetch(input, init);
  const method = url.pathname.slice('/__plumb/'.length);
  const verb = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  let params = Object.fromEntries(url.searchParams);
  if (verb === 'POST') {
    try { params = JSON.parse(init?.body ?? (input instanceof Request ? await input.clone().text() : '')); }
    catch { return answer({ error: 'Request body must be valid JSON.' }, 400); }
    if (!params || typeof params !== 'object' || Array.isArray(params)) return answer({ error: 'Parameters must be a JSON object.' }, 400);
  }
  const file = fileOf(params.file || params.source);
  if (!production && file !== fixture.file) return liveFetch(input, init);
  const expected = ['apply', 'apply-text'].includes(method) ? 'POST' : 'GET';
  if (verb !== expected) return answer({ error: `Use ${expected} for this endpoint.` }, 405);
  if (method === 'health') return answer({ ...fixture.health, revision });
  if (method === 'resolve') {
    const stamp = `${params.source}:${params.line}:${params.column}#${params.hash}`;
    const position = fixture.positions.find(position => position.stamp === stamp && (params.tag === position.params.tag || params.tag === '*'));
    if (!position) return refusal(method);
    return answer({ ...position.location, ...(position.location.file === fixture.file ? { hash } : {}) });
  }
  const reading = readAt(`${file}:${params.line}:${params.column}`);
  if (method === 'text') {
    if (typeof params.file !== 'string' || !params.file.trim()) return answer({ error: 'file must be a non-empty string.' }, 400);
    for (const name of ['line', 'column']) if (!/^[1-9]\d*$/.test(params[name]) || !Number.isSafeInteger(Number(params[name]))) return answer({ error: `${name} must be a positive integer.` }, 400);
    await writing;
    const position = fixture.positions.find(position => position.key === `${file}:${params.line}:${params.column}`);
    if (position) return answer(await textReading(position));
    return fixture.positions.some(position => position.location.file === file) ? answer({ error: 'Source position does not identify an authored JSX opening tag.' }, 400) : refusal(method);
  }
  if (['site', 'edits', 'classes'].includes(method)) {
    if (!reading || method === 'classes' && params.classes !== reading.classes) return refusal(method);
    return answer(recorded(reading[method === 'classes' ? 'traced' : method]));
  }
  if (!['apply', 'apply-text'].includes(method)) return refusal(method);
  const result = writing.then(() => method === 'apply-text' ? applyText(params, file) : apply(params, file));
  writing = result.catch(() => {});
  return result;
};
