// The security pack's rules (overlay/src/pack-security.js says what the pack is). Each is one piece of Chrome's Modern
// Web Guidance `security` guide made into a check on source. A rule says nothing when what is written cannot hold
// anything but fixed text, or has visibly been through a sanitiser: reading source cannot know whether a value is
// trusted, so a finding says "this can run markup or code; make sure it cannot be someone else's", never "this is a hole".
import type { Node } from 'oxc-parser';
import type { Said, SourceContext, SourceRule } from './source.js';

type N = Node & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const written = (node: Node, context: SourceContext, max = 60): string => { const s = context.text.slice(node.start, node.end).replace(/\s+/g, ' '); return s.length > max ? `${s.slice(0, max - 1)}…` : s; };

/** A call whose name says it sanitises or escapes: DOMPurify.sanitize, sanitizeHtml, escapeHtml, esc, encodeURIComponent, a Trusted Types policy's createHTML. */
const CLEANER = /(?:^|\.)(?:sanitize\w*|purify\w*|escape\w*|esc|encodeURI(?:Component)?|createHTML|renderToStaticMarkup|renderToString)$/i;
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
      // a piece that has visibly been escaped or sanitised on its way in (`${esc(name)}`) is as good as fixed
      if (CLEANER.test(name)) return true;
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
  return CLEANER.test(calleeName(node.callee));
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


const LOCAL = /^(?:[a-z]+:)?\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|[\w.-]+\.(?:local|localhost|test|internal))(?=[:/]|$)/i;
const literal = (node: N | null | undefined): string | null => !node ? null : node.type === 'Literal' && typeof node.value === 'string' ? node.value : node.type === 'TemplateLiteral' && node.quasis.length ? String(node.quasis[0]!.value.cooked ?? '') + (node.expressions.length ? '\u0000' : '') : null;
const jsxAttr = (element: N, name: string): N | undefined => (element.attributes as N[]).find(a => a.type === 'JSXAttribute' && a.name?.name === name);
const jsxText = (attr: N | undefined): string | null => !attr ? null : !attr.value ? '' : attr.value.type === 'Literal' ? String(attr.value.value) : attr.value.type === 'JSXExpressionContainer' ? literal(attr.value.expression) : null;
/** The function a handler is: written in place, or one of the file's own by name. */
const handlerOf = (node: N | undefined, context: SourceContext): N | null => !node ? null : /Function(?:Expression|Declaration)$/.test(node.type) ? node : node.type === 'Identifier' ? (() => { const f = constantsOf(context).get(node.name); return f && /FunctionExpression$/.test(f.type) ? f : null; })() : null;

// Modern Web Guidance, security §1.5 "Secure Window Messaging": "Always specify a target origin (rather than the
// wildcard *) when calling postMessage to send sensitive data". A worker's or a port's postMessage takes no origin;
// only a call whose second argument is the string '*' is a window message sent to anyone.
export const postMessageTarget: SourceRule = {
  id: 'security/postmessage-target', severity: 'warn', guide: 'validate-origins',
  reason: 'A message sent to * is delivered to whatever page is in that window, including one you did not expect.',
  needs: /postMessage\s*\(/,
  on: {
    CallExpression(node, context): Said | null {
      const n = node as N;
      if (propName(n.callee) !== 'postMessage' || n.arguments.length < 2) return null;
      const target = n.arguments[1] as N;
      if (!(target.type === 'Literal' && target.value === '*')) return null;
      return { node, kind: 'target', to: 'postMessage', given: written(n.arguments[0] as N, context, 40) + ", '*'", title: '`postMessage` sends this to any origin', action: 'Name the origin it is for: postMessage(data, "https://the-other-site").' };
    },
  },
};

// Security §1.5: "Always validate the event.origin of incoming messages on the receiver side". A listener on the
// window that never reads the event's origin or source acts on a message from anyone. Workers, ports, channels and
// sockets have no origin to check, so only a listener on window, self, globalThis or with no receiver is judged, and
// only when its function can be read here.
export const messageOrigin: SourceRule = {
  id: 'security/message-origin', severity: 'warn', guide: 'validate-origins',
  reason: 'Any page that can reach this window can send it a message. Without a check of who sent it, their data is acted on as yours.',
  needs: /['"`]message['"`]|onmessage\s*=/,
  on: {
    CallExpression(node, context): Said | null {
      const n = node as N, name = calleeName(n.callee);
      if (!/^(?:(?:window|self|globalThis)\.)?addEventListener$/.test(name)) return null;
      if (literal(n.arguments[0]) !== 'message') return null;
      // inside a worker file, self is the worker: its messages come from the page that made it
      if (/\bself\.postMessage\b|\bDedicatedWorkerGlobalScope\b|\bimportScripts\s*\(|\.worker\.[cm]?[jt]s$/.test(context.text.slice(0, 20000)) || /\.worker\.[cm]?[jt]sx?$/.test(context.file)) return null;
      const handler = handlerOf(n.arguments[1] as N, context);
      if (!handler) return null;
      const body = context.text.slice(handler.start, handler.end);
      if (/\.origin\b|\.source\b|isTrusted|\borigin\b/.test(body)) return null;
      return { node, kind: 'listener', to: 'addEventListener', given: "'message', …", title: 'This `message` listener never checks who sent the message', action: 'Start it with: if (event.origin !== "https://the-site-you-expect") return;' };
    },
    AssignmentExpression(node, context): Said | null {
      const n = node as N;
      if (!/^(?:window|self|globalThis)\.onmessage$/.test(calleeName(n.left)) || /\.worker\.[cm]?[jt]sx?$/.test(context.file) || /\bself\.postMessage\b|\bimportScripts\s*\(/.test(context.text.slice(0, 20000))) return null;
      const handler = handlerOf(n.right, context);
      if (!handler || /\.origin\b|\.source\b|\borigin\b/.test(context.text.slice(handler.start, handler.end))) return null;
      return { node, kind: 'onmessage', to: 'onmessage', given: '…', title: 'This `onmessage` handler never checks who sent the message', action: 'Start it with: if (event.origin !== "https://the-site-you-expect") return;' };
    },
  },
};

// Security §3.3 "Trusted Types Enforcement": "DO NOT: Create a pass-through policy (such as createHTML: (s) => s)
// that returns unsanitized input unchanged, as this neutralizes Trusted Types protection."
export const trustedTypesPassThrough: SourceRule = {
  id: 'security/trusted-types-pass-through', severity: 'warn', guide: 'trusted-types',
  reason: 'A policy that hands back what it was given checks nothing: Trusted Types is on, and protects nothing.',
  needs: /createPolicy\s*\(/,
  on: {
    CallExpression(node, context): Said[] | null {
      const n = node as N;
      if (propName(n.callee) !== 'createPolicy') return null;
      const rules = n.arguments[1] as N | undefined;
      if (rules?.type !== 'ObjectExpression') return null;
      const out: Said[] = [];
      for (const p of rules.properties as N[]) {
        if (p.type !== 'Property') continue;
        const key = String((p.key as N).name ?? (p.key as N).value);
        if (!/^create(?:HTML|Script|ScriptURL)$/.test(key)) continue;
        const fn = p.value as N;
        if (!/FunctionExpression$/.test(fn.type) || fn.params[0]?.type !== 'Identifier') continue;
        const param = fn.params[0].name as string;
        const returned = fn.body.type === 'BlockStatement' ? (fn.body.body as N[]).length === 1 && fn.body.body[0].type === 'ReturnStatement' ? fn.body.body[0].argument as N : null : fn.body as N;
        if (returned?.type === 'Identifier' && returned.name === param) out.push({ node: p, kind: key, to: key, given: written(fn, context, 40), title: `\`${key}\` returns its input unchanged`, action: 'Sanitise in the policy, or use element.setHTML(), which needs no policy.' });
      }
      return out;
    },
  },
};

// Security §1.3 "Secure Cookies": session and application cookies carry Secure and an explicit SameSite. Script can
// only set those two (HttpOnly is the server's). A cookie being deleted (an expiry in the past, max-age=0) is left be.
export const cookieFlags: SourceRule = {
  id: 'security/cookie-flags', severity: 'warn', guide: 'security',
  reason: 'Without Secure a cookie travels over plain http; without SameSite it is sent along with requests other sites start.',
  needs: /document\.cookie\s*=/,
  on: {
    AssignmentExpression(node, context): Said | null {
      const n = node as N;
      if (calleeName(n.left) !== 'document.cookie') return null;
      let value: N | null | undefined = n.right;
      if (value?.type === 'Identifier') value = constantsOf(context).get(value.name);
      if (!value || !/^(?:Literal|TemplateLiteral|BinaryExpression)$/.test(value.type)) return null; // built elsewhere: cannot be read here
      const text = context.text.slice(value.start, value.end);
      if (/max-age\s*=\s*(?:0|-)|expires\s*=\s*Thu, 01 Jan 1970/i.test(text)) return null;
      const missing = [/;\s*secure\b/i.test(text) ? '' : 'Secure', /;\s*samesite\s*=/i.test(text) ? '' : 'SameSite'].filter(Boolean);
      if (!missing.length) return null;
      return { node, kind: 'cookie', to: 'document.cookie', given: written(value, context, 48), title: `This cookie is set without \`${missing.join('` or `')}\``, action: `Add ${missing.map(m => m === 'SameSite' ? 'SameSite=Lax' : m).join('; ')} to it.` };
    },
  },
};

// Security, "Subresource Integrity": "Use the integrity attribute with a cryptographic hash … when loading
// third-party scripts and stylesheets, combined with crossorigin=anonymous". Judged where the address is written out
// and is another site's; an address built at run time, or a relative one, is not.
export const subresourceIntegrity: SourceRule = {
  id: 'security/subresource-integrity', severity: 'warn', guide: 'secure-external-subresources',
  reason: 'A script or stylesheet from another site runs with your page’s rights. Without integrity, whatever that site serves tomorrow runs too.',
  needs: /<(?:script|link)\b/,
  on: {
    JSXOpeningElement(node, context): Said | null {
      const n = node as N, tag = n.name?.name as string | undefined;
      if (tag !== 'script' && tag !== 'link') return null;
      const address = jsxText(jsxAttr(n, tag === 'script' ? 'src' : 'href'));
      if (!address || !/^(?:https?:)?\/\//.test(address) || LOCAL.test(address) || address.includes('\u0000')) return null;
      if (tag === 'link' && !/\bstylesheet\b/.test(jsxText(jsxAttr(n, 'rel')) ?? '')) return null;
      // a font service's stylesheet changes with the browser asking: it cannot carry a hash (the guide: SRI is for immutable, versioned assets)
      if (/fonts\.googleapis\.com|fonts\.bunny\.net|use\.typekit\.net/.test(address)) return null;
      if (jsxAttr(n, 'integrity')) return null;
      return { node, kind: tag, to: `<${tag}>`, given: written(jsxAttr(n, tag === 'script' ? 'src' : 'href')!, context, 56), title: `This \`<${tag}>\` loads from another site with no \`integrity\``, action: 'Pin a version and add integrity="sha384-…" crossorigin="anonymous", or serve the file yourself.' };
    },
  },
};

// Security §1.1 "Secure Contexts": "Deliver resources over HTTPS". An address written out as http:// (or ws://) where
// the page fetches or loads something. A link a person follows is navigation, not a resource, and is left be; so are
// local addresses and XML namespaces.
export const insecureResource: SourceRule = {
  id: 'security/insecure-resource', severity: 'warn', guide: 'security',
  reason: 'Anything fetched over plain http can be read and changed on the way; on an https page the browser blocks it.',
  needs: /['"`](?:http|ws):\/\//,
  on: {
    CallExpression(node, context): Said | null {
      const n = node as N, name = calleeName(n.callee);
      if (!/^(?:(?:window|self|globalThis)\.)?fetch$|^axios(?:\.\w+)?$|\.(?:get|post|put|patch|delete)$|importScripts$/.test(name)) return null;
      const address = literal(n.arguments[0] as N);
      if (!address || !/^http:\/\//i.test(address) || LOCAL.test(address)) return null;
      return { node, kind: 'fetch', to: name, given: written(n.arguments[0], context, 56), title: `\`${name}\` asks for this over plain http`, action: 'Use https://.' };
    },
    NewExpression(node, context): Said | null {
      const n = node as N, name = calleeName(n.callee);
      if (!/^(?:WebSocket|EventSource|Worker|SharedWorker|Request)$/.test(name)) return null;
      const address = literal(n.arguments[0] as N);
      if (!address || !/^(?:http|ws):\/\//i.test(address) || LOCAL.test(address)) return null;
      return { node, kind: 'open', to: `new ${name}`, given: written(n.arguments[0], context, 56), title: `\`new ${name}\` connects without encryption`, action: `Use ${/^ws/i.test(address) ? 'wss://' : 'https://'}.` };
    },
    JSXOpeningElement(node, context): Said | null {
      const n = node as N, tag = n.name?.name as string | undefined;
      if (!tag || !/^(?:img|script|iframe|video|audio|source|track|embed|object|link|form)$/.test(tag)) return null;
      const attr = jsxAttr(n, tag === 'link' ? 'href' : tag === 'form' ? 'action' : tag === 'object' ? 'data' : 'src');
      const address = jsxText(attr);
      if (!address || !/^http:\/\//i.test(address) || LOCAL.test(address)) return null;
      if (tag === 'link' && !/\b(?:stylesheet|preload|modulepreload|icon|manifest)\b/.test(jsxText(jsxAttr(n, 'rel')) ?? '')) return null;
      return { node, kind: tag, to: `<${tag}>`, given: written(attr!, context, 56), title: `This \`<${tag}>\` ${tag === 'form' ? 'sends what is typed' : 'loads'} over plain http`, action: 'Use https://.' };
    },
  },
};

export const SECURITY_RULES: SourceRule[] = [domSink, postMessageTarget, messageOrigin, trustedTypesPassThrough, cookieFlags, subresourceIntegrity, insecureResource];

