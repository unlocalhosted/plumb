// @ts-check
// One file through the pipeline: parse → machines → format findings → graph findings → lint (when asked).
import { parse } from './parse.mjs';
import { extractMachines } from './machine.mjs';
import { graphFindings } from './graph.mjs';
import { finding } from './findings.mjs';

/** @typedef {import('./machine.mjs').Machine} Machine */

/**
 * @param {string} file repo-relative path
 * @param {string} text
 * @param {{ lint?: boolean }} [options] lint rules run only for `check`; queries need the tables alone
 * @returns {Promise<{ machines: Machine[], findings: any[], parsed: Awaited<ReturnType<typeof parse>> | null }>}
 */
export async function analyzeFile(file, text, options = {}) {
  const parsed = await parse(file, text);
  if (parsed.errors.length) {
    const first = parsed.errors[0];
    const label = first.labels?.[0];
    const node = label ? { start: label.start, end: Math.max(label.end, label.start) } : { start: 0, end: 0 };
    return {
      machines: [], parsed: null,
      findings: [finding({ rule: 'sm/parse', file, lines: parsed.lines, node, machine: null, scope: 'module', detail: '', message: first.message,
        fix: 'Fix the syntax error; nothing in this file was checked.' })],
    };
  }
  const { machines, findings } = extractMachines(file, parsed, text);
  for (const m of machines) if (m.canonical) findings.push(...graphFindings(file, parsed.lines, m));
  if (options.lint) {
    const { lintFindings } = await import('./lint.mjs');
    for (const m of machines) if (m.canonical && m.bound && m.owner) findings.push(...lintFindings(file, parsed, m));
  }
  return { machines, findings, parsed };
}
