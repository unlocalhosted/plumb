import { readFile } from 'node:fs/promises';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';

/** `.name` as a CSS selector inside text: after a boundary or a bare tag (`svg.name`), not a path or property (`file.name`). */
function selects(text: string, name: string): boolean {
  const pattern = new RegExp(`(^|[^\\w.-]|(?:^|[^\\w.-])[a-z][a-z0-9]*|\\*|\\]|\\))\\.${name.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}(?![\\w-])`);
  return pattern.test(text);
}

/**
 * Classes the project's own source uses as selectors: querySelector('.x'), closest, matches, any string
 * that is a CSS selector, and the text of a JSX `<style>` or css`…` template. Such a class is a hook the
 * script (or an inline sheet plumb cannot lower) reads; having no stylesheet rule is how hooks are meant to be.
 * Only the names asked about are looked for, so a project pays for its few suspects, not for every string.
 */
export async function selectorHooks(files: readonly string[], names: ReadonlySet<string>): Promise<Set<string>> {
  const wanted = [...names].filter(name => /^-?[_a-zA-Z][\w-]*$/.test(name)), found = new Set<string>();
  if (!wanted.length) return found;
  const open = new Set(wanted);
  for (const file of files) {
    if (!open.size) break;
    if (!/\.[jt]sx?$/.test(file)) continue;
    let text: string;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    // Cheap gate: most files mention none of the suspects.
    const suspects = [...open].filter(name => text.includes(`.${name}`));
    if (!suspects.length) continue;
    let program: Node;
    try { program = parseSync(file, text).program as unknown as Node; } catch { continue; }
    const strings: string[] = [];
    const visit = (node: Node | null | undefined): void => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'Literal' && typeof (node as { value?: unknown }).value === 'string') strings.push((node as unknown as { value: string }).value);
      else if (node.type === 'TemplateElement') strings.push(((node as unknown as { value: { cooked?: string | null; raw: string } }).value.cooked ?? (node as unknown as { value: { raw: string } }).value.raw));
      else if (node.type === 'JSXText' && node.value.includes('{')) strings.push(node.value);
      for (const key of visitorKeys[node.type] ?? []) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (Array.isArray(child)) for (const item of child) visit(item as Node);
        else visit(child as Node);
      }
    };
    visit(program);
    for (const name of suspects) if (strings.some(value => value.includes(`.${name}`) && selects(value, name))) { found.add(name); open.delete(name); }
  }
  return found;
}
