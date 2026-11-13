// The security pack's rules (overlay/src/pack-security.js says what the pack is). Each is one piece of Chrome's Modern
// Web Guidance `security` guide made into a check on source. A rule says nothing when what is written cannot hold
// anything but fixed text, or has visibly been through a sanitiser: reading source cannot know whether a value is
// trusted, so a finding says "this can run markup or code; make sure it cannot be someone else's", never "this is a hole".
import type { Node } from 'oxc-parser';
import type { Said, SourceContext, SourceRule } from './source.js';

type N = Node & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const written = (node: Node, context: SourceContext, max = 60): string => { const s = context.text.slice(node.start, node.end).replace(/\s+/g, ' '); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };

/** The file's own constants, by name: `const X = <init>` declared once. A name declared twice, or with let/var, or a
 * parameter, is not here: its value cannot be read from where it is used. Built once per file. */
const constants = new WeakMap<object, Map<string, N | null>>();
function constantsOf(context: SourceContext): Map<string, N | null> {
  const program = context.ancestors[0] as N | undefined;
  if (!program) return new Map();
  let found = constants.get(program);
  if (found) return found;
  found = new Map();
  const seen = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) seen(item); return; }
    const n = node as N;
    if (typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclaration') for (const d of n.declarations as N[]) if (d.id.type === 'Identifier') found!.set(d.id.name, found!.has(d.id.name) || n.kind !== 'const' ? null : d.init ?? null);
    for (const key in n) if (key !== 'type' && key !== 'start' && key !== 'end') seen(n[key]);
  };
  seen(program);
  constants.set(program, found);
  return found;
}
const PURE = /^(?:map|filter|join|slice|flatMap|concat|reverse|sort|toString|toFixed|toPrecision|trim|trimStart|trimEnd|toUpperCase|toLowerCase|padStart|padEnd|repeat|replace|replaceAll|split|at|find|keys|values|entries|includes|indexOf|charAt|substring)$/;
const NUMERIC = /^(?:Math\.\w+|Number|parseInt|parseFloat|String|Boolean|Object\.(?:keys|values|entries)|Array\.from|JSON\.stringify)$/;
/**
 * Fixed text: nothing in it could have been written by someone else. A string; a template, a join or a choice of
 * fixed parts; one of the file's own constants that is itself fixed; a property of fixed data; a number; and what
 * the plain list and string methods make of fixed data (`ROWS.map(r => `<li>${r.label}</li>`).join('')`).
 * Anything else, a parameter, a prop, a value fetched or read from the page, is not.
 */
function fixed(given: N | null | undefined, context: SourceContext, safe: ReadonlySet<string> = new Set(), depth = 0): boolean {
  if (!given) return true;
  const node = given as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (depth > 8) return false;
  const ok = (n: N | null | undefined, names = safe) => fixed(n, context, names, depth + 1);
  switch (node.type) {
    case 'Literal': return true;
    case 'TemplateLiteral': return (node.expressions as N[]).every(e => ok(e));
    case 'BinaryExpression': return node.operator === '+' ? ok(node.left) && ok(node.right) : true; // any other operator makes a number or a boolean
    case 'UnaryExpression': case 'UpdateExpression': return true;
    case 'LogicalExpression': return ok(node.left) && ok(node.right);
    case 'ConditionalExpression': return ok(node.consequent) && ok(node.alternate);
    case 'TSAsExpression': case 'TSNonNullExpression': case 'ParenthesizedExpression': case 'TSSatisfiesExpression': return ok(node.expression);
    case 'ArrayExpression': return (node.elements as N[]).every(e => !e || e.type !== 'SpreadElement' && ok(e));
    case 'ObjectExpression': return (node.properties as N[]).every(p => p.type === 'Property' && ok(p.value));
    case 'Identifier': {
      if (safe.has(node.name) || node.name === 'undefined') return true;
      const init = constantsOf(context).get(node.name);
      return init ? ok(init) : false;
    }
    case 'MemberExpression': return node.property?.name === 'length' || ok(node.object) && (!node.computed || ok(node.property) || true);
    case 'ArrowFunctionExpression': case 'FunctionExpression': {
      // a callback over fixed data: its parameters are pieces of that data
      const names = new Set(safe);
      const bind = (p: N): void => { if (!p) return; if (p.type === 'Identifier') names.add(p.name); else if (p.type === 'ObjectPattern') for (const q of p.properties as N[]) bind(q.value ?? q.argument); else if (p.type === 'ArrayPattern') for (const q of p.elements as N[]) bind(q); else if (p.type === 'AssignmentPattern') bind(p.left); };
      for (const p of node.params as N[]) bind(p);
      if (node.body.type !== 'BlockStatement') return ok(node.body, names);
      const returns = (node.body.body as N[]).filter(st => st.type === 'ReturnStatement');
      // a body of declarations and one return: each declared name is fixed if its value is
      for (const st of node.body.body as N[]) if (st.type === 'VariableDeclaration') for (const d of st.declarations as N[]) if (d.id.type === 'Identifier' && ok(d.init, names)) names.add(d.id.name);
      return returns.length === 1 && (node.body.body as N[]).every(st => st.type === 'ReturnStatement' || st.type === 'VariableDeclaration') && ok(returns[0]!.argument, names);
    }
    case 'CallExpression': {
      const name = calleeName(node.callee);
      if (NUMERIC.test(name)) return (node.arguments as N[]).every(a => ok(a)) || /^(?:Math\.|Number$|parseInt$|parseFloat$|Boolean$)/.test(name);
      if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
        const method = node.callee.property.name as string;
        if (/^to(?:Fixed|Precision)$/.test(method)) return true; // always a number written out
        if (PURE.test(method)) return ok(node.callee.object) && (node.arguments as N[]).every(a => ok(a));
      }
      // one of the file's own functions, called with fixed things, whose body is fixed given them
      if (node.callee.type === 'Identifier') { const fn = constantsOf(context).get(node.callee.name); if (fn && /FunctionExpression$/.test(fn.type) && (node.arguments as N[]).every(a => ok(a))) return ok(fn); }
      return false;
    }
    default: return false;
  }
}
const calleeName = (node: N): string => node.type === 'Identifier' ? node.name : node.type === 'MemberExpression' && !node.computed ? `${calleeName(node.object)}.${node.property.name}` : '';
/** Visibly cleaned: the value is a call whose name says it sanitises or escapes (DOMPurify.sanitize, sanitizeHtml,
 * escapeHtml), or a Trusted Types policy's createHTML. A name is not proof, but it is the author saying they did it. */
function cleaned(node: N | null | undefined): boolean {
  if (!node) return false;
  if (node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression' || node.type === 'ParenthesizedExpression' || node.type === 'AwaitExpression') return cleaned(node.expression ?? node.argument);
  if (node.type !== 'CallExpression') return false;
  return /(?:^|\.)(?:sanitize\w*|purify\w*|escape\w*|createHTML|renderToStaticMarkup|renderToString)$/i.test(calleeName(node.callee));
}
const risky = (node: N | null | undefined, context: SourceContext): boolean => !!node && !fixed(node, context) && !cleaned(node);
const propName = (node: N): string => node.type === 'MemberExpression' ? node.computed ? node.property.type === 'Literal' ? String(node.property.value) : '' : node.property.name : '';

// Modern Web Guidance, security §1.2 "Avoid Dangerous DOM Sinks": "DO NOT: Use innerHTML … with untrusted or
// unsanitized input"; "Dangerous sinks to grep for: innerHTML, outerHTML, document.write, eval, setTimeout with a
// string argument". React's dangerouslySetInnerHTML is innerHTML by another name. (script.src is in the guide's list
// and left out here: almost every use is a fixed address or a build's own chunk.)
export const domSink: SourceRule = {
  id: 'security/dom-sink', severity: 'warn', guide: 'sanitize-untrusted-html',
  reason: 'Whatever reaches here runs as markup or code. If any of it can come from someone else, they can act as your user.',
  needs: /innerHTML|outerHTML|dangerouslySetInnerHTML|document\.write|\beval\s*\(|new Function\b|set(?:Timeout|Interval)\s*\(\s*['"`]/,
  on: {
    // el.innerHTML = value; el.outerHTML = value
    AssignmentExpression(node, context): Said | null {
      const n = node as N, prop = propName(n.left);
      if (prop !== 'innerHTML' && prop !== 'outerHTML') return null;
      if (!risky(n.right, context)) return null;
      return { node, kind: prop, to: prop, given: written(n.right, context, 48), title: `\`${prop}\` runs this as markup, and it is not fixed text`,
        action: 'Use textContent for words. For markup, build elements, or pass it through setHTML() or a sanitiser first.' };
    },
    // <div dangerouslySetInnerHTML={{ __html: value }} />
    JSXAttribute(node, context): Said | null {
      const n = node as N;
      if (n.name?.name !== 'dangerouslySetInnerHTML' || n.value?.type !== 'JSXExpressionContainer') return null;
      const object = n.value.expression as N;
      const html = object.type === 'ObjectExpression' ? ((object.properties as N[]).find(p => p.type === 'Property' && ((p.key as N).name ?? (p.key as N).value) === '__html')?.value as N | undefined) : undefined;
      // an object built elsewhere ({...props}, a variable) cannot be read here: say so rather than stay silent
      if (object.type === 'ObjectExpression' ? !risky(html, context) : false) return null;
      const shown = html ? written(html, context, 40) : written(object, context, 40);
      return { node, kind: 'dangerouslySetInnerHTML', to: 'dangerouslySetInnerHTML', given: shown, title: '`dangerouslySetInnerHTML` runs this as markup, and it is not fixed text',
        action: 'Render it as children if it is words. If it must be markup, sanitise it first (DOMPurify, or the browser’s setHTML()).' };
    },
    // document.write(…), eval(…), setTimeout('code'), setInterval('code')
    CallExpression(node, context): Said | null {
      const n = node as N, name = calleeName(n.callee), first = n.arguments[0] as N | undefined;
      if (name === 'document.write' || name === 'document.writeln') return risky(first, context) ? { node, kind: 'write', to: name, given: written(first!, context, 48), title: `\`${name}\` writes this into the page as markup, and it is not fixed text`, action: 'Build the elements, or set textContent.' } : null;
      if (name === 'eval' || name === 'window.eval' || name === 'globalThis.eval') return first && !(first.type === 'Literal') ? { node, kind: 'eval', to: 'eval', given: written(first, context, 48), title: '`eval` runs this as code', action: 'Parse data with JSON.parse; call functions by name from a fixed table.' } : null;
      if (/^(?:window\.|globalThis\.)?set(?:Timeout|Interval)$/.test(name) && first && (first.type === 'Literal' && typeof first.value === 'string' || first.type === 'TemplateLiteral'))
        return { node, kind: 'timer', to: name.replace(/^.*\./, ''), given: written(first, context, 48), title: `\`${name.replace(/^.*\./, '')}\` is given a string, which it runs as code`, action: 'Pass a function instead of a string.' };
      return null;
    },
    // new Function('…code…')
    NewExpression(node, context): Said | null {
      const n = node as N;
      if (calleeName(n.callee) !== 'Function' || !n.arguments.length) return null;
      return { node, kind: 'function', to: 'new Function', given: written(n.arguments.at(-1) as N, context, 48), title: '`new Function` builds code from a string and runs it', action: 'Write the function, or look it up by name in a fixed table.' };
    },
  },
};

export const SECURITY_RULES: SourceRule[] = [domSink];
