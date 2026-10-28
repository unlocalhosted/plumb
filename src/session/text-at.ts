import { parseSync, visitorKeys } from 'oxc-parser';
import type { JSXAttribute, Node } from 'oxc-parser';
import { sourceHash } from '../collect/cache.js';
import { lineStarts } from '../collect/source.js';
import { UsageError } from '../errors.js';
import { decodeEntities, textReasons, textSites } from './text.js';
import { encodeAttributeString, encodeJSXText, encodeTextLiteral } from './text-encoding.js';

/** One string in source that can render words: JSX text, a JSX attribute, or a string literal. */
export interface TextTarget {
  id: string; kind: 'jsx' | 'attribute' | 'literal'; text: string; start: number; end: number;
  /** Opening-tag offset of the element it belongs to (jsx and attribute kinds). */ element?: number;
  /** An attribute written `name="…"`: entities, no backslash escapes, one line. */ plain?: true;
  attribute?: string; replace: (to: string) => string;
}
export interface ParsedText { hash: string; source: string; targets: TextTarget[]; translated: Set<number> }
export type TextAtResult =
  | { editable: true; hash: string; file: string; line: number; column: number; kind: TextTarget['kind']; id: string; from: string }
  | { editable: false; reason: string; where?: { file: string; line: number } };
export interface TextOwner { path: string; line: number; column: number }
interface Hit { file: string; parsed: ParsedText; target: TextTarget }

// Attributes whose strings are never words.
const notWords = new Set(['className', 'class', 'id', 'key', 'href', 'src', 'htmlFor', 'role', 'type', 'name', 'rel', 'target', 'style']);
const norm = (value: string) => value.replace(/\s+/g, ' ').trim();
const hasTranslation = (node: Node): boolean => {
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'Identifier' && callee.name === 't' || callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name === 't') return true;
  }
  const record = node as unknown as Record<string, unknown>;
  return (visitorKeys[node.type] ?? []).some(key => (Array.isArray(record[key]) ? record[key] as unknown[] : [record[key]]).some(child => child && typeof child === 'object' && hasTranslation(child as Node)));
};

/** Every string in a file that could render words, each addressed by an id derived from the file's hash and range. */
export function textTargets(file: string, source: string): ParsedText {
  const parsed = parseSync(file, source);
  if (parsed.errors.length) throw new UsageError('Fix source syntax errors before editing text.');
  const hash = sourceHash(source), targets: TextTarget[] = [], translated = new Set<number>(), taken = new Set<string>();
  const id = (kind: string, start: number, end: number) => sourceHash(JSON.stringify([hash, kind, start, end]));
  // JSX text, and string-literal children, are the existing runs.
  for (const site of textSites(file, source)) for (const run of site.runs) {
    const start = run.literal?.start ?? run.start, end = run.literal?.end ?? run.end;
    if (run.literal) taken.add(`${start}:${end}`);
    targets.push({ id: run.id, kind: 'jsx', text: run.text, start, end, element: site.element.openingElement.start,
      replace: to => run.literal ? encodeTextLiteral(to, run.literal.quote) : encodeJSXText(source.slice(start, end), to) });
  }
  const literal = (node: Node, kind: 'attribute' | 'literal', extra: Partial<TextTarget> = {}) => {
    let text: string | undefined;
    if (node.type === 'Literal' && typeof node.value === 'string') text = node.value;
    else if (node.type === 'TemplateLiteral' && !node.expressions.length) text = node.quasis[0]?.value.cooked ?? undefined;
    if (text === undefined || taken.has(`${node.start}:${node.end}`)) return;
    taken.add(`${node.start}:${node.end}`);
    const quote = source[node.start]!;
    targets.push({ id: id(kind[0]!, node.start, node.end), kind, text, start: node.start, end: node.end, replace: to => encodeTextLiteral(to, quote), ...extra });
  };
  function walk(node: Node, parent?: Node, key?: string): void {
    if (node.type.startsWith('TS')) return;
    if (node.type === 'JSXOpeningElement') {
      for (const attribute of node.attributes) {
        if (attribute.type !== 'JSXAttribute') continue;
        const name = attribute.name.type === 'JSXIdentifier' ? attribute.name.name : undefined, value = (attribute as JSXAttribute).value;
        const base = { element: node.start, ...(name ? { attribute: name } : {}) };
        if (value?.type === 'Literal' && typeof value.value === 'string') {
          const quote = source[value.start]!;
          taken.add(`${value.start}:${value.end}`);
          targets.push({ id: id('a', value.start, value.end), kind: 'attribute', text: decodeEntities(source.slice(value.start + 1, value.end - 1)), start: value.start, end: value.end, plain: true,
            replace: to => encodeAttributeString(to, quote), ...base });
        } else if (value?.type === 'JSXExpressionContainer') {
          literal(value.expression as Node, 'attribute', base);
          if (hasTranslation(value.expression as Node)) translated.add(node.start);
        }
      }
    }
    const skipped = parent && (
      (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration' || parent.type === 'ImportExpression') && key === 'source' ||
      parent.type === 'Property' && key === 'key' && !parent.computed || parent.type === 'MemberExpression' && key === 'property' ||
      parent.type === 'ExpressionStatement' && 'directive' in parent && !!parent.directive || parent.type === 'TaggedTemplateExpression' || parent.type === 'JSXAttribute');
    if (!skipped && (node.type === 'Literal' || node.type === 'TemplateLiteral')) literal(node, 'literal');
    const record = node as unknown as Record<string, unknown>;
    for (const k of visitorKeys[node.type] ?? []) {
      const value = record[k];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node, node, k);
    }
  }
  walk(parsed.program);
  return { hash, source, targets, translated };
}

export interface TextAtInput {
  line: number; column: number; words: string; owners: TextOwner[];
  /** The source of a project file, or undefined when it is not readable project source. */ read: (path: string) => Promise<string | undefined>;
  /** The project's source files, absolute. */ files: () => string[];
  relative: (path: string) => string;
}

/** The one string in source that renders these words, or why there is not exactly one. */
export async function resolveTextAt(input: TextAtInput, path: string): Promise<TextAtResult> {
  const words = norm(input.words);
  if (!words) throw new UsageError('text must be non-empty words.');
  const cache = new Map<string, ParsedText | undefined>();
  const load = async (file: string) => {
    if (!cache.has(file)) {
      let parsed: ParsedText | undefined;
      try { const source = await input.read(file); parsed = source === undefined ? undefined : textTargets(file, source); } catch (error) { if (file === path) throw error; }
      cache.set(file, parsed);
    }
    return cache.get(file);
  };
  const offsetOf = (parsed: ParsedText, line: number, column: number) => (lineStarts(parsed.source)[line - 1] ?? -Infinity) + column - 1;
  const lineOf = (parsed: ParsedText, offset: number) => {
    const starts = lineStarts(parsed.source); let low = 0;
    for (let high = starts.length; low + 1 < high;) { const mid = (low + high) >> 1; if (starts[mid]! <= offset) low = mid; else high = mid; }
    return { line: low + 1, column: offset - starts[low]! + 1 };
  };
  const settle = (hits: Hit[]): TextAtResult => {
    const first = hits[0]!, at = lineOf(first.parsed, first.target.start);
    if (hits.length > 1) return { editable: false, reason: `${hits.length} strings in source say these words. Edit the one you mean by hand.`, where: { file: input.relative(first.file), line: at.line } };
    return { editable: true, hash: first.parsed.hash, file: input.relative(first.file), ...at, kind: first.target.kind, id: first.target.id, from: first.target.text };
  };

  // 1 and 2: the element's own text and attributes, then each use site in the owner chain, innermost first.
  const levels = [{ path, line: input.line, column: input.column }, ...input.owners];
  let translated = false, computed = false, element: { file: string; line: number; reason: string } | undefined;
  for (const [index, level] of levels.entries()) {
    const parsed = await load(level.path);
    if (!parsed) continue;
    const offset = offsetOf(parsed, level.line, level.column);
    if (parsed.translated.has(offset)) translated = true;
    const hits = parsed.targets.filter(target => target.element === offset && norm(target.text) === words).map(target => ({ file: level.path, parsed, target }));
    if (hits.length) return settle(hits);
    if (index === 0) {
      const site = textSites(level.path, parsed.source).find(site => site.element.openingElement.start === offset);
      if (site) {
        element = { file: input.relative(level.path), line: level.line, reason: site.reason };
        if (site.reason === textReasons.translation) translated = true;
        computed = site.element.children.some(child => child.type === 'JSXExpressionContainer' && (['BinaryExpression', 'UpdateExpression', 'UnaryExpression'].includes(child.expression.type) ||
          child.expression.type === 'TemplateLiteral' && child.expression.expressions.length > 0));
      }
    }
  }
  const where = element ? { file: element.file, line: element.line } : undefined;
  if (translated) return { editable: false, reason: textReasons.translation, ...(where ? { where } : {}) };

  // 3: a string literal in the owner chain's files, then anywhere in the project's source, exactly one.
  const chain = [...new Set(levels.map(level => level.path))];
  const rest = input.files().filter(file => !chain.includes(file));
  const piece = [...words.split(/[^\p{L}\p{N} ]/u)].sort((a, b) => b.length - a.length)[0]!;
  // The project-wide search is for words that arrive from elsewhere (a looked-up value, a prop, children). It is skipped
  // when the element computes its words itself ({i + 1}: nothing to look up), and for words too thin to identify one
  // string (a lone digit matches whatever else happens to say "1").
  const trivial = (words.match(/\p{L}/gu) ?? []).length < 2;
  for (const group of computed || trivial ? [chain] : [chain, rest]) {
    const hits: Hit[] = [];
    for (const file of group) {
      if (!cache.has(file)) {
        const source = await input.read(file);
        if (source === undefined || !source.includes(piece)) continue;
        cache.set(file, undefined); // parsed below from the same read
        try { cache.set(file, textTargets(file, source)); } catch { /* a file that does not parse has no strings to offer */ }
      }
      const parsed = cache.get(file);
      if (parsed) for (const target of parsed.targets) if (target.kind !== 'jsx' && !(target.attribute && notWords.has(target.attribute)) && norm(target.text) === words) hits.push({ file, parsed, target });
    }
    if (hits.length) return settle(hits);
  }
  return { editable: false, reason: element && element.reason !== textReasons.empty ? element.reason : 'React Plumber can’t find a string in your source that renders these words.', ...(where ? { where } : {}) };
}
