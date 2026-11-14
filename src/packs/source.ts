// Packs that read source (docs/briefs/rule-packs.md): the runner. A source rule says which kinds of syntax it is about
// and gets only those; a file none of the active rules could speak about is never parsed. One parse and one walk per
// file, whatever the number of rules (docs/briefs/engine-scaling.md §2b: lists by kind, nothing one at a time).
import { readFile } from 'node:fs/promises';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { makeFinding } from '../messages.js';
import { lineStarts, sourceSite } from '../collect/source.js';
import type { SourceText } from '../collect/source.js';
import type { Declaration, Finding } from '../report.js';
import { resolveSpec, specRules } from '../../overlay/src/craft-spec.js';
import type { PlumbConfig } from '../config.js';
import { SECURITY_RULES } from './security.js';

export type Severity = 'error' | 'warn' | 'info';
/** What a rule says about one place in the source. */
export interface Said {
  /** the node the finding is about: its start is the site */
  node: Node;
  /** the thing written to (innerHTML, eval) and what it is given: how a finding names its subject */
  to: string; given: string;
  title: string;
  action: string;
  /** distinguishes several findings of one rule at one place */
  kind?: string;
}
export interface SourceContext { file: string; text: string; ancestors: readonly Node[] }
export interface SourceRule {
  /** `<pack>/<name>` */
  id: string;
  severity: Severity;
  /** one line: why it matters, in a person's words */
  reason: string;
  /** the guide this comes from, to retrieve for the full way to do it */
  guide: string;
  /** a file that matches none of these cannot hold a finding of this rule: it is not parsed for it */
  needs: RegExp;
  /** the node types the rule is about → what it says of one */
  on: { [type: string]: (node: Node, context: SourceContext) => Said | Said[] | null | undefined };
}

export const SOURCE_RULES: SourceRule[] = [...SECURITY_RULES];
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

/** The source rules the project's spec leaves on, each with the severity the spec gives it. */
export function activeSourceRules(config: Pick<PlumbConfig, 'craft' | 'craftLayers'>): SourceRule[] {
  const spec = new Map(specRules(resolveSpec(config.craft, config.craftLayers ?? [])).filter(rule => rule.source).map(rule => [rule.id, rule]));
  return SOURCE_RULES.flatMap(rule => {
    const entry = spec.get(rule.id);
    return entry && !entry.enabled ? [] : [{ ...rule, severity: (entry?.severity as Severity | null) ?? rule.severity }];
  });
}

/** Every source rule's findings in these files. `overrides` is text not yet on disk (a snippet being tried). */
export async function judgeSource(files: Iterable<string>, rules: SourceRule[], overrides: ReadonlyMap<string, string> = new Map()): Promise<Finding[]> {
  const findings: Finding[] = [];
  if (!rules.length) return findings;
  for (const file of files) {
    if (!SOURCE_FILE.test(file)) continue;
    let text: string;
    try { text = overrides.get(file) ?? await readFile(file, 'utf8'); } catch { continue; }
    const wanted = rules.filter(rule => rule.needs.test(text));
    if (!wanted.length) continue;
    const parsed = parseSync(file, text);
    if (parsed.errors.length) continue;
    // lists by kind: a node type → the rules that are about it
    const about = new Map<string, SourceRule[]>();
    for (const rule of wanted) for (const type of Object.keys(rule.on)) { const list = about.get(type); if (list) list.push(rule); else about.set(type, [rule]); }
    const source: SourceText = { file, text, lineStarts: lineStarts(text) };
    const ancestors: Node[] = [], context: SourceContext = { file, text, ancestors };
    const walk = (node: Node | null | undefined): void => {
      if (!node || typeof node !== 'object' || typeof (node as { type?: unknown }).type !== 'string') return;
      for (const rule of about.get(node.type) ?? []) {
        const said = rule.on[node.type]!(node, context);
        for (const one of said ? Array.isArray(said) ? said : [said] : []) {
          const site = sourceSite(source, one.node.start, `${one.to}: ${one.given}`);
          const owner = [...ancestors].reverse().find(a => a.type === 'JSXElement');
          const name = owner?.type === 'JSXElement' ? text.slice(owner.openingElement.name.start, owner.openingElement.name.end) : 'script';
          const declaration: Declaration = { prop: one.to, value: one.given, refs: [], when: [], site, owner: { kind: /^[A-Z]/.test(name) ? 'component' : 'element', name }, origin: 'inline', sourceOrigin: 'project' };
          findings.push(makeFinding({ key: `${rule.id}:${site.file}:${site.line}:${site.column}${one.kind ? `:${one.kind}` : ''}`, rule: rule.id, family: rule.id.split('/')[0]!, severity: rule.severity, sites: [site], declaration, decisions: [],
            title: one.title, because: rule.reason, action: `${one.action} The full way: npx modern-web-guidance retrieve ${rule.guide}` }));
        }
      }
      ancestors.push(node);
      for (const key of visitorKeys[node.type] ?? []) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(child)) for (const item of child) walk(item as Node);
        else walk(child as Node);
      }
      ancestors.pop();
    };
    walk(parsed.program as unknown as Node);
  }
  return findings;
}
