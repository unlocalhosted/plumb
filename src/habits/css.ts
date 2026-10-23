import type { Condition } from '../report.js';
import { tokens } from '../rules/families.js';

/** Preserve syntax outside strings/comments; quoted examples are not CSS values. */
export function code(value: string): string {
  return value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g, text => ' '.repeat(text.length));
}
export function calls(value: string, name: string): { start: number; end: number; args: string }[] {
  const result = [], pattern = new RegExp(`(?<![\\\\\\w-])${name}\\(`, 'gi');
  const masked = code(value);
  for (let match; (match = pattern.exec(masked));) {
    let end = pattern.lastIndex, depth = 1;
    for (; end < masked.length && depth; end++) { if (masked[end] === '\\') { end++; continue; } if (masked[end] === '(') depth++; if (masked[end] === ')') depth--; }
    result.push({ start: match.index, end, args: value.slice(pattern.lastIndex, end - 1) });
    // Scan nested calls too: env() inside a fallback still requires its own fallback.
  }
  return result;
}
export function positivePseudo(selector: string, name: string): boolean {
  const negations = calls(selector, 'not');
  for (const call of negations.filter(call => !negations.some(parent => parent.start < call.start && parent.end >= call.end)).reverse()) selector = selector.slice(0, call.start) + selector.slice(call.end);
  return new RegExp(`(?<!\\\\):${name}(?![\\w-])`, 'i').test(code(selector));
}
export function hoverGated(when: Condition[]): boolean {
  const requires = (feature: RegExp) => when.some(condition => condition.kind === 'media' &&
    tokens(condition.text, /,/).every(branch => !/\b(not|or)\b/i.test(branch) && feature.test(branch)));
  return requires(/\(\s*hover\s*:\s*hover\s*\)/i);
}
export const selector = (when: Condition[]) => when.filter(condition => condition.kind === 'selector').map(condition => condition.text).join(', ');

/** Every selector-list branch must explicitly constrain direction. */
export function directionSpecific(value: string): boolean {
  return tokens(value, /,/).every(branch => {
    const excluded = [...calls(branch, 'not'), ...calls(branch, 'has')].sort((a, b) => a.start - b.start);
    for (const call of excluded.filter(call => !excluded.some(parent => parent.start < call.start && parent.end >= call.end)).reverse()) branch = branch.slice(0, call.start) + branch.slice(call.end);
    const alternatives = [...calls(branch, 'is'), ...calls(branch, 'where')].sort((a, b) => a.start - b.start);
    for (const call of alternatives.filter(call => !alternatives.some(parent => parent.start < call.start && parent.end >= call.end)).reverse()) {
      branch = branch.slice(0, call.start) + (directionSpecific(call.args) ? ':dir(ltr)' : '') + branch.slice(call.end);
    }
    return /(?<!\\):dir\(\s*(?:ltr|rtl)\s*\)|\[dir\s*=\s*["']?(?:ltr|rtl)["']?\s*(?:i\s*)?\]/i.test(branch);
  });
}
