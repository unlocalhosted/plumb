import { readFile } from 'node:fs/promises';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { makeFinding } from '../messages.js';
import { lineStarts, nodeName, sourceSite } from '../collect/source.js';
import type { Declaration, Finding } from '../report.js';

/** #19. Words a person reads (JSX text and the attributes read aloud or shown) use real quotes, apostrophes, dashes and ellipses. */
export const realQuotesHabit = { id: 'real-quotes', severity: 'warn', reason: 'Straight quotes, three dots and spaced hyphens read as unfinished typing.', fix: 'Use real typography: ’ for apostrophes, “ ” and ‘ ’ for quotes, … for an ellipsis, – for a spaced dash.' } as const;
const SHOWN = new Set(['alt', 'title', 'placeholder', 'aria-label', 'aria-description', 'label']);

/** The text a person sees, typeset; the same string when nothing needs it. */
export function typeset(raw: string): string {
  return raw
    .replace(/&(?:apos|#39|#x27);/g, '\'').replace(/&(?:quot|#34|#x22);/g, '"')
    .replace(/\.\.\.(?!\.)/g, '…')
    .replace(/(\S) --? (?=\S)/g, '$1 – ')
    .replace(/(\w)--(?=\w)/g, '$1—')
    .replace(/(\p{L})'(?=\p{L})/gu, '$1’')
    .replace(/(^|[\s(\[{—–-])"([^"\n]*?)"/g, '$1“$2”')
    .replace(/(^|[\s(\[{—–-])'([^'\n]*?)'(?!\p{L})/gu, '$1‘$2’')
    .replace(/(\p{L}s)'(?=\s|$|[.,;:!?)])/gu, '$1’');
}

export async function realQuotes(files: string[], overrides: ReadonlyMap<string, string> = new Map()): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const file of files) {
    if (!/\.[jt]sx$/.test(file)) continue;
    let text: string;
    try { text = overrides.get(file) ?? await readFile(file, 'utf8'); } catch { continue; }
    if (!/['"]|\.\.\.|\s-\s|--|&(?:apos|quot|#39|#34);/.test(text)) continue;
    const parsed = parseSync(file, text);
    if (parsed.errors.length) continue;
    const source = { file, text, lineStarts: lineStarts(text) };
    const owners: string[] = [];
    const report = (start: number, raw: string, owner: string) => {
      const fixed = typeset(raw);
      if (fixed === raw) return;
      const lead = raw.length - raw.trimStart().length;
      const shown = raw.trim(), wanted = fixed.trim();
      const site = sourceSite(source, start + lead, shown);
      const declaration: Declaration = { prop: 'content', value: shown, refs: [], when: [], site, owner: { kind: /^[A-Z]/.test(owner) ? 'component' : 'element', name: owner }, origin: 'inline', sourceOrigin: 'project' };
      findings.push(makeFinding({ key: `habits/real-quotes:${site.file}:${site.line}:${site.column}`, rule: 'habits/real-quotes', family: 'habits', severity: realQuotesHabit.severity, sites: [site], declaration, decisions: [],
        title: `\`${shown.length > 48 ? `${shown.slice(0, 45)}…` : shown}\` uses straight typing marks`, because: realQuotesHabit.reason, action: `Write it as \`${wanted}\`.`, edits: [{ site, text: wanted }] }));
    };
    const walk = (node: Node | null | undefined): void => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'JSXElement') {
        const name = nodeName(node.openingElement.name);
        // code, styles and scripts are typed as written
        if (['code', 'pre', 'kbd', 'samp', 'style', 'script'].includes(name)) return;
        owners.push(name);
      }
      if (node.type === 'JSXText' && /\S/.test(node.value)) report(node.start, node.value, owners.at(-1) ?? 'element');
      if (node.type === 'JSXAttribute' && SHOWN.has(nodeName(node.name)) && node.value?.type === 'Literal' && typeof node.value.value === 'string')
        report(node.value.start + 1, text.slice(node.value.start + 1, node.value.end - 1), owners.at(-1) ?? 'element');
      for (const key of visitorKeys[node.type] ?? []) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(child)) for (const item of child) walk(item as Node);
        else walk(child as Node);
      }
      if (node.type === 'JSXElement') owners.pop();
    };
    walk(parsed.program as unknown as Node);
  }
  return findings;
}
