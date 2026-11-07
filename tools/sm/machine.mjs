// @ts-check
// `@machine` extraction, format errors (spec 1.5), binding to the owner (spec 2.1) and the canonical table (spec 1.6).
import { createHash } from 'node:crypto';
import { finding, camel, kebab, listed, cmp } from './findings.mjs';
import { unwrap, keyName, topLevelClass, walk, isFunction, isStringLiteral } from './parse.mjs';

/** @typedef {import('./parse.mjs').Node} Node */

const NAME_RE = /^[a-z][a-zA-Z0-9]*$/;
const ID_RE = /^[a-z][a-z0-9-]*$/;
const MACHINE_KEYS = ['cancel', 'field', 'flights', 'id', 'initial', 'owner', 'send', 'states', 'token'];
const STATE_KEYS = ['final', 'flight', 'ignores', 'on'];
const FLIGHT_KEYS = ['ifLeft'];
const REQUIRED = ['id', 'owner', 'field', 'initial', 'states'];
const MEANING = {
  id: 'the name the CLI uses (lower-case, digits and dashes, unique in the repo)',
  owner: "the class name in this file, or 'module' for module-level state",
  field: "the phase field: '#name' (JS private), 'name' (public or TS private), or a module-level let name when owner is 'module'",
  initial: 'a state name',
  states: 'state name → { on, ignores, flight, final }',
};

/**
 * @typedef {{
 *   id: string, name: string, file: string, line: number, node: Node, stmt: Node,
 *   table: Table | null, canonical: Canonical | null, hash: string | null,
 *   spans: Record<string, Node>, stateKeys: Record<string, Node>,
 *   owner: Owner | null, bound: boolean, findings: any[]
 * }} Machine
 * @typedef {{ id: string, owner: string, field: string, token: string, send: string, initial: string, cancel: string[],
 *   states: Record<string, { on: Record<string, string>, ignores: string[], flight: string | null, final: boolean }>,
 *   flights: Record<string, { ifLeft: string }> }} Table
 * @typedef {{ id: string, owner: string, field: string, token: string, send: string, initial: string, cancel: string[],
 *   states: { name: string, final: boolean, flight: string | null, ignores: string[], on: { event: string, to: string }[] }[],
 *   flights: { name: string, ifLeft: string }[] }} Canonical
 * @typedef {{ kind: 'class' | 'module', name: string, node: Node, fields: Map<string, Node>, methods: Map<string, Node>, lets: Set<string>, hasAsync: boolean }} Owner
 */

/**
 * @param {string} file @param {{ program: Node, comments: any[], lines: number[] }} parsed @param {string} text
 * @returns {{ machines: Machine[], findings: any[] }}
 */
export function extractMachines(file, parsed, text) {
  const { program, comments, lines } = parsed;
  /** @type {Machine[]} */
  const machines = [];
  /** @type {any[]} */
  const findings = [];
  const body = program.body;
  for (const c of comments) {
    if (c.type !== 'Block' || !c.value.includes('@machine')) continue;
    const stmt = body.find((/** @type {Node} */ s) => s.start >= c.end);
    if (!stmt || text.slice(c.end, stmt.start).trim() !== '') continue;
    const m = readTagged(file, lines, stmt, findings);
    if (m) machines.push(m);
  }
  const byOwner = new Map();
  for (const m of machines) {
    if (!m.table) continue;
    const other = byOwner.get(m.table.owner);
    if (other) {
      m.findings.push(fmt(file, lines, m, m.spans.owner, 'sm/machine-owner-duplicate', m.table.owner,
        `\`${m.table.owner}\` already has machine \`${other.id}\`.`, 'One machine per owner. Merge them, or split the owner.'));
      continue; // the owner belongs to the first machine; the duplicate is not bound, so no lint runs for it
    }
    byOwner.set(m.table.owner, m);
    bind(file, lines, program, m);
  }
  for (const m of machines) findings.push(...m.findings);
  return { machines, findings };
}

/** @param {string} file @param {number[]} lines @param {{ id: string, name: string }} m @param {Node} node @param {string} rule @param {string} detail @param {string} message @param {string} fix */
function fmt(file, lines, m, node, rule, detail, message, fix) {
  return finding({ rule, file, lines, node, machine: m.id || null, scope: `machine:${m.id || m.name}`, detail, message, fix });
}

/** @param {Node} node */
function kindOf(node) {
  if (!node) return 'nothing';
  switch (node.type) {
    case 'Identifier': return 'an identifier';
    case 'TemplateLiteral': return 'a template literal';
    case 'CallExpression': case 'NewExpression': return 'a call';
    case 'SpreadElement': return 'a spread';
    case 'ArrowFunctionExpression': case 'FunctionExpression': return 'a function';
    case 'ArrayExpression': return 'an array';
    case 'ObjectExpression': return 'an object';
    case 'MemberExpression': return 'a member expression';
    case 'Literal':
      if (node.value === null) return 'null';
      if (typeof node.value === 'number') return 'a number';
      if (typeof node.value === 'boolean') return 'a boolean';
      if (typeof node.value === 'string') return 'a string';
      return 'a literal';
    default: return 'a ' + node.type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }
}

/**
 * @param {string} file @param {number[]} lines @param {Node} stmt @param {any[]} findings
 * @returns {Machine | null}
 */
function readTagged(file, lines, stmt, findings) {
  const declared = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
  const shape = { id: '', name: declared?.type === 'VariableDeclaration' && declared.declarations[0]?.id?.type === 'Identifier' ? declared.declarations[0].id.name : '' };
  const notExported = () => {
    findings.push(fmt(file, lines, shape, stmt, 'sm/machine-not-exported', '', 'A @machine must be `export const NAME = { … }`.',
      'Export it as a const; the oracle reads the file, it never runs it.'));
    return null;
  };
  if (stmt.type !== 'ExportNamedDeclaration' || stmt.declaration?.type !== 'VariableDeclaration') return notExported();
  const decl = stmt.declaration;
  if (decl.kind !== 'const' || decl.declarations.length !== 1) return notExported();
  const d = decl.declarations[0];
  if (d.id?.type !== 'Identifier' || !d.init) return notExported();
  shape.name = d.id.name;
  let init = d.init;
  for (;;) {
    if (init.type === 'TSSatisfiesExpression' || init.type === 'ParenthesizedExpression') init = init.expression;
    else if (init.type === 'TSAsExpression' && init.typeAnnotation?.type === 'TSTypeReference' && init.typeAnnotation.typeName?.name === 'const') init = init.expression;
    else break;
  }
  if (init.type !== 'ObjectExpression') {
    if (init.type === 'TSAsExpression') return notExported();
    findings.push(fmt(file, lines, shape, init, 'sm/machine-not-literal', '', `A machine holds only string, array and object literals; ${kindOf(init)} is not allowed.`,
      `Replace ${kindOf(init)} with a literal; put computed values in code, not in the table.`));
    return null;
  }
  /** @type {Machine} */
  const m = {
    id: '', name: shape.name, file, line: position(lines, stmt.start), node: init, stmt, table: null, canonical: null, hash: null,
    spans: {}, stateKeys: {}, owner: null, bound: false, findings: [],
  };
  readTable(file, lines, m);
  return m;
}

/** @param {number[]} lines @param {number} offset */
function position(lines, offset) {
  let lo = 0, hi = lines.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lines[mid] <= offset) lo = mid; else hi = mid - 1; }
  return lo + 1;
}

/**
 * Reads the entries of an object literal: duplicate, unknown and non-literal keys are reported.
 * @param {string} file @param {number[]} lines @param {Machine} m @param {Node} obj @param {string[] | null} allowed
 * @returns {Map<string, { key: Node, value: Node }>}
 */
function entries(file, lines, m, obj, allowed) {
  /** @type {Map<string, { key: Node, value: Node }>} */
  const out = new Map();
  for (const p of obj.properties) {
    if (p.type !== 'Property' || p.computed || p.method || p.kind !== 'init') {
      const kind = p.type === 'SpreadElement' ? 'a spread' : p.computed ? 'a computed key' : p.method ? 'a method' : 'a getter or setter';
      m.findings.push(fmt(file, lines, m, p, 'sm/machine-not-literal', '', `A machine holds only string, array and object literals; ${kind} is not allowed.`,
        `Replace ${kind} with a literal; put computed values in code, not in the table.`));
      continue;
    }
    const name = keyName(p.key);
    if (name === null) {
      m.findings.push(fmt(file, lines, m, p.key, 'sm/machine-not-literal', '', `A machine holds only string, array and object literals; ${kindOf(p.key)} is not allowed.`,
        `Replace ${kindOf(p.key)} with a literal; put computed values in code, not in the table.`));
      continue;
    }
    if (p.shorthand) {
      m.findings.push(fmt(file, lines, m, p, 'sm/machine-not-literal', name, 'A machine holds only string, array and object literals; an identifier is not allowed.',
        'Replace an identifier with a literal; put computed values in code, not in the table.'));
      continue;
    }
    if (out.has(name)) {
      m.findings.push(fmt(file, lines, m, p.key, 'sm/machine-key-duplicate', name, `\`${name}\` appears twice.`, 'Keep one.'));
      continue;
    }
    if (allowed && !allowed.includes(name)) {
      m.findings.push(fmt(file, lines, m, p.key, 'sm/machine-key-unknown', name, `\`${name}\` is not a machine key (allowed here: ${listed(allowed)}).`,
        `Remove it, or rename it to one of: ${listed(allowed)}.`));
      continue;
    }
    out.set(name, { key: p.key, value: p.value });
  }
  return out;
}

/**
 * The value as a string, string[] or object node, or null with a not-literal finding.
 * @param {string} file @param {number[]} lines @param {Machine} m @param {string} key @param {Node} value @param {'string' | 'array' | 'object' | 'boolean'} want
 */
function literal(file, lines, m, key, value, want) {
  const v = unwrap(value) ?? value;
  const kind = kindOf(v);
  const ok = (want === 'string' && isStringLiteral(v)) || (want === 'array' && v.type === 'ArrayExpression') || (want === 'object' && v.type === 'ObjectExpression')
    || (want === 'boolean' && v.type === 'Literal' && typeof v.value === 'boolean');
  if (!ok) {
    const literalKind = ['a string', 'an array', 'an object', 'a boolean'].includes(kind) ? `${kind} (\`${key}\` takes ${want === 'array' ? 'an array' : want === 'object' ? 'an object' : 'a ' + want})` : kind;
    m.findings.push(fmt(file, lines, m, v, 'sm/machine-not-literal', key, `A machine holds only string, array and object literals; ${literalKind} is not allowed.`,
      `Replace ${literalKind} with a literal; put computed values in code, not in the table.`));
    return null;
  }
  if (want === 'array') {
    /** @type {{ value: string, node: Node }[]} */
    const items = [];
    for (const el of v.elements) {
      const e = el && unwrap(el);
      if (!e || !isStringLiteral(e)) {
        const k = kindOf(e);
        m.findings.push(fmt(file, lines, m, el ?? v, 'sm/machine-not-literal', key, `A machine holds only string, array and object literals; ${k} is not allowed.`,
          `Replace ${k} with a literal; put computed values in code, not in the table.`));
        continue;
      }
      items.push({ value: e.value, node: e });
    }
    return items;
  }
  return v;
}

/** @param {string} file @param {number[]} lines @param {Machine} m @param {string} name @param {Node} node @param {string} what */
function checkName(file, lines, m, name, node, what) {
  if (NAME_RE.test(name)) return true;
  m.findings.push(fmt(file, lines, m, node, 'sm/machine-name-shape', name,
    `\`${name}\` is not a lower-camel domain name. Key names (\`Escape\`) are mapped in code: \`if (k === 'Escape') this.#send('escape')\`.`,
    `Rename \`${name}\` to \`${camel(name)}\`.`));
  return what === 'ignore';
}

/** @param {string} file @param {number[]} lines @param {Machine} m */
function readTable(file, lines, m) {
  const before = m.findings.length;
  const top = entries(file, lines, m, m.node, MACHINE_KEYS);
  for (const [k, e] of top) m.spans[k] = e.key;
  const str = (/** @type {string} */ k) => (top.has(k) ? literal(file, lines, m, k, top.get(k).value, 'string') : null);
  const idNode = str('id');
  if (idNode) {
    m.id = idNode.value;
    if (!ID_RE.test(m.id)) {
      m.findings.push(fmt(file, lines, m, idNode, 'sm/machine-id-shape', m.id, `Machine ids are lower-case, digits and dashes: \`${m.id}\`.`, `Rename it to ${kebab(m.id)}.`));
    }
  }
  for (const k of REQUIRED) {
    if (!top.has(k)) {
      m.findings.push(fmt(file, lines, m, m.node, 'sm/machine-key-missing', k, `Machine ${m.id || m.name} is missing \`${k}\`.`, `Add \`${k}\`: ${MEANING[/** @type {'id'} */ (k)]}.`));
    }
  }
  const ownerNode = str('owner'), fieldNode = str('field'), initialNode = str('initial'), tokenNode = str('token'), sendNode = str('send');
  const isModule = ownerNode?.value === 'module';
  /** @type {string[]} */
  const cancel = [];
  if (top.has('cancel')) {
    const items = literal(file, lines, m, 'cancel', top.get('cancel').value, 'array');
    if (items) {
      for (const { value, node } of items) {
        if (!checkName(file, lines, m, value, node, 'ignore')) continue;
        if (cancel.includes(value)) m.findings.push(fmt(file, lines, m, node, 'sm/machine-ignores-duplicate', value, `\`${value}\` is listed twice.`, 'Keep one.'));
        else cancel.push(value);
      }
    }
  }
  /** @type {Table['states']} */
  const states = {};
  const statesObj = top.has('states') ? literal(file, lines, m, 'states', top.get('states').value, 'object') : null;
  if (statesObj) {
    const stateEntries = entries(file, lines, m, statesObj, null);
    if (!stateEntries.size) {
      m.findings.push(fmt(file, lines, m, statesObj, 'sm/machine-key-missing', 'states', `Machine ${m.id || m.name} is missing \`states\`.`, `Add \`states\`: ${MEANING.states}.`));
    }
    for (const [name, e] of stateEntries) {
      m.stateKeys[name] = e.key;
      checkName(file, lines, m, name, e.key, 'state');
      const obj = literal(file, lines, m, name, e.value, 'object');
      if (!obj) continue;
      const se = entries(file, lines, m, obj, STATE_KEYS);
      /** @type {Table['states'][string]} */
      const state = { on: {}, ignores: [], flight: null, final: false };
      if (se.has('on')) {
        const onObj = literal(file, lines, m, 'on', se.get('on').value, 'object');
        if (onObj) {
          for (const [event, oe] of entries(file, lines, m, onObj, null)) {
            checkName(file, lines, m, event, oe.key, 'event');
            const target = literal(file, lines, m, event, oe.value, 'string');
            if (target) state.on[event] = target.value;
            m.spans[`${name}.on.${event}`] = oe.value;
          }
        }
      }
      if (se.has('ignores')) {
        const items = literal(file, lines, m, 'ignores', se.get('ignores').value, 'array');
        if (items) {
          for (const { value, node } of items) {
            if (!checkName(file, lines, m, value, node, 'ignore')) continue;
            if (state.ignores.includes(value)) m.findings.push(fmt(file, lines, m, node, 'sm/machine-ignores-duplicate', value, `\`${value}\` is listed twice.`, 'Keep one.'));
            else state.ignores.push(value);
            if (value in state.on) m.findings.push(fmt(file, lines, m, node, 'sm/machine-event-both', value, `\`${name}\` both handles and ignores \`${value}\`.`, 'Keep it in one of the two.'));
          }
        }
      }
      if (se.has('flight')) {
        const f = literal(file, lines, m, 'flight', se.get('flight').value, 'string');
        if (f) { state.flight = f.value; checkName(file, lines, m, f.value, f, 'flight'); m.spans[`${name}.flight`] = f; }
      }
      if (se.has('final')) {
        const f = literal(file, lines, m, 'final', se.get('final').value, 'boolean');
        if (f) state.final = f.value === true;
        m.spans[`${name}.final`] = se.get('final').key;
      }
      if (state.final) {
        const which = [];
        if (se.has('on') && Object.keys(state.on).length) which.push('`on`');
        if (state.flight) which.push('`flight`');
        if (which.length) {
          m.findings.push(fmt(file, lines, m, m.spans[`${name}.final`], 'sm/machine-final-shape', name,
            `A final state has no transitions and no flight; \`${name}\` has ${which.join(' and ')}.`, `Remove \`final\`, or remove ${which.join(' and ')}.`));
        }
      }
      states[name] = state;
    }
  }
  /** @type {Table['flights']} */
  const flights = {};
  if (top.has('flights')) {
    const obj = literal(file, lines, m, 'flights', top.get('flights').value, 'object');
    if (obj) {
      for (const [name, fe] of entries(file, lines, m, obj, null)) {
        checkName(file, lines, m, name, fe.key, 'flight');
        m.spans[`flights.${name}`] = fe.key;
        const fobj = literal(file, lines, m, name, fe.value, 'object');
        if (!fobj) continue;
        const ff = entries(file, lines, m, fobj, FLIGHT_KEYS);
        const ifLeft = ff.has('ifLeft') ? literal(file, lines, m, 'ifLeft', ff.get('ifLeft').value, 'string') : null;
        if (!ifLeft || !['drop', 'handOff'].includes(ifLeft.value)) {
          m.findings.push(fmt(file, lines, m, ifLeft ?? fe.key, 'sm/machine-flight-undecided', name,
            `Flight \`${name}\` does not say what happens to a result that lands after its state was left.`,
            "Set `ifLeft` to `'drop'` (discard it) or `'handOff'` (give it to the host)."));
          continue;
        }
        flights[name] = { ifLeft: ifLeft.value };
      }
    }
  }
  const stateNames = Object.keys(states).sort(cmp);
  if (initialNode && statesObj && !(initialNode.value in states)) {
    m.findings.push(fmt(file, lines, m, initialNode, 'sm/machine-initial-unknown', initialNode.value,
      `\`initial\` is \`${initialNode.value}\`, which is not a state (states: ${listed(stateNames)}).`, `Set \`initial\` to one of ${listed(stateNames)}, or add the state.`));
  }
  for (const name of Object.keys(states)) {
    const s = states[name];
    for (const [event, to] of Object.entries(s.on)) {
      if (!(to in states)) {
        m.findings.push(fmt(file, lines, m, m.spans[`${name}.on.${event}`], 'sm/machine-target-unknown', `${name}.on.${event}`,
          `\`${name}.on.${event}\` points to \`${to}\`, which is not a state.`, `Add state \`${to}\`, or point the event at one of ${listed(stateNames)}.`));
      }
    }
    if (s.flight && !(s.flight in flights) && !m.findings.some(f => f.rule === 'sm/machine-flight-undecided' && f.key.includes(`|${s.flight}|`))) {
      m.findings.push(fmt(file, lines, m, m.spans[`${name}.flight`], 'sm/machine-flight-unknown', s.flight,
        `\`${name}\` has flight \`${s.flight}\`, but \`flights.${s.flight}\` is not declared.`, `Add \`flights: { ${s.flight}: { ifLeft: 'drop' } }\` (or \`'handOff'\`).`));
    }
  }
  for (const name of Object.keys(flights)) {
    if (!Object.values(states).some(s => s.flight === name)) {
      m.findings.push(fmt(file, lines, m, m.spans[`flights.${name}`], 'sm/machine-flight-unused', name, `Flight \`${name}\` belongs to no state.`,
        `Add \`flight: '${name}'\` to the state that runs it, or remove the entry.`));
    }
  }
  if (m.id) for (const f of m.findings) f.key = f.key.replace(`|machine:${m.name}|`, `|machine:${m.id}|`);
  if (m.findings.length > before || !idNode || !ownerNode || !fieldNode || !initialNode || !statesObj) return;
  m.table = {
    id: m.id, owner: ownerNode.value, field: fieldNode.value,
    token: tokenNode ? tokenNode.value : isModule || !fieldNode.value.startsWith('#') ? 'flight' : '#flight',
    send: sendNode ? sendNode.value : isModule || !fieldNode.value.startsWith('#') ? 'send' : '#send',
    initial: initialNode.value, cancel: [...cancel].sort(cmp), states, flights,
  };
  m.canonical = canonical(m.table);
  m.hash = createHash('sha1').update(JSON.stringify(m.canonical)).digest('hex');
}

/** @param {Table} t @returns {Canonical} */
export function canonical(t) {
  return {
    id: t.id, owner: t.owner, field: t.field, token: t.token, send: t.send, initial: t.initial, cancel: [...t.cancel].sort(cmp),
    states: Object.keys(t.states).sort(cmp).map(name => {
      const s = t.states[name];
      return {
        name, final: s.final, flight: s.flight, ignores: [...s.ignores].sort(cmp),
        on: Object.keys(s.on).sort(cmp).map(event => ({ event, to: s.on[event] })),
      };
    }),
    flights: Object.keys(t.flights).sort(cmp).map(name => ({ name, ifLeft: t.flights[name].ifLeft })),
  };
}

/** Finds the owner the table names and checks its fields (spec 1.5 owner/field/token rules, 2.1). @param {string} file @param {number[]} lines @param {Node} program @param {Machine} m */
function bind(file, lines, program, m) {
  const t = /** @type {Table} */ (m.table);
  const owner = findOwner(program, t.owner);
  if (!owner) {
    m.findings.push(fmt(file, lines, m, m.spans.owner, 'sm/machine-owner-missing', t.owner, `Owner \`${t.owner}\` is not declared in this file.`,
      'Put the machine in the owner\'s file, or fix `owner`.'));
    return;
  }
  m.owner = owner;
  let ok = true;
  if (!owner.fields.has(t.field)) {
    ok = false;
    m.findings.push(fmt(file, lines, m, m.spans.field, 'sm/machine-field-missing', t.field, `\`${t.owner}\` has no field \`${t.field}\`.`,
      `Declare \`${t.field} = ${m.name}.initial;\` on the owner.`));
  }
  if (!owner.fields.has(t.token)) {
    if (m.spans.token) {
      m.findings.push(fmt(file, lines, m, m.spans.token, 'sm/machine-field-missing', t.token, `\`${t.owner}\` has no field \`${t.token}\`.`,
        `Declare \`${t.token} = null;\`.`));
    } else if (owner.hasAsync) {
      m.findings.push(fmt(file, lines, m, m.spans.owner, 'sm/machine-token-missing', t.token, `\`${t.owner}\` has async work but no flight token.`,
        "Declare `#flight = null;` and, if you name it differently, `token: '<name>'` in the machine."));
    }
  }
  m.bound = ok;
}

/** @param {Node} program @param {string} name @returns {Owner | null} */
export function findOwner(program, name) {
  if (name === 'module') {
    /** @type {Map<string, Node>} */
    const fields = new Map();
    /** @type {Map<string, Node>} */
    const methods = new Map();
    for (const stmt of program.body) {
      const s = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
      if (!s) continue;
      if (s.type === 'VariableDeclaration') {
        for (const d of s.declarations) {
          if (d.id?.type !== 'Identifier') continue;
          if (s.kind === 'let' || s.kind === 'var') fields.set(d.id.name, d);
          else if (d.init && isFunction(unwrap(d.init))) methods.set(d.id.name, unwrap(d.init));
        }
      }
    }
    walk(program, node => { if (node.type === 'FunctionDeclaration' && node.id && !methods.has(node.id.name)) methods.set(node.id.name, node); });
    if (!fields.size) return null;
    return { kind: 'module', name, node: program, fields, methods, lets: new Set(fields.keys()), hasAsync: hasAsync(program) };
  }
  for (const stmt of program.body) {
    const cls = topLevelClass(stmt);
    if (!cls || cls.name !== name) continue;
    /** @type {Map<string, Node>} */
    const fields = new Map();
    /** @type {Map<string, Node>} */
    const methods = new Map();
    for (const member of cls.node.body.body) {
      if (member.static) continue;
      const key = keyName(member.key, member.computed);
      if (key === null) continue;
      if (member.type === 'PropertyDefinition') {
        if (member.value && isFunction(unwrap(member.value))) methods.set(key, unwrap(member.value)); else fields.set(key, member);
      } else if (member.type === 'MethodDefinition' && member.kind === 'method') methods.set(key, member.value);
    }
    return { kind: 'class', name, node: cls.node, fields, methods, lets: new Set(), hasAsync: hasAsync(cls.node) };
  }
  return null;
}

/** @param {Node} node */
function hasAsync(node) {
  let found = false;
  walk(node, n => {
    if (found) return false;
    if (n.type === 'AwaitExpression' || (n.type === 'ForOfStatement' && n.await)) found = true;
    else if (n.type === 'CallExpression') {
      const callee = unwrap(n.callee);
      if (callee?.type === 'MemberExpression' && !callee.computed && callee.property?.name === 'then') found = true;
    }
  });
  return found;
}
