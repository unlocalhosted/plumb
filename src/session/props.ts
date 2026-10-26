import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import type { Declaration, Decision } from '../report.js';

/**
 * The editable properties of one JSX element, and the single source edit that sets one of them.
 * Pure over source text, the decisions and the element's compiled declarations: no I/O, no session.
 */
export type PropKey = 'padding' | 'padding-x' | 'padding-y' | 'gap' | 'flex-direction' | 'align-items' | 'justify-content' | 'flex-wrap' | 'radius' |
  'background' | 'border-color' | 'border-width' | 'shadow' | 'font-size' | 'font-weight' | 'line-height' | 'color' | 'width' | 'height' | 'object-fit' | 'aspect-ratio';
export interface PropStep { token: string; value: string; label: string; class: string; css: string }
export interface Prop {
  key: PropKey; family: string; value: string | null; token: string | null;
  source: 'class' | 'inline' | 'computed' | 'none'; class: string | null; steps: PropStep[]; dynamic?: string;
}
export interface Props { kind: 'surface' | 'layout' | 'text' | 'media' | 'control'; tag: string; props: Prop[] }

interface Def {
  key: PropKey; family: string; css: string[];
  /** Theme namespace the steps come from (decision names), with the decision family. */
  theme?: { namespace: string; family: string };
  /** The suffix a utility has for this property, when it sets it. */
  match(utility: string, sets: Sets): string | undefined;
  make(suffix: string): string;
  /** Steps which are not theme tokens. */
  fixed?: { token: string; value: string; suffix?: string }[];
}
interface Sets { sizes: Set<string>; weights: Set<string>; shadows: Set<string> }

const prefixed = (prefix: string) => (utility: string): string | undefined => utility === prefix ? '' : utility.startsWith(prefix + '-') ? utility.slice(prefix.length + 1) : undefined;
const spacing = (key: PropKey, prefix: string, css: string[], exclude?: RegExp): Def => ({ key, family: 'spacing', css, theme: { namespace: '--spacing-', family: 'spacing' },
  match: utility => { const suffix = prefixed(prefix)(utility); return suffix === undefined || exclude?.test(suffix) ? undefined : suffix; }, make: suffix => `${prefix}-${suffix}` });
const choice = (key: PropKey, family: string, css: string, prefix: string, values: [string, string][]): Def => ({ key, family, css: [css],
  match: utility => { const suffix = prefixed(prefix)(utility); return suffix !== undefined && values.some(([token]) => token === suffix) ? suffix : undefined; },
  make: suffix => `${prefix}-${suffix}`, fixed: values.map(([token, value]) => ({ token, value })) });
// Side and corner utilities (rounded-t-lg) are their own properties, never the whole-corner radius.
const sideRadius = /^(?:[trblse]|tl|tr|bl|br|ss|se|es|ee)(?:-|$)/;
const defaultSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];
const defaultWeights = ['thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'];
const defaultShadows = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', 'none', 'inner'];
const borderWidths: [string, string][] = [['0', '0px'], ['1', '1px'], ['2', '2px'], ['4', '4px'], ['8', '8px']];

const defs: Def[] = [
  spacing('padding', 'p', ['padding']),
  spacing('padding-x', 'px', ['padding-inline', 'padding-left', 'padding-right']),
  spacing('padding-y', 'py', ['padding-block', 'padding-top', 'padding-bottom']),
  spacing('gap', 'gap', ['gap', 'row-gap', 'column-gap'], /^[xy](?:-|$)/),
  choice('flex-direction', 'layout', 'flex-direction', 'flex', [['row', 'row'], ['col', 'column'], ['row-reverse', 'row-reverse'], ['col-reverse', 'column-reverse']]),
  choice('align-items', 'layout', 'align-items', 'items', [['start', 'flex-start'], ['center', 'center'], ['end', 'flex-end'], ['stretch', 'stretch'], ['baseline', 'baseline']]),
  choice('justify-content', 'layout', 'justify-content', 'justify', [['start', 'flex-start'], ['center', 'center'], ['end', 'flex-end'], ['between', 'space-between'], ['around', 'space-around'], ['evenly', 'space-evenly']]),
  choice('flex-wrap', 'layout', 'flex-wrap', 'flex', [['wrap', 'wrap'], ['nowrap', 'nowrap'], ['wrap-reverse', 'wrap-reverse']]),
  { key: 'radius', family: 'radius', css: ['border-radius'], theme: { namespace: '--radius-', family: 'radius' },
    match: utility => { const suffix = prefixed('rounded')(utility); return suffix === undefined || sideRadius.test(suffix) ? undefined : suffix; },
    make: suffix => `rounded-${suffix}` },
  { key: 'background', family: 'color', css: ['background', 'background-color'], theme: { namespace: '--color-', family: 'color' },
    match: utility => { const suffix = prefixed('bg')(utility); return suffix === undefined || /^(?:fixed|local|scroll|clip-|origin-|repeat|no-repeat|blend-|none$|gradient|linear|radial|conic|auto$|cover$|contain$|center$|top|bottom|left|right|\[(?:url|length|position|image|size))/.test(suffix) ? undefined : suffix; },
    make: suffix => `bg-${suffix}` },
  { key: 'border-color', family: 'color', css: ['border-color'], theme: { namespace: '--color-', family: 'color' },
    match: utility => { const suffix = prefixed('border')(utility); return suffix === undefined || suffix === '' || /^(?:\d+$|[xytrblse](?:-|$)|solid$|dashed$|dotted$|double$|hidden$|none$|collapse$|separate$|spacing)/.test(suffix) || /^\[\d/.test(suffix) ? undefined : suffix; },
    make: suffix => `border-${suffix}` },
  { key: 'border-width', family: 'layout', css: ['border-width'],
    match: utility => { const suffix = prefixed('border')(utility); return suffix === '' || suffix !== undefined && /^\d+$/.test(suffix) ? (suffix === '' ? '1' : suffix) : undefined; },
    make: suffix => suffix === '1' ? 'border' : `border-${suffix}`, fixed: borderWidths.map(([token, value]) => ({ token, value })) },
  { key: 'shadow', family: 'elevation', css: ['box-shadow'], theme: { namespace: '--shadow-', family: 'elevation' },
    match: (utility, sets) => { const suffix = prefixed('shadow')(utility); return suffix === undefined || suffix !== '' && !sets.shadows.has(suffix) ? undefined : suffix; },
    make: suffix => `shadow-${suffix}` },
  { key: 'font-size', family: 'type', css: ['font-size'], theme: { namespace: '--text-', family: 'type' },
    match: (utility, sets) => { const suffix = prefixed('text')(utility); return suffix === undefined || suffix === '' || !sets.sizes.has(suffix) && !/^\[(?:length:)?\d/.test(suffix) ? undefined : suffix; },
    make: suffix => `text-${suffix}` },
  { key: 'font-weight', family: 'type', css: ['font-weight'], theme: { namespace: '--font-weight-', family: 'type' },
    match: (utility, sets) => { const suffix = prefixed('font')(utility); return suffix === undefined || !sets.weights.has(suffix) ? undefined : suffix; },
    make: suffix => `font-${suffix}` },
  { key: 'line-height', family: 'type', css: ['line-height'], theme: { namespace: '--leading-', family: 'type' },
    match: utility => { const suffix = prefixed('leading')(utility); return suffix === '' ? undefined : suffix; }, make: suffix => `leading-${suffix}` },
  { key: 'color', family: 'color', css: ['color'], theme: { namespace: '--color-', family: 'color' },
    match: (utility, sets) => { const suffix = prefixed('text')(utility); return suffix === undefined || suffix === '' || sets.sizes.has(suffix) || /^(?:left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[(?:length:)?\d)/.test(suffix) ? undefined : suffix; },
    make: suffix => `text-${suffix}` },
  { ...spacing('width', 'w', ['width']), fixed: [{ token: 'full', value: '100%' }, { token: 'auto', value: 'auto' }, { token: 'screen', value: '100vw' }] },
  { ...spacing('height', 'h', ['height']), fixed: [{ token: 'full', value: '100%' }, { token: 'auto', value: 'auto' }, { token: 'screen', value: '100vh' }] },
  choice('object-fit', 'media', 'object-fit', 'object', [['contain', 'contain'], ['cover', 'cover'], ['fill', 'fill'], ['none', 'none'], ['scale-down', 'scale-down']]),
  { key: 'aspect-ratio', family: 'media', css: ['aspect-ratio'],
    match: utility => { const suffix = prefixed('aspect')(utility); return suffix === undefined || suffix === '' ? undefined : suffix; }, make: suffix => `aspect-${suffix}`,
    fixed: [{ token: 'auto', value: 'auto' }, { token: 'square', value: '1 / 1' }, { token: 'video', value: '16 / 9' }, { token: '4/3', value: '4 / 3' }, { token: '3/2', value: '3 / 2' }] },
];

const camel = (css: string) => css.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const wrappers = new Set(['cn', 'clsx', 'classNames', 'classnames', 'cx', 'twMerge', 'tw', 'cva', 'twJoin']);
const mediaTags = new Set(['img', 'video', 'picture', 'svg', 'canvas', 'audio', 'iframe']);
const controlTags = new Set(['button', 'input', 'select', 'textarea']);
const textTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'small', 'label', 'a', 'li', 'code', 'blockquote']);

/** A string in source which holds class names: where its content starts and ends, between the quotes. */
interface Text { start: number; end: number; text: string }
type ClassName =
  | { kind: 'none' }
  | { kind: 'static'; attribute: Node; strings: Text[] }
  | { kind: 'dynamic'; reason: string };
interface Style { kind: 'none' | 'dynamic' | 'static'; properties: Map<string, { value: Node; name: string }>; reason?: string }
interface Element { opening: Extract<Node, { type: 'JSXOpeningElement' }>; className: ClassName; style: Style }

function findOpening(file: string, text: string, start: number): Element['opening'] | undefined {
  const parsed = parseSync(file, text);
  if (parsed.errors.length) throw new UsageError('This file does not parse; fix it before editing properties.');
  let found: Element['opening'] | undefined;
  const walk = (node: Node): void => {
    if (found || node.start > start || node.end <= start) return;
    if (node.type === 'JSXOpeningElement' && node.start === start) { found = node; return; }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node);
    }
  };
  walk(parsed.program);
  return found;
}
const unwrap = (node: Node): Node => node.type === 'ParenthesizedExpression' || node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression' ? unwrap(node.expression) : node;
function staticText(node: Node, source: string): Text | undefined {
  const value = unwrap(node);
  if (value.type === 'Literal' && typeof value.value === 'string') return { start: value.start + 1, end: value.end - 1, text: value.value };
  if (value.type === 'TemplateLiteral' && !value.expressions.length) return { start: value.start + 1, end: value.end - 1, text: source.slice(value.start + 1, value.end - 1) };
  return undefined;
}
function classNameOf(attribute: Node | undefined, source: string): ClassName {
  if (!attribute || attribute.type !== 'JSXAttribute') return { kind: 'none' };
  const value = attribute.value;
  if (!value) return { kind: 'dynamic', reason: 'className has no value.' };
  if (value.type === 'Literal') { const text = staticText(value, source); return text ? { kind: 'static', attribute, strings: [text] } : { kind: 'dynamic', reason: 'className is not a string.' }; }
  if (value.type !== 'JSXExpressionContainer' || value.expression.type === 'JSXEmptyExpression') return { kind: 'dynamic', reason: 'className is not a plain expression.' };
  const expression = unwrap(value.expression), direct = staticText(expression, source);
  if (direct) return { kind: 'static', attribute, strings: [direct] };
  if (expression.type === 'CallExpression') {
    const callee = expression.callee, name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : undefined;
    if (name && wrappers.has(name)) {
      const strings = expression.arguments.flatMap(argument => { const text = argument.type === 'SpreadElement' ? undefined : staticText(argument, source); return text ? [text] : []; });
      return strings.length ? { kind: 'static', attribute, strings }
        : { kind: 'dynamic', reason: `${name}(…) has no plain string argument to hold the class; add one by hand.` };
    }
  }
  const what = expression.type === 'TemplateLiteral' ? 'a template literal with expressions' : expression.type === 'ConditionalExpression' || expression.type === 'LogicalExpression' ? 'a condition' : expression.type === 'Identifier' || expression.type === 'MemberExpression' ? 'a variable' : 'an expression';
  return { kind: 'dynamic', reason: `className is built at runtime (${what}); set the class by hand.` };
}
function styleOf(attribute: Node | undefined): Style {
  const empty: Style = { kind: 'none', properties: new Map() };
  if (!attribute || attribute.type !== 'JSXAttribute') return empty;
  const value = attribute.value;
  const expression = value?.type === 'JSXExpressionContainer' && value.expression.type !== 'JSXEmptyExpression' ? unwrap(value.expression) : undefined;
  if (!expression || expression.type !== 'ObjectExpression') return { kind: 'dynamic', properties: new Map(), reason: 'style is not an object written here.' };
  const properties = new Map<string, { value: Node; name: string }>();
  let dynamic = false;
  for (const property of expression.properties) {
    if (property.type !== 'Property' || property.computed) { dynamic = true; continue; }
    const name = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'Literal' ? String(property.key.value) : undefined;
    if (name === undefined) { dynamic = true; continue; }
    properties.set(camel(name), { value: property.value, name });
  }
  return { kind: dynamic ? 'dynamic' : 'static', properties, ...(dynamic ? { reason: 'style has spread or computed keys.' } : {}) };
}
function element(file: string, text: string, start: number): Element {
  const opening = findOpening(file, text, start);
  if (!opening) throw new UsageError('Source position does not identify an authored JSX element.');
  const named = (name: string) => opening.attributes.find(attribute => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === name);
  return { opening, className: classNameOf(named('className') ?? named('class'), text), style: styleOf(named('style')) };
}

/** Class names in the static strings: variants carry their own state and never count as the base property. */
function classes(strings: Text[]): { text: string; start: number; end: number; string: Text }[] {
  return strings.flatMap(string => [...string.text.matchAll(/\S+/g)].map(match => ({ text: match[0], start: string.start + match.index, end: string.start + match.index + match[0].length, string })));
}
function baseUtility(token: string): string | undefined {
  let depth = 0;
  for (let i = 0; i < token.length; i++) { if (token[i] === '[') depth++; else if (token[i] === ']') depth--; else if (token[i] === ':' && depth === 0) return undefined; }
  return token.replace(/^!/, '').replace(/!$/, '');
}

function pools(decisions: Decision[]) {
  const steps = (def: Def): PropStep[] => {
    const result: PropStep[] = [];
    if (def.theme) {
      const named = decisions.filter(d => d.family === def.theme!.family && d.name.startsWith(def.theme!.namespace) && !d.name.slice(def.theme!.namespace.length).includes('--') && d.name.slice(def.theme!.namespace.length) !== '');
      const project = named.filter(d => d.origin === 'project');
      for (const d of project.length ? project : def.family === 'spacing' ? [] : named) {
        const token = d.name.slice(def.theme.namespace.length);
        result.push({ token, value: d.resolved ?? d.value, label: token, class: def.make(token), css: `var(${d.name})` });
      }
    }
    for (const item of def.fixed ?? []) result.push({ token: item.token, value: item.value, label: item.token, class: def.make(item.suffix ?? item.token), css: item.value });
    return result;
  };
  const names = (namespace: string, family: string, fallback: string[]) => new Set([...fallback, ...decisions.filter(d => d.family === family && d.name.startsWith(namespace) && !d.name.slice(namespace.length).includes('--')).map(d => d.name.slice(namespace.length))]);
  const sets: Sets = { sizes: names('--text-', 'type', defaultSizes), weights: names('--font-weight-', 'type', defaultWeights), shadows: names('--shadow-', 'elevation', defaultShadows) };
  return { steps, sets };
}

function kindOf(tag: string, utilities: Set<string>): Props['kind'] {
  if (mediaTags.has(tag)) return 'media';
  if (controlTags.has(tag)) return 'control';
  if ([...utilities].some(utility => /^(?:flex|inline-flex|grid|inline-grid)$/.test(utility))) return 'layout';
  if (textTags.has(tag)) return 'text';
  return 'surface';
}

export function elementProps(file: string, text: string, start: number, tag: string, decisions: Decision[], declarations: Declaration[]): Props {
  const el = element(file, text, start), { steps, sets } = pools(decisions);
  const present = el.className.kind === 'static' ? classes(el.className.strings).flatMap(item => { const utility = baseUtility(item.text); return utility === undefined ? [] : [{ token: item.text, utility }]; }) : [];
  const own = declarations.filter(d => d.when.length === 0 && d.origin !== 'keyframes' && d.origin !== 'custom-property');
  const result = defs.map((def): Prop => {
    const options = steps(def);
    const base = { key: def.key, family: def.family, steps: options };
    const dynamic = el.className.kind === 'dynamic' ? el.className.reason : el.style.kind === 'dynamic' ? el.style.reason : undefined;
    const inline = def.css.map(name => el.style.properties.get(camel(name))).find(Boolean);
    if (inline) {
      const literal = staticLiteral(inline.value);
      if (literal === undefined) return { ...base, value: null, token: null, source: 'inline', class: null, dynamic: 'This value is computed at runtime; it cannot be edited here.' };
      const reference = /^var\((--[\w-]+)\)$/.exec(literal)?.[1];
      const step = options.find(item => item.css === literal) ?? (reference ? options.find(item => item.css === `var(${reference})`) : undefined);
      const value = step?.value ?? literal;
      return { ...base, value, token: step?.token ?? null, source: 'inline', class: null };
    }
    for (const { token, utility } of present) {
      const suffix = def.match(utility, sets);
      if (suffix === undefined) continue;
      const step = options.find(item => item.token === suffix) ?? (suffix === '' ? options.find(item => item.token === '1' && def.key === 'border-width') : undefined);
      const compiled = own.find(d => d.site.text === token && def.css.includes(d.prop));
      const arbitrary = /^\[(.*)\]$/.exec(suffix)?.[1]?.replace(/_/g, ' ');
      return { ...base, value: step?.value ?? compiled?.resolved ?? compiled?.value ?? arbitrary ?? null, token: step?.token ?? null, source: 'class', class: token };
    }
    const computed = own.find(d => def.css.includes(d.prop) && !present.some(item => item.token === d.site.text));
    if (computed) return { ...base, value: computed.resolved ?? computed.value, token: null, source: 'computed', class: null, ...(dynamic ? { dynamic } : {}) };
    return { ...base, value: null, token: null, source: 'none', class: null, ...(dynamic ? { dynamic } : {}) };
  });
  return { kind: kindOf(tag, new Set(present.map(item => item.utility))), tag, props: result };
}
function staticLiteral(node: Node): string | undefined {
  const value = unwrap(node);
  if (value.type === 'Literal' && (typeof value.value === 'string' || typeof value.value === 'number')) return String(value.value) + (typeof value.value === 'number' && value.value !== 0 ? 'px' : '');
  if (value.type === 'TemplateLiteral' && !value.expressions.length) return value.quasis[0]?.value.cooked ?? undefined;
  return undefined;
}

export interface SourceChange { start: number; end: number; replacement: string; at: number }
/** The one replacement which sets this property to this step, or the reason it cannot be written. */
export function setProp(file: string, text: string, start: number, tag: string, decisions: Decision[], declarations: Declaration[], key: string, token: string): SourceChange {
  const def = defs.find(item => item.key === key);
  if (!def) throw new UsageError(`Unknown property: ${key}.`);
  const current = elementProps(file, text, start, tag, decisions, declarations).props.find(item => item.key === key)!;
  const step = current.steps.find(item => item.token === token);
  if (!step) throw new UsageError(`${token} is not a step of ${key}. Read the element's props again.`);
  const el = element(file, text, start), at = el.opening.start;
  if (current.source === 'inline') {
    const property = def.css.map(name => el.style.properties.get(camel(name))).find(Boolean);
    if (!property || staticLiteral(property.value) === undefined) throw new UsageError(current.dynamic ?? 'This inline value is computed at runtime; it cannot be edited here.');
    const value = unwrap(property.value);
    if (value.type === 'TemplateLiteral') throw new UsageError('This inline value is a template literal; change it by hand.');
    return { start: value.start, end: value.end, replacement: JSON.stringify(step.css), at };
  }
  if (el.className.kind === 'dynamic') throw new UsageError(el.className.reason);
  if (el.className.kind === 'none') {
    const hasClass = el.opening.attributes.some(attribute => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && (attribute.name.name === 'className' || attribute.name.name === 'class'));
    if (hasClass) throw new UsageError('className is built at runtime; set the class by hand.');
    const spread = el.opening.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute');
    if (spread) throw new UsageError('This element spreads props, which may carry className; set the class by hand.');
    return { start: el.opening.name.end, end: el.opening.name.end, replacement: ` className="${step.class}"`, at };
  }
  const all = classes(el.className.strings);
  const existing = all.find(item => { const utility = baseUtility(item.text); return utility !== undefined && def.match(utility, pools(decisions).sets) !== undefined; });
  if (existing) {
    const important = /^!/.test(existing.text) ? '!' : /!$/.test(existing.text) ? 'end' : '';
    const replacement = important === '!' ? '!' + step.class : important === 'end' ? step.class + '!' : step.class;
    if (replacement === existing.text) throw new UsageError('That step is already set.');
    return { start: existing.start, end: existing.end, replacement, at };
  }
  const first = el.className.strings[0]!;
  return { start: first.end, end: first.end, replacement: first.text.trim() ? ` ${step.class}` : step.class, at };
}

/**
 * Swap classes on an element: take `from` out of its static className and put `to` where the first of them was.
 * Used for craft suggestions (rounded-card → rounded-control; opacity-65 → text-ink-muted), which name classes rather
 * than one property's step. Every `from` class must be in one static string (a literal, or one string of cn/cva).
 */
export function swapClasses(file: string, text: string, start: number, from: string[], to: string[]): SourceChange {
  const el = element(file, text, start), at = el.opening.start;
  if (el.className.kind === 'dynamic') throw new UsageError(el.className.reason);
  if (el.className.kind === 'none') {
    if (from.length) throw new UsageError(`This element has no static className holding ${from.join(' ')}.`);
    const spread = el.opening.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute');
    if (spread) throw new UsageError('This element spreads props, which may carry className; change the class by hand.');
    return { start: el.opening.name.end, end: el.opening.name.end, replacement: ` className="${quoted(to, '"').join(' ')}"`, at };
  }
  const all = classes(el.className.strings);
  const found = from.map(name => all.find(item => item.text === name));
  const missing = from.filter((_, i) => !found[i]);
  if (missing.length) throw new UsageError(`${missing.join(' ')} is not written on this element; read it again.`);
  const string = found[0]?.string ?? el.className.strings[0]!;
  if (found.some(item => item!.string !== string)) throw new UsageError('These classes sit in different parts of the className; change them by hand.');
  // The edit is made on the string as written, token by token: escapes, quotes, line breaks and indentation stay
  // exactly as they are, and only the named classes move.
  const raw = text.slice(string.start, string.end), delimiter = text[string.start - 1]!;
  const lead = raw.match(/^\s*/)![0], rest = raw.slice(lead.length), trail = rest.match(/\s*$/)![0], core = rest.slice(0, rest.length - trail.length);
  const pieces = core ? core.split(/(\s+)/) : [];
  // [whitespace before, token] pairs; the first token has none
  const pairs = pieces.flatMap((piece, i) => i % 2 ? [] : [{ sep: i ? pieces[i - 1]! : '', tok: piece }]);
  const absent = from.filter(name => !pairs.some(pair => pair.tok === name));
  if (absent.length) throw new UsageError(`${absent.join(' ')} is written with escapes here; change it by hand.`);
  const kept = pairs.filter(pair => !from.includes(pair.tok));
  const fresh = quoted(to.filter(name => !all.some(item => item.text === name && !from.includes(name))), delimiter);
  const first = from.length ? pairs.findIndex(pair => pair.tok === from[0]) : pairs.length;
  const sep = from.length ? pairs[first]!.sep : ' ';
  const before = pairs.slice(0, first).filter(pair => !from.includes(pair.tok)).length;
  const added = fresh.map((tok, i) => ({ sep: i ? ' ' : sep, tok }));
  const next = [...kept.slice(0, before), ...added, ...kept.slice(before)];
  if (next.length && next[0]!.sep) next[0] = { ...next[0]!, sep: '' };
  const body = next.map(pair => pair.sep + pair.tok).join('');
  if (body === core) throw new UsageError('Nothing to change: the classes are already so.');
  return { start: string.start, end: string.end, replacement: lead + body + trail, at };
}
/** Classes written into a string with this delimiter: a quote of the same kind inside `[…]` turns into the other kind
 * (CSS takes either), and anything that still cannot sit in the string unescaped is refused. */
function quoted(names: string[], delimiter: string): string[] {
  return names.map(name => {
    let out = name;
    if (delimiter === "'" || delimiter === '"') out = name.replaceAll(delimiter, delimiter === "'" ? '"' : "'");
    if (out.includes(delimiter) || out.includes('\\') || (delimiter === '`' && out.includes('${')) || /[\r\n]/.test(out)) throw new UsageError(`${name} cannot be written into this string as it is; add it by hand.`);
    return out;
  });
}
