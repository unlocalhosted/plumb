// The LibraryAdapter contract: what plumb understands of one component library, as capabilities. Every consumer
// (analysis, locate, readiness, doctor) reads a library through this contract; none branches on a library's name.
// A library's support level is derived from the capabilities its adapter implements and that ran (support.ts).
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import type { Context } from '../detector.js';
import type { Evidence } from '../facts.js';
import type { Role } from '../../structure/library.js';

/**
 * `usage`: every primitive and part the app renders, each site. `states`: styles applied per library state are
 * judged for that state. `structure`: elements through portals, slots and render props locate to the user's JSX.
 * `owned`: the library's own variables and defaults are never drift. `system`: the generated components are the
 * design system (shadcn).
 */
export type Capability = 'usage' | 'states' | 'structure' | 'owned' | 'system';
export const capabilityWords: Record<Capability, string> = {
  usage: 'usage (every primitive, part and site)',
  states: 'states',
  structure: 'structure (portals, slots, render props)',
  owned: 'owned values (its own variables and providers)',
  system: 'the design system (components.json, components/ui)',
};

/** One rendered element of the library: `Slider.Thumb` at a file:line. `portal`: rendered elsewhere in the DOM; `render`: the user's element replaces the library's. */
export interface UsageSite extends Evidence { component: string; part: string | null; structure?: 'portal' | 'render' | 'provider' }
export interface Usage {
  /** Files that render at least one of the library's elements. */
  files: number;
  /** Files per component, most used first: `{ Slider: 3, Checkbox: 3 }`. */
  components: Record<string, number>;
  sites: UsageSite[];
}

/** What an import of `source` binds: the component it stands for, or null when the module is not this library's. */
export interface ImportMeaning { component: string | null; part: string | null }

export interface LibraryAdapter {
  /** The family id this adapter serves (libraries/index.ts). */
  family: string;
  /** The capabilities this adapter implements. Support is derived from this list, never written. */
  capabilities: readonly Capability[];
  /** Whether `specifier` is one of this library's modules. `ctx` is there when a detector asks (shadcn reads its aliases). */
  owns(specifier: string, ctx?: Context): boolean;
  /** What importing `imported` (`*`, `default` or a name) from `specifier` stands for. */
  meaning(specifier: string, imported: string, ctx?: Context): ImportMeaning;
  /**
   * `states`: the state an attribute of the library names, as a finding says it: `data-checked` → `checked`,
   * `data-state="open"` → `open`, `data-orientation="horizontal"` → `orientation=horizontal`; null when the attribute
   * is not a state of this library. A `className={(state) => …}` function asks with `data-<key>` for `state.<key>`.
   */
  state?(attribute: string, value: string | null): string | null;
  /**
   * `structure`: how the library places and replaces elements. `portal`: the parts rendered elsewhere in the DOM
   * (under body). `render`: the props whose element or function replaces the library's element (`render`,
   * `asChild`), so the user's JSX is the one to locate. `role`: what a component is, for the craft rules.
   */
  structure?: { portal: RegExp; render: readonly string[]; role(component: string, part: string | null): Role | null };
  /**
   * `owned`: what is the library's, never drift. `variables`: the CSS variables it sets at runtime (`--anchor-width`),
   * so reading one is not a dead variable. `providers`: the components and parts that configure it (`Tooltip.Provider`,
   * `DirectionProvider`), shown in the usage map, with nothing to judge on them.
   */
  owned?: { variables: RegExp; providers: RegExp };
}

/** The outcome of running one capability: it ran, or it could not (a parse failure, an unknown shape), with why. */
export type CapabilityRun = 'judged' | 'unknown';

const pascal = (text: string) => text.split(/[-_]/).filter(Boolean).map(part => part[0]!.toUpperCase() + part.slice(1)).join('');
export const componentName = pascal;
/** `PopoverContent` imported for component `Popover` is the part `Content`; `Popover` itself is the root. */
export function partOf(imported: string, component: string, root: string | null = 'Root'): string | null {
  if (imported === component) return root;
  return imported.startsWith(component) && /^[A-Z]/.test(imported.slice(component.length)) ? imported.slice(component.length) : imported;
}

const nameOf = (node: Node): string[] | null => {
  if (node.type === 'JSXIdentifier') return [node.name];
  if (node.type === 'JSXMemberExpression') { const object = nameOf(node.object); return object ? [...object, node.property.name] : null; }
  return null;
};

/**
 * Every element the app renders from the adapter's library, by walking the JSX of each source file that imports it.
 * Never throws: a file that will not parse is named in `unknown`, the rest is still counted.
 */
export function collectUsage(adapter: LibraryAdapter, ctx: Context): { usage: Usage; unknown: Evidence[] } {
  const sites: UsageSite[] = [], unknown: Evidence[] = [], perComponent = new Map<string, Set<string>>(), files = new Set<string>();
  for (const file of ctx.sourceFiles ?? []) {
    const text = ctx.read(file);
    if (typeof text !== 'string' || !/\.[jt]sx$/.test(file) && !text.includes('<')) continue;
    // A quick textual gate: only files that name one of the library's modules are parsed.
    const named = [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]!);
    if (!named.some(id => adapter.owns(id, ctx))) continue;
    let program: Node;
    try {
      const parsed = parseSync(file, text);
      if (parsed.errors.length) throw new Error(parsed.errors[0]?.message ?? 'parse error');
      program = parsed.program;
    } catch (error) { unknown.push(ctx.evidence(file, 1, `could not parse: ${String((error as Error).message ?? error).split('\n')[0]}`)); continue; }
    const starts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
    const lineOf = (offset: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid]! <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };
    const bound = new Map<string, ImportMeaning & { namespace: boolean }>();
    const walk = (node: Node): void => {
      if (node.type === 'ImportDeclaration') {
        const source = String(node.source.value);
        if (adapter.owns(source, ctx)) for (const item of node.specifiers) {
          const imported = item.type === 'ImportSpecifier' ? (item.imported.type === 'Identifier' ? item.imported.name : String(item.imported.value)) : item.type === 'ImportNamespaceSpecifier' ? '*' : 'default';
          const meaning = adapter.meaning(source, imported, ctx);
          if (meaning.component || imported === '*') bound.set(item.local.name, { ...meaning, namespace: imported === '*' });
        }
        return;
      }
      if (node.type === 'JSXOpeningElement') {
        const parts = nameOf(node.name), head = parts && bound.get(parts[0]!);
        if (parts && head) {
          // `Popover.Content` on a namespace import names the part; on a named import the part is already known.
          let component = head.component, part = head.part;
          const rest = parts.slice(1);
          if (head.namespace && !component) { component = rest[0] ? componentName(rest[0]) : null; part = rest.slice(1).join('.') || null; }
          else if (rest.length) part = [part, ...rest].filter(Boolean).join('.');
          if (component) {
            const line = lineOf(node.start);
            const structure = adapter.owned?.providers.test(part ? `${component}.${part}` : component) ? 'provider' as const
              : adapter.structure && (part && adapter.structure.portal.test(part) ? 'portal' as const : node.attributes.some(item => item.type === 'JSXAttribute' && item.name.type === 'JSXIdentifier' && adapter.structure!.render.includes(item.name.name)) ? 'render' as const : undefined);
            sites.push({ file: ctx.file(file), line, text: text.slice(starts[line - 1], text.indexOf('\n', node.start) === -1 ? undefined : text.indexOf('\n', node.start)).trim().slice(0, 80), component, part, ...(structure ? { structure } : {}) });
            files.add(file);
            (perComponent.get(component) ?? perComponent.set(component, new Set()).get(component)!).add(file);
          }
        }
      }
      const record = node as unknown as Record<string, unknown>;
      for (const key of visitorKeys[node.type] ?? []) {
        const value = record[key];
        for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object') walk(child as Node);
      }
    };
    walk(program);
  }
  const components = Object.fromEntries([...perComponent].map(([component, set]) => [component, set.size] as const).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
  return { usage: { files: files.size, components, sites }, unknown };
}

/** The doctor line: `9 files · Slider 3, Checkbox 3, Popover 2, Tabs 1, Switch 1`. */
export function describeUsage(usage: Usage): string {
  const parts = Object.entries(usage.components).map(([component, files]) => `${component} ${files}`);
  return `${usage.files} file${usage.files === 1 ? '' : 's'}${parts.length ? ` · ${parts.join(', ')}` : ''}`;
}
