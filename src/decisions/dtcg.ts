import { readFile } from 'node:fs/promises';
import { glob } from 'tinyglobby';
import type { Decision, Family } from '../report.js';
import { UsageError } from '../errors.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import { defineDecisions } from './record.js';

const families: Record<string, Family> = { color: 'color', dimension: 'spacing', fontFamily: 'type', fontWeight: 'type', typography: 'type', duration: 'motion', cubicBezier: 'motion', shadow: 'elevation', number: 'opacity' };

// JSON.parse validates syntax. This token walk only indexes exact key paths,
// so equally named tokens in different groups retain their own source line.
function locations(text: string): Map<string, number> {
  const tokens = [...text.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?|true|false|null/g)];
  const result = new Map<string, number>(); let index = 0;
  function walk(path: string[]): void {
    const token = tokens[index++]?.[0];
    if (token === '{') {
      while (tokens[index]?.[0] !== '}') {
        const key = tokens[index++]!;
        const child = [...path, JSON.parse(key[0]) as string];
        result.set(child.join('.'), key.index);
        index++; walk(child);
        if (tokens[index]?.[0] !== ',') break;
        index++;
      }
      index++;
    } else if (token === '[') {
      let item = 0;
      while (tokens[index]?.[0] !== ']') {
        walk([...path, String(item++)]);
        if (tokens[index]?.[0] !== ',') break;
        index++;
      }
      index++;
    }
  }
  walk([]); return result;
}
function cssValue(raw: unknown, type: string): string {
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (type === 'cubicBezier' && Array.isArray(raw)) return `cubic-bezier(${raw.join(', ')})`;
  if (Array.isArray(raw)) return raw.map(value => cssValue(value, type)).join(', ');
  if (raw && typeof raw === 'object') {
    const value = raw as Record<string, unknown>;
    if ('value' in value && 'unit' in value) return `${value.value}${value.unit}`;
    if (type === 'color' && typeof value.colorSpace === 'string' && Array.isArray(value.components)) {
      return `color(${value.colorSpace} ${value.components.join(' ')}${value.alpha === undefined ? '' : ` / ${value.alpha}`})`;
    }
  }
  return JSON.stringify(raw);
}

export async function readDtcg(root: string, pattern: string, family: Family): Promise<Decision[]> {
  const records: Decision[] = [];
  for (const file of await glob(pattern, { cwd: root, absolute: true })) {
    try {
      const text = await readFile(file, 'utf8'), parsed: unknown = JSON.parse(text), offsets = locations(text);
      const source = { file, text, lineStarts: lineStarts(text) };
      function walk(node: unknown, path: string[], inherited?: string): void {
        if (!node || typeof node !== 'object' || Array.isArray(node)) return;
        const token = node as Record<string, unknown>, type = typeof token.$type === 'string' ? token.$type : inherited;
        if ('$value' in token) {
          if (type && families[type] === family) {
            const extension = (token.$extensions as { plumb?: { tier?: unknown } } | undefined)?.plumb;
            if (extension?.tier !== undefined && !['primitive', 'semantic'].includes(String(extension.tier))) throw new UsageError(`Invalid DTCG tier: ${path.join('.')}.`);
            const tier = extension?.tier as Decision['tier'] | undefined;
            records.push(...defineDecisions([{ family, name: path.join('.'), value: cssValue(token.$value, type), why: typeof token.$description === 'string' ? token.$description : '',
              ...(tier ? { tier } : {}), source: { file, line: sourceSite(source, offsets.get(path.join('.')) ?? 0, '').line } }]));
          }
          return;
        }
        for (const [key, child] of Object.entries(token)) if (!key.startsWith('$')) walk(child, [...path, key], type);
      }
      walk(parsed, []);
    } catch (error) { throw new UsageError(`Read DTCG ${file}: ${String(error)}`); }
  }
  return records;
}
