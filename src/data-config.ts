import { readFile } from 'node:fs/promises';
import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { unwrap, nodeName } from './collect/source.js';
import { validateConfig } from './config.js';
import type { PlumbConfig } from './config.js';

// Interpret data, never evaluate JavaScript. A string containing comment or
// executable-looking text is still data; an import or accessor never is.
function data(input: Node): unknown {
  const node = unwrap(input);
  if (node.type === 'Literal' && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))) return node.value;
  if (node.type === 'UnaryExpression' && ['-', '+'].includes(node.operator) && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return node.operator === '-' ? -node.argument.value : node.argument.value;
  if (node.type === 'ArrayExpression') return node.elements.map(item => { if (!item || item.type === 'SpreadElement') throw Error(); return data(item); });
  if (node.type === 'ObjectExpression') {
    const result = Object.create(null) as Record<string, unknown>;
    for (const item of node.properties) {
      if (item.type !== 'Property' || item.computed || item.method || item.kind !== 'init' || item.shorthand) throw Error();
      const key = nodeName(item.key);
      if (key === undefined || Object.hasOwn(result, key)) throw Error();
      result[key] = data(item.value);
    }
    return result;
  }
  throw Error();
}
export async function dataConfig(file: string): Promise<{ text: string; value: PlumbConfig } | undefined> {
  try {
    const text = await readFile(file, 'utf8'), parsed = parseSync(file, text);
    if (parsed.errors.length) return;
    const body = parsed.program.body.filter(item => item.type !== 'EmptyStatement');
    if (body.length !== 1 || body[0]?.type !== 'ExportDefaultDeclaration') return;
    return { text, value: validateConfig(data(body[0].declaration)) };
  } catch { return; }
}
