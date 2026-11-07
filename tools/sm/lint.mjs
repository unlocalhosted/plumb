// @ts-check
// Core lint (spec 3.1, 3.2, 3.3, 3.8): single-writer, send-literal/known-event, flight-check, send-shape/send-missing.
// Every rule walks the oxc AST of one owner with its machine; positions are the matched node's span.
import { finding, nearest, listed, cmp } from './findings.mjs';
import { walk, unwrap, isFunction, keyName, thisMember, isStringLiteral } from './parse.mjs';

/** @typedef {import('./parse.mjs').Node} Node */
/** @typedef {import('./machine.mjs').Machine} Machine */
/** @typedef {import('./machine.mjs').Owner} Owner */

/**
 * @typedef {{
 *   file: string, lines: number[], m: Machine, owner: Owner, isClass: boolean, isTs: boolean,
 *   field: string, token: string, send: string, initial: string, name: string, events: string[],
 *   writers: Map<string, string[]>
 * }} Ctx
 */

/** @param {string} file @param {{ program: Node, lines: number[] }} parsed @param {Machine} m */
export function lintFindings(file, parsed, m) {
  const t = /** @type {import('./machine.mjs').Table} */ (m.table);
  const owner = /** @type {Owner} */ (m.owner);
  const events = new Set();
  for (const s of Object.values(t.states)) for (const e of Object.keys(s.on)) events.add(e);
  /** @type {Ctx} */
  const ctx = {
    file, lines: parsed.lines, m, owner, isClass: owner.kind === 'class', isTs: /\.(ts|tsx|mts|cts)$/.test(file),
    field: t.field, token: t.token, send: t.send, initial: t.initial, name: m.name, events: [...events].sort(cmp), writers: new Map(),
  };
  ctx.writers = writingMethods(ctx);
  return [...singleWriter(ctx), ...sendRules(ctx), ...sendCalls(ctx), ...flightCheck(ctx)];
}

// ---------- shared ----------

/** @param {Ctx} ctx @param {Node} node @param {string} rule @param {string} scope @param {string} detail @param {string} message @param {string} fix */
function report(ctx, node, rule, scope, detail, message, fix) {
  return finding({ rule, file: ctx.file, lines: ctx.lines, node, machine: ctx.m.id, scope, detail, message, fix });
}

/** The nearest function in which `this` is not the owner's (class owners only). @param {Ctx} ctx @param {Node} node @param {Node[]} parents */
function rebinds(ctx, node, parents) {
  if (!ctx.isClass) return false;
  const parent = parents[parents.length - 1];
  if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') return parent?.type !== 'MethodDefinition';
  if (node.type === 'ClassBody') return node !== ctx.owner.node.body;
  return false;
}

/** Names declared by a function (parameters and declarations inside it), for module-owner shadowing. @param {Node} fn */
function declared(fn) {
  const names = new Set();
  const collect = (/** @type {Node} */ pattern) => {
    if (!pattern) return;
    if (pattern.type === 'Identifier') names.add(pattern.name);
    else if (pattern.type === 'AssignmentPattern') collect(pattern.left);
    else if (pattern.type === 'RestElement') collect(pattern.argument);
    else if (pattern.type === 'ArrayPattern') for (const el of pattern.elements) collect(el);
    else if (pattern.type === 'ObjectPattern') for (const p of pattern.properties) collect(p.type === 'Property' ? p.value : p.argument);
    else if (pattern.type === 'TSParameterProperty') collect(pattern.parameter);
  };
  for (const p of fn.params ?? []) collect(p);
  if (fn.body) walk(fn.body, n => { if (n.type === 'VariableDeclarator') collect(n.id); else if (n.type === 'FunctionDeclaration' && n.id) names.add(n.id.name); else if (n.type === 'CatchClause' && n.param) collect(n.param); });
  return names;
}

/** @param {Ctx} ctx @param {string} name @param {Node[]} parents */
function shadowed(ctx, name, parents) {
  if (ctx.isClass) return false;
  for (const p of parents) if (isFunction(p) && declared(p).has(name)) return true;
  return false;
}

/** The owner field a target expression names, or null. @param {Ctx} ctx @param {Node} target @param {Node[]} parents */
function fieldOf(ctx, target, parents) {
  const n = unwrap(target);
  if (ctx.isClass) return thisMember(n);
  if (n?.type === 'Identifier' && ctx.owner.lets.has(n.name) && !shadowed(ctx, n.name, parents)) return n.name;
  return null;
}

/** The written field of an assignment or update, or null. @param {Ctx} ctx @param {Node} node @param {Node[]} parents */
function writeTarget(ctx, node, parents) {
  if (node.type === 'AssignmentExpression') return fieldOf(ctx, node.left, parents);
  if (node.type === 'UpdateExpression') return fieldOf(ctx, node.argument, parents);
  return null;
}

/** The method the call invokes on the owner (`this.<m>()`; module: `<m>()`), or null. @param {Ctx} ctx @param {Node} node @param {Node[]} parents */
function calledMethod(ctx, node, parents) {
  if (node.type !== 'CallExpression') return null;
  const callee = unwrap(node.callee);
  if (ctx.isClass) return thisMember(callee);
  if (callee?.type === 'Identifier' && !shadowed(ctx, callee.name, parents)) return callee.name;
  return null;
}

/** `Owner.member`, `module.fn` or `module` for the key scope. @param {Ctx} ctx @param {Node[]} parents */
function scopeOf(ctx, parents) {
  if (ctx.isClass) {
    const members = ctx.owner.node.body.body;
    const member = parents.find(p => members.includes(p));
    const key = member ? keyName(member.key, member.computed) : null;
    return key ? `${ctx.owner.name}.${key}` : ctx.owner.name;
  }
  for (const p of parents) {
    if (p.type === 'FunctionDeclaration' && p.id) return `module.${p.id.name}`;
    if (p.type === 'VariableDeclarator' && p.id?.type === 'Identifier' && p.init && isFunction(unwrap(p.init))) return `module.${p.id.name}`;
  }
  return 'module';
}

/** `this.<x>` (class) or `<x>` (module) as source text. @param {Ctx} ctx @param {string} name */
function self(ctx, name) {
  return ctx.isClass ? `this.${name}` : name;
}

/** The canonical send body (spec 2.2, 2.4, 2.5) as text. @param {Ctx} ctx */
function canonicalSend(ctx) {
  const head = ctx.isClass ? (ctx.isTs ? `private ${ctx.send}(event: string): boolean {` : `${ctx.send}(event) {`) : `function ${ctx.send}(event) {`;
  return `${head}\n  const next = ${ctx.name}.states[${self(ctx, ctx.field)}]?.on?.[event];\n  if (next) ${self(ctx, ctx.field)} = next;\n  return !!next;\n}`;
}

/** Walks the owner, skipping functions that rebind `this`. @param {Ctx} ctx @param {Node} root @param {(node: Node, parents: Node[]) => void | false} visit */
function walkOwner(ctx, root, visit) {
  walk(root, (node, parents) => {
    if (node !== root && rebinds(ctx, node, parents)) return false;
    return visit(node, parents);
  });
}

// ---------- 3.1 single-writer ----------

/** @param {Ctx} ctx */
function singleWriter(ctx) {
  /** @type {any[]} */
  const out = [];
  const sendFn = ctx.owner.methods.get(ctx.send) ?? null;
  const fix = (/** @type {Node} */ node) => {
    const rhs = node.type === 'AssignmentExpression' ? unwrap(node.right) : null;
    const event = rhs && isStringLiteral(rhs) ? rhs.value : 'event';
    return `Call \`${self(ctx, ctx.send)}('${event}')\` instead; add \`${event}\` to the states that accept it if it is missing.`;
  };
  walkOwner(ctx, ctx.owner.node, (node, parents) => {
    if (node === sendFn) return false;
    if (writeTarget(ctx, node, parents) === ctx.field) {
      out.push(report(ctx, node, 'sm/single-writer', scopeOf(ctx, parents), ctx.field, `\`${ctx.field}\` is written outside \`${ctx.send}\`.`, fix(node)));
    }
  });
  const decl = ctx.owner.fields.get(ctx.field);
  if (decl) {
    const init = unwrap(ctx.isClass ? decl.value : decl.init);
    const fromTable = init?.type === 'MemberExpression' && !init.computed && unwrap(init.object)?.type === 'Identifier' && unwrap(init.object).name === ctx.name && init.property?.name === 'initial';
    const sameLiteral = init && isStringLiteral(init) && init.value === ctx.initial;
    if (!fromTable && !sameLiteral) {
      out.push(report(ctx, init ?? decl, 'sm/single-writer', `${ctx.owner.name}.${ctx.field}`, ctx.field, `\`${ctx.field}\` is written outside \`${ctx.send}\`.`,
        `Initialize it as \`${ctx.field} = ${ctx.name}.initial;\`.`));
    }
  }
  return out;
}

// ---------- 3.8 send-shape / send-missing ----------

/** @param {Ctx} ctx */
function sendRules(ctx) {
  const fn = ctx.owner.methods.get(ctx.send);
  if (!fn) {
    const at = ctx.isClass ? (ctx.owner.node.id ?? ctx.owner.node) : (ctx.m.spans.send ?? ctx.m.spans.id ?? ctx.m.node);
    return [report(ctx, at, 'sm/send-missing', ctx.owner.name, ctx.send, `\`${ctx.owner.name}\` has no \`${ctx.send}\`.`, canonicalSend(ctx))];
  }
  const at = ctx.isClass ? ([...ctx.owner.node.body.body].find(mb => mb.value === fn)?.key ?? fn) : (fn.id ?? fn);
  const bad = () => [report(ctx, at, 'sm/send-shape', `${ctx.owner.name}.${ctx.send}`, '', `\`${ctx.send}\` must look up the next state in the table and assign it once.`, canonicalSend(ctx))];
  if (fn.params?.length !== 1) return bad();
  const param = fn.params[0];
  if (param.type !== 'Identifier') return bad();
  if (!fn.body || fn.body.type !== 'BlockStatement') return bad();
  /** @type {{ node: Node, parents: Node[] }[]} */
  const assigns = [];
  /** @type {Map<string, Node>} */
  const consts = new Map();
  walk(fn.body, (node, parents) => {
    if (node !== fn.body && isFunction(node)) return false;
    if (node.type === 'AssignmentExpression' && fieldOf(ctx, node.left, parents) === ctx.field) assigns.push({ node, parents: [...parents] });
    if (node.type === 'VariableDeclaration' && node.kind === 'const') for (const d of node.declarations) if (d.id?.type === 'Identifier' && d.init) consts.set(d.id.name, d.init);
  });
  if (assigns.length !== 1) return bad();
  const { node: assign, parents } = assigns[0];
  const rhs = unwrap(assign.right);
  if (assign.operator !== '=' || rhs?.type !== 'Identifier') return bad();
  const id = rhs.name;
  const init = consts.get(id);
  if (!init || !isLookup(ctx, init, param.name)) return bad();
  const stmt = parents[parents.length - 1];
  if (stmt?.type !== 'ExpressionStatement') return bad();
  let holder = parents[parents.length - 2];
  if (holder?.type === 'BlockStatement') {
    if (holder.body.length !== 1) return bad();
    holder = parents[parents.length - 3];
  }
  if (holder?.type !== 'IfStatement' || unwrap(holder.test)?.type !== 'Identifier' || unwrap(holder.test).name !== id) return bad();
  if (holder.consequent !== stmt && !(holder.consequent.type === 'BlockStatement' && holder.consequent.body[0] === stmt)) return bad();
  return [];
}

/** `<NAME>.states[<field>]?.on?.[<param>]`, optional chaining at any step. @param {Ctx} ctx @param {Node} init @param {string} param */
function isLookup(ctx, init, param) {
  const step3 = unwrap(init);
  if (step3?.type !== 'MemberExpression' || !step3.computed || unwrap(step3.property)?.type !== 'Identifier' || unwrap(step3.property).name !== param) return false;
  const step2 = unwrap(step3.object);
  if (step2?.type !== 'MemberExpression' || step2.computed || step2.property?.name !== 'on') return false;
  const step1 = unwrap(step2.object);
  if (step1?.type !== 'MemberExpression' || !step1.computed || fieldOf(ctx, step1.property, []) !== ctx.field) return false;
  const states = unwrap(step1.object);
  if (states?.type !== 'MemberExpression' || states.computed || states.property?.name !== 'states') return false;
  const table = unwrap(states.object);
  return table?.type === 'Identifier' && table.name === ctx.name;
}

// ---------- 3.2 send-literal / known-event ----------

/** The string literals an event argument can be, or null when it is not literal. @param {Node} arg */
function literals(arg) {
  const a = unwrap(arg);
  if (!a) return null;
  if (isStringLiteral(a)) return [a.value];
  if (a.type === 'ConditionalExpression') {
    const l = literals(a.consequent), r = literals(a.alternate);
    return l && r ? [...l, ...r] : null;
  }
  return null;
}

/** @param {Ctx} ctx */
function sendCalls(ctx) {
  /** @type {any[]} */
  const out = [];
  walkOwner(ctx, ctx.owner.node, (node, parents) => {
    if (node.type !== 'CallExpression' || calledMethod(ctx, node, parents) !== ctx.send) return;
    const scope = scopeOf(ctx, parents);
    const names = node.arguments.length ? literals(node.arguments[0]) : null;
    if (!names) {
      out.push(report(ctx, node, 'sm/send-literal', scope, '', `\`${ctx.send}\` takes a string literal (or a conditional of literals), so the oracle can read it.`,
        'Replace the argument with the literal event names, one per branch.'));
      return;
    }
    for (const event of names) {
      if (ctx.events.includes(event)) continue;
      out.push(report(ctx, node, 'sm/known-event', scope, event, `\`${ctx.send}('${event}')\`: no state handles \`${event}\` (events: ${listed(ctx.events)}).`,
        `Add \`${event}\` to the \`on\` of the states that accept it, or use one of ${listed(nearest(event, ctx.events))}.`));
    }
  });
  return out;
}

// ---------- 3.3 flight-check ----------

/** Methods whose own body writes an owner field or calls send: name → the fields written. @param {Ctx} ctx */
function writingMethods(ctx) {
  /** @type {Map<string, string[]>} */
  const out = new Map();
  for (const [name, fn] of ctx.owner.methods) {
    if (name === ctx.send) continue;
    const written = new Set();
    walk(fn, (node, parents) => {
      if (node !== fn && isFunction(node)) return false;
      const target = writeTarget(ctx, node, parents);
      if (target) written.add(target);
      else if (calledMethod(ctx, node, parents) === ctx.send) written.add(ctx.field);
    });
    if (written.size) out.set(name, [...written].sort(cmp));
  }
  return out;
}

/** @param {Node} node @param {Node[]} parents */
function thenCallback(node, parents) {
  const call = parents[parents.length - 1];
  if (!isFunction(node) || call?.type !== 'CallExpression' || !call.arguments.includes(node)) return false;
  const callee = unwrap(call.callee);
  return callee?.type === 'MemberExpression' && !callee.computed && ['then', 'catch', 'finally'].includes(callee.property?.name);
}

/** A function the rule analyses on its own: async, or a then/catch/finally callback. @param {Ctx} ctx @param {Node} node @param {Node[]} parents */
function analysed(ctx, node, parents) {
  if (!isFunction(node)) return false;
  if (ctx.isClass && node.type !== 'ArrowFunctionExpression' && parents[parents.length - 1]?.type !== 'MethodDefinition') return false;
  return node.async === true || thenCallback(node, parents);
}

/** `const <id> = this.<token>` / `++this.<token>` / `(this.<token> = {})`: the captured id, or null. @param {Ctx} ctx @param {Node} node @param {Node[]} parents */
function capture(ctx, node, parents) {
  if (node.type !== 'VariableDeclaration' || node.kind !== 'const') return null;
  const ids = [];
  for (const d of node.declarations) {
    if (d.id?.type !== 'Identifier' || !d.init) continue;
    const init = unwrap(d.init);
    const isToken = (/** @type {Node} */ n) => fieldOf(ctx, n, parents) === ctx.token;
    if (isToken(init)) ids.push(d.id.name);
    else if (init.type === 'UpdateExpression' && init.prefix && init.operator === '++' && isToken(init.argument)) ids.push(d.id.name);
    else if (init.type === 'AssignmentExpression' && init.operator === '=' && isToken(init.left) && unwrap(init.right)?.type === 'ObjectExpression') ids.push(d.id.name);
  }
  return ids.length ? ids : null;
}

/** `<id> !== this.<token>` and friends: 'negative', 'positive' or null. @param {Ctx} ctx @param {Node} test @param {Set<string>} captured @param {Node[]} parents */
function tokenTest(ctx, test, captured, parents) {
  const t = unwrap(test);
  if (!t) return null;
  if (t.type === 'UnaryExpression' && t.operator === '!') {
    const inner = tokenTest(ctx, t.argument, captured, parents);
    return inner === 'negative' ? 'positive' : inner === 'positive' ? 'negative' : null;
  }
  if (t.type !== 'BinaryExpression' || !['!==', '==='].includes(t.operator)) return null;
  const l = unwrap(t.left), r = unwrap(t.right);
  const isId = (/** @type {Node} */ n) => n?.type === 'Identifier' && captured.has(n.name);
  const isTok = (/** @type {Node} */ n) => fieldOf(ctx, n, parents) === ctx.token;
  if (!((isId(l) && isTok(r)) || (isTok(l) && isId(r)))) return null;
  return t.operator === '!==' ? 'negative' : 'positive';
}

/** Direct operands of a `||` or `&&` chain. @param {Node} test @param {string} op */
function operands(test, op) {
  const t = unwrap(test);
  if (t?.type === 'LogicalExpression' && t.operator === op) return [...operands(t.left, op), ...operands(t.right, op)];
  return [t];
}

/** @param {Node} stmt */
function stops(stmt) {
  if (!stmt) return false;
  if (stmt.type === 'ReturnStatement' || stmt.type === 'ThrowStatement') return true;
  return stmt.type === 'BlockStatement' && stops(stmt.body[stmt.body.length - 1]);
}

/** @param {Ctx} ctx */
function flightCheck(ctx) {
  /** @type {any[]} */
  const out = [];
  /** @type {{ fn: Node, parents: Node[] }[]} */
  const functions = [];
  walkOwner(ctx, ctx.owner.node, (node, parents) => { if (node !== ctx.owner.node && analysed(ctx, node, parents)) functions.push({ fn: node, parents: [...parents] }); });
  for (const { fn, parents } of functions) {
    const captured = new Set();
    const enclosing = [...parents.filter(p => isFunction(p)), fn];
    for (const f of enclosing) walk(f, (node, ps) => { for (const id of capture(ctx, node, [...parents, ...ps]) ?? []) captured.add(id); });
    const isThen = thenCallback(fn, parents);
    /** @type {{ start: number, end: number }[]} */
    const awaits = isThen ? [{ start: fn.body.start, end: fn.body.start }] : [];
    /** @type {{ node: Node, kind: 'negative' | 'positive', parent: Node }[]} */
    const guards = [];
    /** @type {{ node: Node, target: string, message: string }[]} */
    const writes = [];
    walk(fn.body, (node, ps) => {
      const all = [...parents, fn, ...ps];
      // Only this function's own body: a nested function is another body (analysed on its own when async or a then-callback).
      if (isFunction(node) || node.type === 'ClassBody') return false;
      if (node.type === 'AwaitExpression') awaits.push({ start: node.start, end: node.end });
      else if (node.type === 'ForOfStatement' && node.await) awaits.push({ start: node.start, end: node.right.end });
      else if (node.type === 'IfStatement') {
        const negative = operands(node.test, '||').some(o => tokenTest(ctx, o, captured, all) === 'negative');
        const positive = operands(node.test, '&&').some(o => tokenTest(ctx, o, captured, all) === 'positive');
        if (negative && stops(node.consequent)) guards.push({ node, kind: 'negative', parent: ps[ps.length - 1] });
        else if (positive) guards.push({ node, kind: 'positive', parent: ps[ps.length - 1] });
      }
      const target = writeTarget(ctx, node, all);
      if (target) { writes.push({ node, target, message: `\`${target}\` is written after an await with no check that this run is still current.` }); return; }
      const method = calledMethod(ctx, node, all);
      if (method === ctx.send) writes.push({ node, target: ctx.send, message: `\`${ctx.send}\` (which writes \`${ctx.field}\`) is called after an await with no check that this run is still current.` });
      else if (method && ctx.writers.has(method)) {
        writes.push({ node, target: method, message: `\`${method}\` (which writes ${listed(/** @type {string[]} */ (ctx.writers.get(method)))}) is called after an await with no check that this run is still current.` });
      }
    });
    const scope = scopeOf(ctx, [...parents, fn]);
    const fix = `Before the await: \`const flight = (${self(ctx, ctx.token)} = {});\` (or \`const run = ++${self(ctx, ctx.token)};\`). After it: \`if (${self(ctx, ctx.token)} !== flight) return;\` then the write.`;
    for (const w of writes) {
      let last = -1;
      for (const a of awaits) if (a.end <= w.node.end && a.end > last) last = a.end;
      if (last < 0) continue;
      const guarded = guards.some(g => {
        if (g.node.start < last) return false;
        if (g.kind === 'positive') return w.node.start >= g.node.consequent.start && w.node.end <= g.node.consequent.end;
        const block = g.parent;
        return (block?.type === 'BlockStatement' || block?.type === 'SwitchCase' || block?.type === 'Program') && w.node.start >= g.node.end && w.node.end <= block.end;
      });
      if (!guarded) out.push(report(ctx, w.node, 'sm/flight-check', scope, w.target, w.message, fix));
    }
  }
  return out;
}
