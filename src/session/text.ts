import { parseSync, visitorKeys } from 'oxc-parser';
import type { JSXElement, Node } from 'oxc-parser';
import { sourceHash } from '../collect/cache.js';
import { lineStarts } from '../collect/source.js';
import { UsageError } from '../errors.js';
import { jsxEntities } from './text-entities.js';

export interface TextRun { id: string; text: string; start: number; end: number }
export type TextResult = { editable: true; hash: string; runs: TextRun[] } | { editable: false; hash: string; reason: string };
export const textReasons = {
  translation: 'The text comes from a translation. Edit the translation source instead.',
  expression: 'The text comes from an expression. Edit its source instead.',
  prop: 'The text comes from a prop. Edit the prop source instead.',
  children: 'This component receives its children from elsewhere. Edit them at their source.',
  empty: 'This element has no static text to edit.',
} as const;

interface SourceRun extends TextRun { literal?: { start: number; end: number; quote: string } }
interface TextSite { element: JSXElement; runs: SourceRun[]; reason: string }

// JSX uses the HTML4 named entity table, not the browser's larger HTML5 table.
function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]*);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return Object.hasOwn(jsxEntities, name) ? String.fromCodePoint(jsxEntities[name]!) : entity;
    const value = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
  });
}

/** React's JSX line folding; outer formatting is excluded from the editable label. */
function renderedText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i]!)) last = i;
  return decodeEntities(lines.map((line, i) => {
    let text = line.replace(/\t/g, ' ');
    if (i !== 0) text = text.replace(/^ +/, '');
    if (i !== lines.length - 1) text = text.replace(/ +$/, '');
    return text ? text + (i !== last ? ' ' : '') : '';
  }).join('').trim());
}

function translation(node: Node): boolean {
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'Identifier' && callee.name === 't' || callee.type === 'MemberExpression' && callee.property.type === 'Identifier' && callee.property.name === 't') return true;
  }
  const record = node as unknown as Record<string, unknown>;
  return (visitorKeys[node.type] ?? []).some(key => {
    const value = record[key];
    return (Array.isArray(value) ? value : [value]).some(child => child && typeof child === 'object' && translation(child as Node));
  });
}

export function textSites(file: string, source: string): TextSite[] {
  const parsed = parseSync(file, source);
  if (parsed.errors.length) throw new UsageError('Fix source syntax errors before editing text.');
  const hash = sourceHash(source), sites: TextSite[] = [];
  function walk(node: Node, translatedAncestor = false): void {
    let translated = translatedAncestor;
    if (node.type === 'JSXElement') {
      const tag = source.slice(node.openingElement.name.start, node.openingElement.name.end);
      translated ||= /(?:^|\.)Trans$/.test(tag);
      const runs: SourceRun[] = [];
      let reason: string = textReasons.empty;
      for (const child of node.children) {
        let text: string | undefined;
        let literal: SourceRun['literal'];
        if (child.type === 'JSXText') text = renderedText(child.value);
        if (child.type === 'JSXExpressionContainer') {
          const expression = child.expression;
          if (expression.type === 'Literal' && typeof expression.value === 'string' || expression.type === 'TemplateLiteral' && !expression.expressions.length) {
            text = expression.type === 'Literal' ? expression.value as string : expression.quasis[0]?.value.cooked ?? undefined;
            literal = { start: expression.start, end: expression.end, quote: source[expression.start]! };
          } else if (expression.type !== 'JSXEmptyExpression') {
            if (translation(expression)) reason = textReasons.translation;
            else if (reason !== textReasons.translation) {
              const children = expression.type === 'Identifier' && expression.name === 'children' ||
                expression.type === 'MemberExpression' && expression.property.type === 'Identifier' && expression.property.name === 'children';
              const prop = expression.type === 'MemberExpression' && expression.object.type === 'Identifier' && expression.object.name === 'props';
              reason = children ? textReasons.children : prop ? textReasons.prop : textReasons.expression;
            }
          }
        }
        if (text) runs.push({ id: sourceHash(JSON.stringify([hash, child.start, child.end])), text, start: child.start, end: child.end, ...(literal ? { literal } : {}) });
      }
      if (reason === textReasons.empty) {
        if (translation(node) || node.children.some(child => child.type === 'JSXElement' && /(?:^|\.)Trans$/.test(source.slice(child.openingElement.name.start, child.openingElement.name.end)))) reason = textReasons.translation;
        else if (node.openingElement.attributes.some(attribute => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && ['children', 'label', 'text', 'title', 'value'].includes(attribute.name.name))) reason = textReasons.prop;
        else if (/^[A-Z_$]|\./.test(tag)) reason = textReasons.children;
      }
      sites.push({ element: node, runs: translated ? [] : runs, reason: translated ? textReasons.translation : reason });
    }
    const record = node as unknown as Record<string, unknown>;
    for (const key of visitorKeys[node.type] ?? []) {
      const value = record[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node, translated);
    }
  }
  walk(parsed.program); return sites;
}

export function readText(file: string, source: string, line: number, column: number): TextResult {
  const offset = (lineStarts(source)[line - 1] ?? -Infinity) + column - 1;
  const site = textSites(file, source).find(site => site.element.openingElement.start === offset);
  if (!site) throw new UsageError('Source position does not identify an authored JSX opening tag.');
  const hash = sourceHash(source);
  return site.runs.length ? { editable: true, hash, runs: site.runs.map(({ literal: _, ...run }) => run) } : { editable: false, hash, reason: site.reason };
}
