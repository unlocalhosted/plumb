import { references } from '../collect/source.js';

export interface Variable { value: string; dynamic?: boolean }
const absolute: Record<string, number> = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, pt: 96 / 72, pc: 16 };
// Match pixels(): rem comparisons use the CSS initial root size.
const lengths: Record<string, number> = { ...absolute, rem: 16 };
export function pixels(value: string): number | undefined {
  const match = /^(-?(?:\d*\.)?\d+)([a-z]*)$/i.exec(value.trim());
  if (!match) return;
  const amount = Number(match[1]), unit = match[2]!;
  // rem equality uses the CSS initial root size, not a computed cascade.
  const factor = absolute[unit] ?? (unit === 'rem' ? 16 : undefined);
  return factor !== undefined ? amount * factor : amount === 0 ? 0 : undefined;
}

// Split shorthands without splitting whitespace inside functions or strings.
export function components(value: string): string[] {
  const parts: string[] = [];
  let start = 0, depth = 0, quote = '';
  for (let index = 0; index <= value.length; index++) {
    const char = value[index];
    if (char === '\\') { index++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (!depth && (char === undefined || /\s/.test(char))) {
      if (index > start) parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  return parts;
}

function fold(expression: string): string | undefined {
  const tokens = expression.match(/(?:\d*\.)?\d+(?:[a-z%]+)?|[()+*/-]/gi) ?? [];
  if (tokens.join('') !== expression.replace(/\s/g, '')) return;
  let index = 0;
  type Quantity = { number: number; unit: string };
  function atom(): Quantity | undefined {
    const token = tokens[index++];
    if (token === '+' || token === '-') { const value = atom(); return value && { ...value, number: value.number * (token === '-' ? -1 : 1) }; }
    if (token === '(') { const value = sum(); return tokens[index++] === ')' ? value : undefined; }
    const match = /^(\d*\.?\d+)([a-z%]*)$/i.exec(token ?? '');
    if (match) return { number: Number(match[1]), unit: match[2]! };
  }
  function product(): Quantity | undefined {
    let left = atom();
    while (left && (tokens[index] === '*' || tokens[index] === '/')) {
      const op = tokens[index++], right = atom();
      if (!right || (op === '*' ? left.unit && right.unit : right.unit || right.number === 0)) return;
      left = { number: op === '*' ? left.number * right.number : left.number / right.number, unit: left.unit || right.unit };
    }
    return left;
  }
  function sum(): Quantity | undefined {
    let left = product();
    while (left && (tokens[index] === '+' || tokens[index] === '-')) {
      const op = tokens[index++]; let right = product();
      if (!right) return;
      if (left.unit !== right.unit) {
        if (!(left.unit in lengths && right.unit in lengths)) return;
        left = { number: left.number * lengths[left.unit]!, unit: 'px' };
        right = { number: right.number * lengths[right.unit]!, unit: 'px' };
      }
      left = { number: left.number + (op === '+' ? right.number : -right.number), unit: left.unit };
    }
    return left;
  }
  const value = sum();
  return value && index === tokens.length && Number.isFinite(value.number) ? `${Number(value.number.toFixed(8))}${value.unit}` : undefined;
}

export function resolveValue(value: string, variables: ReadonlyMap<string, Variable>, seen = new Set<string>(), depth = 0): string | undefined {
  value = value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g, text => text.startsWith('/*') ? ' ' : text);
  if (depth > 8 || /\b(?:light-dark|env)\(/.test(value)) return;
  let failed = false;
  // Balanced var()s allow nested fallback functions, without interpreting CSS strings.
  let output = '';
  for (let index = 0; index < value.length;) {
    if (value[index] === '"' || value[index] === "'") {
      const quote = value[index]; const start = index++;
      while (index < value.length) { if (value[index++] === '\\') index++; else if (value[index - 1] === quote) break; }
      output += value.slice(start, index); continue;
    }
    if (!value.startsWith('var(', index)) { output += value[index++]; continue; }
    let end = index + 4, nesting = 1;
    while (end < value.length && nesting) { if (value[end] === '(') nesting++; if (value[end] === ')') nesting--; end++; }
    if (nesting) return;
    const body = value.slice(index + 4, end - 1), comma = body.indexOf(',');
    const name = (comma < 0 ? body : body.slice(0, comma)).trim();
    const variable = variables.get(name);
    if (seen.has(name) || variable?.dynamic) return;
    const replacement = variable?.value ?? (comma < 0 ? undefined : body.slice(comma + 1).trim());
    const resolved = replacement === undefined ? undefined : resolveValue(replacement, variables, new Set([...seen, name]), depth + 1);
    if (resolved === undefined) failed = true;
    else output += resolved;
    index = end;
  }
  if (failed || references(output).length) return;
  output = output.replace(/\s*!important\s*$/, '').trim();
  while (/calc\(/.test(output)) {
    const start = output.lastIndexOf('calc(');
    let end = start + 5, nesting = 1;
    while (end < output.length && nesting) { if (output[end] === '(') nesting++; if (output[end] === ')') nesting--; end++; }
    if (nesting) return;
    const result = fold(output.slice(start + 5, end - 1));
    if (result === undefined) return;
    output = output.slice(0, start) + result + output.slice(end);
  }
  return output;
}
