// Regenerate full evidence and slim site references using the existing CLI. No build.
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { plumbCommand, recordingJSON, recordingPaths } from './recording.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const unsupported = 'not supported';
const sources = new Map();
const sorted = values => [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
function walk(node, visit) { visit(node); ts.forEachChild(node, child => { walk(child, visit); }); }
async function source(file, json = false) {
  if (!sources.has(file)) {
    const text = await readFile(resolve(repo, file), 'utf8');
    const ast = json ? ts.parseJsonText(file, text) : ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    sources.set(file, { file, text, ast });
  }
  return sources.get(file);
}
function cite(node, src) { return `${src.file}:${src.ast.getLineAndCharacterOfPosition(node.getStart(src.ast)).line + 1}`; }
function unbox(node) {
  while (node && (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node))) node = node.expression;
  return node;
}
function literal(node) {
  node = unbox(node);
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, literal(p.initializer)]));
}
function properties(node) { return unbox(node)?.properties?.filter(ts.isPropertyAssignment) ?? []; }
function prop(node, name) {
  return unbox(node)?.properties?.find(p => p.name?.text === name)?.initializer
    ?? unbox(node)?.properties?.find(p => ts.isShorthandPropertyAssignment(p) && p.name.text === name)?.name;
}
function declaration(src, name) {
  let found;
  walk(src.ast, node => { if (ts.isVariableDeclaration(node) && node.name.getText(src.ast) === name && !found) found = node.initializer; });
  if (!found) throw new Error(`Missing ${src.file}:${name}`);
  return unbox(found);
}
function expression(node, src) {
  if (!node) return { template: unsupported, sources: [`${src.file}:1`] };
  node = unbox(node);
  // Resolve simple lexical constants, but do not evaluate application code.
  if (ts.isIdentifier(node)) {
    for (let scope = node.parent; scope; scope = scope.parent) {
      if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue;
      const declarations = scope.statements.filter(ts.isVariableStatement).flatMap(statement => statement.declarationList.declarations);
      const local = declarations.find(d => d.name.getText(src.ast) === node.text && d.initializer && d.getStart(src.ast) < node.getStart(src.ast));
      if (local) return expression(local.initializer, src);
    }
  }
  const value = literal(node);
  const template = typeof value === 'string' ? value : ts.isTemplateExpression(node)
    ? node.head.text + node.templateSpans.map(span => `{${span.expression.getText(src.ast)}}${span.literal.text}`).join('')
    : node.getText(src.ast);
  return { template, expression: node.getText(src.ast), sources: [cite(node, src)] };
}
async function files(directory) {
  const paths = [];
  for (const entry of await readdir(resolve(repo, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await files(path));
    else if (path.endsWith('.ts')) paths.push(path);
  }
  return sorted(paths);
}
function cliRun(args, cache) {
  const run = spawnSync(process.execPath, ['dist/cli.js', ...args], {
    cwd: repo, encoding: 'utf8', timeout: 30_000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PLUMB_CACHE_DIR: cache, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  if (run.error) throw run.error;
  if (![0, 1].includes(run.status)) throw new Error(`CLI ${args.join(' ')} failed (${run.status}): ${run.stderr}`);
  return { command: plumbCommand(args, 'fixtures/docs-judged'), exitCode: run.status, stdout: run.stdout, stderr: run.stderr };
}

// JSON AST locations preserve exact schema provenance, including local $refs.
async function flatten(file) {
  const src = await source(file, true), schema = JSON.parse(src.text), nodes = new Map();
  function index(node, path = '') {
    nodes.set(path, node);
    for (const p of properties(node)) index(p.initializer, `${path}/${p.name.text}`);
    if (ts.isArrayLiteralExpression(node)) node.elements.forEach((child, i) => index(child, `${path}/${i}`));
  }
  index(src.ast.statements[0].expression);
  const rows = new Map();
  function expand(node, pointer, refs = []) {
    if (!node.$ref) return [{ node, pointer, refs }];
    if (!node.$ref.startsWith('#/')) throw new Error(`External ref: ${file}:${node.$ref}`);
    if (refs.includes(node.$ref)) throw new Error(`Recursive ref: ${file}:${node.$ref}`);
    const target = node.$ref.slice(1);
    const value = target.slice(1).split('/').reduce((v, key) => v[key.replaceAll('~1', '/').replaceAll('~0', '~')], schema);
    return expand({ ...value, ...Object.fromEntries(Object.entries(node).filter(([key]) => key !== '$ref')) }, target, [...refs, node.$ref]);
  }
  function typeOf(node) {
    if (node.type) return Array.isArray(node.type) ? node.type : [node.type];
    if (node.enum) return sorted(new Set(node.enum.map(v => v === null ? 'null' : typeof v)));
    if ('const' in node) return [node.const === null ? 'null' : typeof node.const];
    if (node.properties || node.additionalProperties || node.patternProperties) return ['object'];
    return [];
  }
  function visit(raw, pointer, path, required, conditions = []) {
    for (const { node, pointer: resolvedPointer, refs } of expand(raw, pointer)) {
      const parentPointer = pointer.includes('/properties/') ? pointer.slice(0, pointer.lastIndexOf('/properties/')) : pointer;
      const requiredNode = nodes.get(`${parentPointer}/required`);
      const nodeSources = sorted(new Set([cite(nodes.get(pointer), src), cite(nodes.get(resolvedPointer), src), ...(requiredNode ? [cite(requiredNode, src)] : [])]));
      if (path) {
        let row = rows.get(path);
        if (!row) rows.set(path, row = { path, type: [], default: unsupported, enum: unsupported, description: unsupported, example: unsupported, required, variants: [], sources: [] });
        row.type = sorted(new Set([...row.type, ...typeOf(node)]));
        for (const [key, field] of [['default', 'default'], ['enum', 'enum'], ['description', 'description'], ['examples', 'example'], ['example', 'example']]) {
          if (key in node) row[field] = node[key];
        }
        row.sources = sorted(new Set([...row.sources, ...nodeSources]));
        row.variants.push({ type: typeOf(node).length ? typeOf(node) : unsupported, required, conditions, ...(refs.length ? { refs } : {}),
          constraints: Object.fromEntries(Object.entries(node).filter(([key]) => !['properties', 'items', '$defs', '$ref', 'anyOf', 'oneOf', 'allOf', 'additionalProperties', 'patternProperties'].includes(key))), sources: nodeSources });
      }
      for (const combinator of ['anyOf', 'oneOf', 'allOf']) (node[combinator] ?? []).forEach((branch, i) => visit(branch, `${resolvedPointer}/${combinator}/${i}`, path, required, [...conditions, `${file}#${resolvedPointer}/${combinator}/${i}`]));
      for (const key of sorted(Object.keys(node.properties ?? {}))) visit(node.properties[key], `${resolvedPointer}/properties/${key}`, path ? `${path}.${key}` : key, (node.required ?? []).includes(key), conditions);
      if (node.items) visit(node.items, `${resolvedPointer}/items`, `${path}[]`, false, conditions);
      if (node.additionalProperties && typeof node.additionalProperties === 'object') visit(node.additionalProperties, `${resolvedPointer}/additionalProperties`, `${path}.*`, false, conditions);
      for (const pattern of sorted(Object.keys(node.patternProperties ?? {}))) visit(node.patternProperties[pattern], `${resolvedPointer}/patternProperties/${pattern}`, `${path}.*`, false, [...conditions, `key matches ${pattern}`]);
    }
  }
  visit(schema, '', '', false);
  return sorted(rows.keys()).map(path => {
    const row = rows.get(path);
    if (!row.type.length) row.type = unsupported;
    else if (row.type.length === 1) row.type = row.type[0];
    return row;
  });
}

const cli = await source('src/cli.ts');
const optionsNode = declaration(cli, 'options');
const restrictionNode = declaration(cli, 'flags');
const restrictions = literal(restrictionNode);
let commandNode;
walk(cli.ast, node => {
  if (ts.isCallExpression(node) && node.expression.getText(cli.ast).endsWith('.includes') && node.arguments[0]?.getText(cli.ast) === 'command' && ts.isArrayLiteralExpression(node.expression.expression)) {
    if (!commandNode || node.expression.expression.elements.length > commandNode.elements.length) commandNode = node.expression.expression;
  }
});
if (!commandNode) throw new Error('CLI command allowlist missing.');
const helpNode = declaration(cli, 'help');
// Editorial summaries describe the source dispatch, never simulated CLI output.
const summaries = {
  accept: ['Record a reasoned exception for a finding key or rule and site.', 'ledgerCommand'],
  'accept-decisions': ['Accept the current token decisions in the ledger.', 'ledgerCommand'],
  'agent-docs': ['Write project guidance for coding agents.', 'writeAgentDocs'],
  baseline: ['Record existing findings as ledger debt.', 'ledgerCommand'],
  check: ['Check project styles and report design findings.', 'check'],
  decisions: ['List token decisions, optionally filtered by family.', 'report.decisions.filter'],
  doctor: ['Check project adoption and configuration health.', 'doctor'],
  explain: ['Show the collected styling declarations for a source file.', 'explain'],
  habits: ['List habit summaries and enabled rules.', 'report.habits'],
  imitation: ['Suggest component fingerprints for imitation checks.', 'report.imitationSuggestions'],
  init: ['Initialize project configuration and adoption records.', 'initProject'],
  install: ['Install agent integrations, hooks, CI or overlay host wiring.', 'installProject'],
  ledger: ['Inspect or maintain ledger entries.', 'ledgerCommand'],
  parity: ['Compare a DTCG token export with project theme tokens.', 'parity'],
  presets: ['List loaded preset summaries.', 'loadConfig'],
  report: ['Record the current report and trend, or show trend data since a Git ref.', 'recordTrend'],
  serve: ['Serve the project session over HTTP or standard input/output.', 'serve'],
  show: ['Inspect findings and ledger records by key or rule.', 'inspectLedger'],
  try: ['Check a styling snippet read from standard input.', 'trySnippet'],
  why: ['Inspect findings, declarations and ledger records at a file and line.', 'inspectLedger'],
};
function summaryFor(name) {
  if (!summaries[name]) return { summary: unsupported, summarySources: [cite(commandNode, cli)] };
  const [summary, marker] = summaries[name];
  const node = firstMatch(cli, node => ts.isCallExpression(node) && node.expression.getText(cli.ast) === marker
    || ts.isPropertyAccessExpression(node) && node.getText(cli.ast) === marker);
  return { summary, summarySources: [cite(node, cli)] };
}
const helpSource = expression(helpNode, cli).template;
const usageLines = helpSource.split('\n').filter(line => /(?:Usage: |^\s+)plumb /.test(line)).map(line => line.trim().replace(/^Usage: /, ''));
const globalFlags = properties(optionsNode).map(p => {
  const name = p.name.text, spec = literal(p.initializer);
  const match = helpSource.split('\n').find(line => new RegExp(`^  --${name}(?: |$)`).test(line));
  const validations = [];
  walk(cli.ast, node => {
    if (ts.isNewExpression(node) && node.expression.getText(cli.ast) === 'UsageError' && node.arguments?.[0]?.getText(cli.ast).includes(`--${name}`)) validations.push(expression(node.arguments[0], cli));
  });
  return { name: `--${name}`, type: spec.type, default: spec.default ?? (name === 'root' ? 'current directory' : unsupported),
    description: match?.trim().split(/\s{2,}/).slice(1).join(' ') || unsupported,
    commands: restrictions[name] ?? literal(commandNode), validations,
    sources: [cite(p, cli), ...(match ? [cite(helpNode, cli)] : []), ...(restrictions[name] ? [cite(prop(restrictionNode, name), cli)] : [])] };
}).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// Scan emission sites, not docs or string mentions in consumers.
const ruleMap = new Map();
const familySource = await source('src/rules/families.ts');
const judgedFamilies = literal(declaration(familySource, 'judgedFamilies'));
const reportSource = await source('src/report.ts');
let allFamilies;
walk(reportSource.ast, node => { if (ts.isTypeAliasDeclaration(node) && node.name.text === 'Family') allFamilies = node.type.types.map(t => literal(t.literal)); });
const habits = await source('src/habits/index.ts');
const builtinNodes = declaration(habits, 'builtins').elements;
const builtins = builtinNodes.map(literal);
function ids(node, src) {
  node = unbox(node);
  if (ts.isConditionalExpression(node)) return [...ids(node.whenTrue, src), ...ids(node.whenFalse, src)];
  if (ts.isStringLiteralLike(node)) return node.text.includes('/') ? [node.text] : [];
  if (!ts.isTemplateExpression(node)) return [];
  const pattern = expression(node, src).template;
  if (pattern.includes('{family}')) return (pattern.startsWith('dead/') ? allFamilies : judgedFamilies).map(family => pattern.replace('{family}', family));
  if (pattern.startsWith('habits/')) return [...builtins.map(h => `habits/${h.id}`), 'habits/{id}'];
  if (pattern.startsWith('ownership/')) return ['ownership/{Component}'];
  if (pattern.startsWith('imitation/')) return ['imitation/{Component}'];
  throw new Error(`Unrecognized emitted rule pattern: ${src.file}:${pattern}`);
}
function addRule(id, node, src, fields = {}) {
  if (!ruleMap.has(id)) ruleMap.set(id, { id, pattern: id.includes('{'), family: id.startsWith('provenance/') || id.startsWith('dead/') ? id.split('/')[1] : id.split('/')[0], emissions: [], fields: {} });
  const record = ruleMap.get(id);
  record.emissions.push({ source: cite(node, src), expression: node.getText(src.ast) });
  for (const [key, value] of Object.entries(fields)) if (value) (record.fields[key] ??= []).push(expression(value, src));
}
for (const file of await files('src')) {
  const src = await source(file);
  walk(src.ast, node => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(src.ast);
      if (callee === 'makeFinding') {
        const input = node.arguments[0], rule = prop(input, 'rule');
        if (rule) for (const id of ids(rule, src)) addRule(id, node, src, { title: prop(input, 'title'), because: prop(input, 'because'), fix: prop(input, 'action'), severity: prop(input, 'severity'), family: prop(input, 'family') });
      }
      if (['diagnostic', 'configDiagnostic'].includes(callee) && ts.isStringLiteralLike(node.arguments[0])) {
        const [rule, second, third, fourth, fifth] = node.arguments;
        for (const id of ids(rule, src)) addRule(id, node, src, callee === 'diagnostic' ? { severity: second, title: fourth, fix: fifth } : { title: third, because: fourth, fix: fifth });
      }
      if (file === 'src/parity.ts' && callee === 'add' && ts.isStringLiteralLike(node.arguments[0])) {
        const [rule, , title, because, fix] = node.arguments;
        for (const id of ids(rule, src)) addRule(id, node, src, { title, because, fix });
      }
    }
    if (file === 'src/rules/provenance.ts' && ts.isBinaryExpression(node) && node.left.getText(src.ast) === 'rule' && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const block = node.parent.parent;
      const fields = {};
      if (ts.isBlock(block)) for (const statement of block.statements) {
        const assignment = statement.expression;
        if (assignment && ts.isBinaryExpression(assignment) && ['title', 'because', 'severity'].includes(assignment.left.getText(src.ast)) && assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken) fields[assignment.left.getText(src.ast)] = assignment.right;
      }
      for (const id of ids(node.right, src)) addRule(id, node, src, fields);
    }
  });
}

const messages = await source('src/messages.ts');
const docsText = await readFile(resolve(repo, 'docs/MESSAGES.md'), 'utf8');
const docLines = docsText.split('\n');
function docTemplate(id) {
  const pattern = /^provenance\/(?:spacing|color|radius|type|motion|elevation|z)(?:\/|$)/.test(id) || id.startsWith('dead/')
    ? id.replace(/^(provenance|dead)\/[^/]+/, '$1/{family}') : id;
  let index = docLines.findIndex(line => line.startsWith(`**${id}**`));
  if (index < 0) index = docLines.findIndex(line => line.startsWith(`**${pattern}**`));
  if (index < 0) return undefined;
  let end = index + 1;
  while (end < docLines.length && !/^\*\*|^### /.test(docLines[end])) end++;
  return { contract: docLines.slice(index, end).join('\n').trim(), sources: [`docs/MESSAGES.md:${index + 1}`],
    fields: Object.fromEntries(['title', 'because', 'fix'].map(field => {
      const labels = field === 'title' ? ['Title'] : field === 'because' ? ['Because'] : ['Do', 'Action'];
      const selected = docLines.slice(index, end).flatMap((line, offset) => labels.some(label => line.startsWith(`- ${label}:`) || line.startsWith(`- ${label},`)) ? [{ template: line.replace(/^- (?:Title|Because|Do|Action):\s*/, '').replace(/``\s?(.*?)\s?``/g, '$1'), sources: [`docs/MESSAGES.md:${index + offset + 1}`] }] : []);
      return [field, selected];
    })) };
}
function firstMatch(src, predicate) { let found; walk(src.ast, node => { if (!found && predicate(node)) found = node; }); if (!found) throw new Error(`Source pattern missing: ${src.file}`); return found; }
const acceptance = firstMatch(messages, node => ts.isBinaryExpression(node) && node.left.getText(messages.ast) === 'finding.accept');
const severityDefaults = {
  provenance: firstMatch(await source('src/rules/provenance.ts'), node => ts.isVariableDeclaration(node) && node.name.getText() === 'severity'),
  config: firstMatch(await source('src/diagnostics.ts'), node => ts.isPropertyAssignment(node) && node.name.text === 'severity'),
  parity: firstMatch(await source('src/parity.ts'), node => ts.isPropertyAssignment(node) && node.name.text === 'severity'),
};
const ledger = await source('src/ledger/check.ts');
const ledgerTitle = declaration(ledger, 'title'), ledgerBecause = declaration(ledger, 'because'), ledgerAction = declaration(ledger, 'action');
const habitMessage = firstMatch(habits, node => ts.isFunctionDeclaration(node) && node.name?.text === 'habitMessage');
const familyReasonNode = declaration(messages, 'familyReasons');
const ownershipSource = await source('src/ownership/judge.ts');
const ownershipFamily = firstMatch(ownershipSource, node => ts.isFunctionDeclaration(node) && node.name?.text === 'ownershipFamily');
const ownershipFamilies = [];
walk(ownershipFamily, node => { if (ts.isReturnStatement(node) && ts.isStringLiteralLike(node.expression)) ownershipFamilies.push(node.expression.text); });
const provenanceSource = await source('src/rules/provenance.ts');
const groupedFinding = firstMatch(provenanceSource, node => ts.isVariableDeclaration(node) && node.name.getText(provenanceSource.ast) === 'grouped' && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(provenanceSource.ast) === 'makeFinding').initializer;
const ledgerGrowthTitle = firstMatch(ledger, node => ts.isBinaryExpression(node) && node.left.getText(ledger.ast) === 'finding.title');
const noFitNode = declaration(messages, 'noFit').body;
const choiceTextNode = declaration(messages, 'choiceText').body;
function conditionalFor(node, id, src) {
  node = unbox(node);
  if (!ts.isConditionalExpression(node)) return node;
  const condition = node.condition;
  if (ts.isBinaryExpression(condition) && condition.left.getText(src.ast) === 'rule' && ts.isStringLiteralLike(condition.right)) return condition.right.text === id ? node.whenTrue : conditionalFor(node.whenFalse, id, src);
  return node;
}
const rules = sorted(ruleMap.keys()).map(id => {
  const record = ruleMap.get(id), contract = docTemplate(id);
  const templates = {};
  for (const key of ['title', 'because', 'fix']) templates[key] = record.fields[key]?.length ? record.fields[key] : contract?.fields[key]?.length ? contract.fields[key] : [{ template: unsupported, sources: record.emissions.map(e => e.source) }];
  let severity = record.fields.severity;
  if (id.startsWith('provenance/')) severity ??= [expression(severityDefaults.provenance.initializer, sources.get('src/rules/provenance.ts'))];
  if (id.startsWith('config/') && id !== 'config/no-tokens') severity = [expression(severityDefaults.config.initializer, sources.get('src/diagnostics.ts'))];
  if (id.startsWith('parity/')) severity = [expression(severityDefaults.parity.initializer, sources.get('src/parity.ts'))];
  if (id.startsWith('ledger/') || id.startsWith('decisions/')) {
    templates.title = [expression(conditionalFor(ledgerTitle, id, ledger), ledger)];
    templates.because = [expression(conditionalFor(ledgerBecause, id, ledger), ledger)];
    templates.fix = ['ledger/no-why', 'decisions/unaccepted'].includes(id) ? [expression(conditionalFor(ledgerAction, id, ledger), ledger)] : record.fields.fix;
    if (['ledger/stale', 'decisions/vanished'].includes(id)) templates.title = record.fields.title.map(t => ({ ...t, template: t.template.replaceAll('decision', 'token') }));
    if (id === 'ledger/grew') templates.title = [expression(ledgerGrowthTitle.right, ledger)];
  }
  if (id.startsWith('habits/')) {
    const index = builtins.findIndex(h => `habits/${h.id}` === id), builtin = builtinNodes[index];
    const clause = firstMatch({ ...habits, ast: habitMessage }, node => id === 'habits/{id}' ? ts.isDefaultClause(node) : ts.isCaseClause(node) && literal(node.expression) === id.slice(7));
    const returned = firstMatch({ ...habits, ast: clause }, ts.isReturnStatement).expression;
    templates.title = [expression(prop(returned, 'title'), habits)];
    templates.because = builtin ? [expression(prop(builtin, 'reason'), habits)] : [{ template: '{habit.message}', sources: ['src/habits/index.ts:186'] }];
    const action = prop(returned, 'action');
    templates.fix = builtin ? [expression(action?.getText(habits.ast) === 'fix' ? prop(builtin, 'fix') : action, habits)] : [{ template: '{habit.message}', sources: ['src/habits/index.ts:182'] }];
    severity = builtin ? [expression(prop(builtin, 'severity'), habits)] : [{ template: 'error', expression: "habit.severity ?? 'error'", sources: ['src/habits/index.ts:186'] }];
  }
  if (id.startsWith('ownership/')) record.family = sorted(ownershipFamilies);
  if (id.startsWith('parity/')) record.family = allFamilies;
  if (id.startsWith('provenance/')) {
    if (!id.includes('/framework') && !id.includes('/tier') && !id.includes('/by-value') && id !== 'provenance/opaque-inline') {
      const family = id.split('/')[1];
      templates.because = family === 'arbitrary' ? judgedFamilies.map(f => ({ ...expression(prop(familyReasonNode, f), messages), family: f })) : [expression(prop(familyReasonNode, family), messages)];
    }
    if (id.endsWith('/by-value')) templates.title.push(expression(prop(groupedFinding.arguments[0], 'title'), provenanceSource));
    if (id === 'provenance/opaque-inline') templates.fix = contract.fields.fix;
    else templates.fix = [...(contract?.fields.fix ?? []), ...(id.endsWith('/by-value') ? [] : [expression(noFitNode, messages)]), expression(choiceTextNode, messages)];
  }
  if (['provenance/arbitrary', 'provenance/opaque-inline', 'config/no-tokens'].includes(id)) record.family = judgedFamilies;
  const severityValues = sorted(new Set((severity ?? []).flatMap(value => {
    if (['error', 'warn', 'info'].includes(value.template)) return [value.template];
    return [...value.expression.matchAll(/['"](error|warn|info)['"]/g)].map(match => match[1]);
  })));
  let accept = `plumb accept --rule ${id} --site <file:line> --why "…"`;
  if (id.startsWith('config/') || id.startsWith('parity/')) accept = unsupported;
  if (id === 'ledger/no-why') accept = 'plumb accept <key> --why "…"';
  if (id === 'decisions/unaccepted') accept = 'plumb accept-decisions --why "…"';
  const printedAccept = accept;
  if (['ledger/stale', 'ledger/grew', 'decisions/vanished'].includes(id)) accept = unsupported;
  return { id, pattern: record.pattern, family: record.family, defaultSeverity: severityValues.length === 1 ? severityValues[0] : severityValues.length ? severityValues : unsupported,
    severitySources: severity ?? [], familySources: id.startsWith('ownership/') ? [cite(ownershipFamily, ownershipSource)] : record.emissions.map(e => e.source), ...templates, accept, printedAccept, acceptanceSources: [cite(acceptance, messages), ...(id.startsWith('parity/') ? ['src/parity.ts:90'] : []), ...(printedAccept !== accept ? ['src/cli.ts:248', 'src/index.ts:241', 'src/ledger/commands.ts:96'] : [])],
    ...(contract ? { messageContract: { text: contract.contract, sources: contract.sources } } : {}), emissions: record.emissions };
});

const cache = await mkdtemp(resolve(tmpdir(), 'plumb-reference-'));
const portablePaths = recordingPaths({ repo, paths: [[cache, '.plumb/cache']] });
let commands, rawReport, checkRun;
try {
  commands = sorted(literal(commandNode)).map(name => {
    const captured = cliRun([name, '--help'], cache);
    if (captured.exitCode !== 0) throw new Error(`${name} --help failed.`);
    return { name, ...summaryFor(name), usage: usageLines.filter(line => new RegExp(`(?:plumb |\\| )${name}(?: |$)`).test(line) || name === 'check' && line.startsWith('plumb [check]')),
      flags: globalFlags.filter(flag => flag.commands.includes(name)).map(flag => ({ ...flag, type: name === 'install' && flag.name === '--agent' ? 'string[]' : flag.type,
        ...(name === 'install' && flag.name === '--agent' ? { sources: [...flag.sources, 'src/cli.ts:81'] } : {}) })),
      examples: [captured.command], help: captured, sources: [cite(commandNode, cli), cite(helpNode, cli)] };
  });
  checkRun = cliRun(['check', '--root', 'fixtures/docs-judged', '--json'], cache);
  rawReport = JSON.parse(checkRun.stdout);
  if (!rawReport.findings?.length) throw new Error('Fixture produced no findings.');
} finally { await rm(cache, { recursive: true, force: true }); }

// Omit observed volatile metrics; never invent timing numbers. Keep other report
// values, including coverage counts, intact when reducing findings to one.
function portable(value) {
  if (Array.isArray(value)) return value.map(portable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['timing', 'parseMs', 'totalMs', 'cacheHits', 'cacheMisses'].includes(key)).map(([key, v]) => [key, portable(v)]));
  return portablePaths(value);
}
const orderedFindings = [...rawReport.findings].sort((a, b) => a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
const firstFinding = orderedFindings.find(finding => finding.severity === 'error') ?? orderedFindings[0];
const configOptions = await flatten('schema/config.schema.json');
const reportFields = await flatten('schema/report.schema.json');
const outputs = {
  'ref-cli.json': { sources: ['src/cli.ts:28'], defaultCommand: 'check', defaultCommandSources: ['src/cli.ts:91'], commands, flags: globalFlags },
  'ref-config.json': { sources: ['schema/config.schema.json:1'], options: configOptions },
  'ref-rules.json': { sources: ['src/messages.ts:19'], rules },
  'ref-report.json': { sources: ['schema/report.schema.json:1'], fields: reportFields.map(({ path, type, required, description, variants, sources }) => ({ path, type, required, description, variants, sources })),
    example: portable({ ...rawReport, findings: [firstFinding] }), exampleRun: { command: checkRun.command, exitCode: checkRun.exitCode, sources: ['src/cli.ts:180', 'fixtures/docs-judged/plumb.config.ts:1', 'fixtures/docs-judged/src/Judged.tsx:1', 'fixtures/docs-judged/src/styles.css:1'] },
    omittedVolatileFields: ['timing', 'moduleGraph.parseMs', 'moduleGraph.totalMs', 'moduleGraph.cacheHits', 'moduleGraph.cacheMisses'], originalFindingCount: rawReport.findings.length },
};
// Display data carries no provenance or repeated help captures. Preserve absent
// values as null without losing false, zero, empty strings or empty arrays.
function displayValue(value) {
  if (value == null || value === unsupported) return null;
  if (Array.isArray(value)) return value.map(displayValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, displayValue(item)]));
  return value;
}
function displayTypes(rows) {
  const byPath = new Map(rows.map(row => [row.path, row]));
  const literalType = value => typeof value === 'string' ? `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'` : String(value);
  function typeFor(row) {
    if (!row || row.type === unsupported || row.type == null) return null;
    const enums = displayValue(row.enum);
    if (enums) return enums.map(literalType).join('|');
    const variants = (row.variants ?? []).filter(variant => Array.isArray(variant.type) && variant.type.length);
    if (variants.length && variants.every(({ constraints }) => constraints.enum || Object.hasOwn(constraints, 'const'))) {
      return [...new Set(variants.flatMap(({ constraints }) => (constraints.enum ?? [constraints.const]).map(literalType)))].join('|');
    }
    return (Array.isArray(row.type) ? row.type : [row.type]).map(type => {
      if (type !== 'array') return type;
      const item = typeFor(byPath.get(`${row.path}[]`));
      return item == null ? 'array' : `${item.includes('|') ? `(${item})` : item}[]`;
    }).join('|');
  }
  return typeFor;
}
const configType = displayTypes(configOptions), reportType = displayTypes(reportFields);
const sharedHelp = commands[0].help.stdout;
if (!commands.every(command => command.help.stdout === sharedHelp)) throw new Error('Command help is not shared.');
const displays = displayValue({
  'cli.json': {
    commands: commands.map(({ name, summary, usage, flags }) => ({ name, summary, usage,
      flags: flags.map(({ name, type, default: defaultValue, description }) => ({ name, type, default: defaultValue, description })) })),
    help: sharedHelp,
  },
  'config.json': { options: configOptions.map(row => ({ path: row.path, type: configType(row), required: row.required,
    default: row.default, enum: row.enum, description: row.description })) },
  'rules.json': { rules: rules.map(rule => ({ id: rule.id, pattern: rule.pattern,
    families: rule.family === unsupported || rule.family == null ? null : Array.isArray(rule.family) ? rule.family : [rule.family],
    severity: rule.defaultSeverity === unsupported || rule.defaultSeverity == null ? null : Array.isArray(rule.defaultSeverity) ? rule.defaultSeverity : [rule.defaultSeverity],
    title: rule.title?.[0]?.template, because: rule.because?.[0]?.template, fix: rule.fix?.[0]?.template,
    accept: rule.accept !== unsupported && rule.accept != null && Boolean(rule.accept) })) },
  'report.json': { fields: reportFields.map(row => ({ path: row.path, type: reportType(row), required: row.required, description: row.description })),
    example: portable(firstFinding) },
});
const evidenceDir = resolve(repo, 'docs/reference-data');
const recordingsDir = resolve(repo, 'site/src/docs/recordings');
const displayDir = resolve(recordingsDir, 'reference');
// Validate every payload before replacing any files. Compact display JSON still
// passes the shared absolute-path guard; full evidence remains indented.
const evidenceJSON = Object.entries(outputs).map(([name, data]) => [name, recordingJSON(data, portablePaths)]);
const displayJSON = Object.entries(displays).map(([name, data]) => {
  const json = JSON.stringify(JSON.parse(recordingJSON(data, portablePaths))) + '\n';
  const bytes = Buffer.byteLength(json);
  if (bytes >= 60_000) throw new Error(`${name} is ${bytes} bytes; must be under 60KB.`);
  return { name, json, bytes };
});
await mkdir(evidenceDir, { recursive: true });
await mkdir(displayDir, { recursive: true });
for (const [name, json] of evidenceJSON) await writeFile(resolve(evidenceDir, name), json);
for (const { name, json } of displayJSON) await writeFile(resolve(displayDir, name), json);
for (const [name] of evidenceJSON) await rm(resolve(recordingsDir, name), { force: true });

const result = [
  '# Reference slim result', '',
  'Run: `node scripts/docs/gen-reference.mjs`. Uses existing `dist/cli.js`; no build or commit.', '',
  'Full cited evidence: `docs/reference-data/ref-{cli,config,rules,report}.json`. Old full copies removed from `site/src/docs/recordings/`.', '',
  'Slim display files: `site/src/docs/recordings/reference/`.', '',
  ...displayJSON.map(({ name, bytes }) => '- `' + name + '`: ' + bytes + ' bytes (' + (bytes / 1000).toFixed(2) + ' KB); under 60KB.'), '',
  '- Exact requested shapes: ' + commands.length + ' commands, ' + configOptions.length + ' config paths, ' + rules.length + ' rules, ' + reportFields.length + ' report fields.',
  '- CLI retains one shared real --help capture; flags retain only name, type, default and description.',
  '- Config retains every sorted path, including containers, array items and map values. Types use short display strings, array suffixes and literal unions.',
  '- Rules retain family/severity arrays, first title/because/fix templates with placeholders intact, and boolean acceptance support.',
  '- Report example is the single trimmed finding object from the full evidence, without the surrounding report.',
  '- Absent and "not supported" display values become null; false, zero and empty values remain intact.',
  '- All eight JSON files pass recordingJSON absolute-path guard. Display size limit is enforced before files are written.',
  '- Site changes are confined to reference recordings.', '',
].join('\n');
await writeFile(resolve(repo, 'docs/briefs/reference-slim.result.md'), result);
console.log(result);
