import type { WriteStream } from 'node:tty';

/** Pipes always use 100 columns, regardless of the caller's COLUMNS variable. */
export function terminalWidth(stream: Pick<WriteStream, 'isTTY' | 'columns'> = process.stdout): number {
  return stream.isTTY && stream.columns > 0 ? stream.columns : 100;
}
export const plain = (text: string) => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const cells = (text: string) => [...segments.segment(text)].map(part => part.segment);
function cellWidth(char: string): number {
  if (/^[\p{Mark}\p{Control}\p{Format}]+$/u.test(char)) return 0;
  const code = char.codePointAt(0)!;
  return /\p{Extended_Pictographic}/u.test(char) || code >= 0x1100 && (code <= 0x115f || code >= 0x2e80 && code <= 0xa4cf || code >= 0xac00 && code <= 0xd7a3 || code >= 0xf900 && code <= 0xfaff || code >= 0xfe10 && code <= 0xfe6f || code >= 0xff01 && code <= 0xff60 || code >= 0xffe0 && code <= 0xffe6) ? 2 : 1;
}
export const visibleWidth = (text: string) => cells(plain(text)).reduce((sum, char) => sum + cellWidth(char), 0);
export const oneLine = (text: string) => text.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
export function shorten(text: string, width: number, middle = false): string {
  text = oneLine(plain(text));
  if (visibleWidth(text) <= width) return text;
  if (width <= 0) return '';
  const chars = cells(text);
  const take = (amount: number, reverse = false) => {
    let result = '', used = 0;
    for (const char of reverse ? [...chars].reverse() : chars) {
      if (used + cellWidth(char) > amount) break;
      result = reverse ? char + result : result + char; used += cellWidth(char);
    }
    return result;
  };
  return middle ? take(Math.ceil((width - 1) / 2)) + '…' + take(Math.floor((width - 1) / 2), true) : take(width - 1) + '…';
}
export type Ink = 'red' | 'amber' | 'dim';
export function paint(text: string, ink?: Ink, stream: WriteStream = process.stdout): string {
  return ink && stream.isTTY && process.env.NO_COLOR === undefined ? `\x1b[${{ red: 31, amber: 33, dim: 2 }[ink]}m${text}\x1b[0m` : text;
}
/** A `wrap` column keeps its whole text: it folds onto more lines inside its own width instead of being cut. */
export interface Column { width?: number; weight?: number; align?: 'right'; path?: boolean; ink?: Ink; wrap?: boolean }
export type Cell = string | { text: string; ink?: Ink; path?: boolean };
export interface TableOptions { width?: number; indent?: number; gap?: number; stream?: WriteStream }
/** Column budgets depend on terminal geometry, never on the longest data cell. */
export function table(rows: Cell[][], columns: Column[], options: TableOptions = {}): string[] {
  const indent = options.indent ?? 2, gap = options.gap ?? 2, stream = options.stream ?? process.stdout;
  const budget = Math.max(columns.length, (options.width ?? terminalWidth(stream)) - indent - gap * (columns.length - 1));
  const fixed = columns.reduce((sum, column) => sum + (column.width ?? 0), 0);
  const weight = columns.reduce((sum, column) => sum + (column.width === undefined ? column.weight ?? 1 : 0), 0);
  const widths = columns.map(column => column.width ?? Math.max(1, Math.floor((budget - fixed) * (column.weight ?? 1) / weight)));
  if (fixed > budget) {
    const ratio = budget / widths.reduce((sum, width) => sum + width, 0);
    widths.forEach((width, i) => { widths[i] = Math.max(1, Math.floor(width * ratio)); });
  }
  const spare = budget - widths.reduce((sum, width) => sum + width, 0);
  if (spare > 0) widths[widths.length - 1]! += spare;
  return rows.map(row => {
    const parts = columns.map((column, i) => {
      const cell = row[i] ?? '', value = typeof cell === 'string' ? { text: cell } : cell;
      return { lines: column.wrap ? fold(value.text, widths[i]!) : [shorten(value.text, widths[i]!, value.path ?? column.path)], ink: value.ink ?? column.ink };
    });
    const height = Math.max(...parts.map(part => part.lines.length));
    return Array.from({ length: height }, (_, line) => ' '.repeat(indent) + columns.map((column, i) => {
      const text = parts[i]!.lines[line] ?? '', padding = ' '.repeat(Math.max(0, widths[i]! - visibleWidth(text)));
      const content = text ? paint(text, parts[i]!.ink, stream) : '';
      return column.align === 'right' ? padding + content : content + padding;
    }).join(' '.repeat(gap)).trimEnd()).join('\n');
  });
}
/** Words fill each line; a word wider than the line breaks after a `/` where it can (paths), else where it must. */
export function fold(text: string, width: number): string[] {
  text = oneLine(plain(text));
  if (!text) return [''];
  const lines: string[] = [];
  let current = '';
  const push = (piece: string, space: boolean) => {
    const joined = current + (current && space ? ' ' : '') + piece;
    if (visibleWidth(joined) <= width) { current = joined; return; }
    if (current) lines.push(current);
    current = '';
    for (const char of cells(piece)) {
      if (visibleWidth(current + char) > width && current) { lines.push(current); current = ''; }
      current += char;
    }
  };
  for (const word of text.split(' ')) {
    if (visibleWidth(word) <= width) { push(word, true); continue; }
    word.split(/(?<=\/)/).forEach((piece, i) => push(piece, i === 0));
  }
  if (current) lines.push(current);
  return lines;
}
/** Prose may use several physical lines; source expressions and cells never do. */
export function wrap(text: string, width = terminalWidth()): string {
  return text.split('\n').map(line => {
    if (visibleWidth(line) <= width) return line;
    const prefix = line.match(/^\s*/)?.[0] ?? '';
    const words = line.trim().split(/\s+/), lines: string[] = [];
    let current = prefix;
    for (const word of words) {
      if (visibleWidth(current + (current.trim() ? ' ' : '') + word) > width && current.trim()) { lines.push(current); current = prefix; }
      if (visibleWidth(prefix + word) > width) { lines.push(prefix + shorten(word, width - visibleWidth(prefix))); continue; }
      current += (current.trim() ? ' ' : '') + word;
    }
    if (current.trim()) lines.push(current);
    return lines.join('\n');
  }).join('\n');
}
