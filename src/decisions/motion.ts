import type { StylesheetGraph } from '../collect/stylesheets.js';
import type { CssVariable } from './css.js';

// Only single motion values in the Tailwind entry's import closure are inferred.
// Names and comments do not turn arbitrary recipes into motion decisions.
export function motionDefinitions(definitions: CssVariable[], graph: StylesheetGraph): CssVariable[] {
  const files = new Set<string>();
  function visit(file: string): void {
    if (files.has(file)) return;
    files.add(file);
    for (const edge of graph.files.get(file)?.imports ?? []) visit(edge.file);
  }
  for (const sheet of graph.files.values()) if (sheet.reached.some(reach => reach.kind === 'entry')) visit(sheet.file);
  // A theme block declares tokens; a block that also styles something is a component rule, so its variables are
  // the component's own (.card { --card-speed: 333ms; transition-duration: var(--card-speed) }), never decisions.
  const selected = new Map<string, CssVariable>();
  for (const item of definitions) {
    if (item.theme || !item.themeScope || item.styled && !item.root || item.origin !== 'project' || !files.has(item.source.file) || item.name.startsWith('--tw-')) continue;
    if (!/^(?:[-+]?(?:\d*\.)?\d+(?:ms|s)|ease(?:-in|-out|-in-out)?|linear|step-start|step-end|(?:cubic-bezier|linear|steps)\([^()]+\))$/.test(item.value)) continue;
    const previous = selected.get(item.name);
    if (!previous || previous.dynamic && !item.dynamic) selected.set(item.name, item);
  }
  return [...selected.values()];
}
