import type { Node, Program } from 'oxc-parser';
import type { Site } from '../report.js';

export interface SourceText { file: string; text: string; lineStarts: number[] }

export function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  return starts;
}

export function sourceSite(source: SourceText, offset: number, text: string): Site {
  let low = 0, high = source.lineStarts.length;
  while (low + 1 < high) {
    const middle = (low + high) >>> 1;
    if (source.lineStarts[middle]! <= offset) low = middle;
    else high = middle;
  }
  return { file: source.file, line: low + 1, column: offset - source.lineStarts[low]! + 1, text };
}

export function unwrap(node: Node): Node {
  switch (node.type) {
    case 'TSAsExpression': case 'TSSatisfiesExpression': case 'TSNonNullExpression':
    case 'TSTypeAssertion': case 'ParenthesizedExpression': return unwrap(node.expression);
    default: return node;
  }
}

export function nodeName(node: Node): string {
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  if (node.type === 'JSXMemberExpression') return `${nodeName(node.object)}.${nodeName(node.property)}`;
  return '';
}

export function references(value: string): string[] {
  return [...new Set([...value.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|var\(\s*(--[\w-]+)/g)].flatMap(match => match[1] ? [match[1]] : []))];
}

export function constExport(ast: Program, name: string): Node | null {
  const constants = new Map<string, Node>();
  for (const statement of ast.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') continue;
    for (const item of declaration.declarations) {
      if (item.id.type !== 'Identifier' || !item.init) continue;
      constants.set(item.id.name, item.init);
      if (statement.type === 'ExportNamedDeclaration' && item.id.name === name) return item.init;
    }
  }
  for (const statement of ast.body) {
    if (statement.type === 'ExportNamedDeclaration' && !statement.source) {
      for (const item of statement.specifiers) if (nodeName(item.exported) === name) return constants.get(nodeName(item.local)) ?? null;
    }
    if (statement.type === 'ExportDefaultDeclaration' && name === 'default' && statement.declaration.type === 'Identifier') return constants.get(statement.declaration.name) ?? null;
  }
  return null;
}
