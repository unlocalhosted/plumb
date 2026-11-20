/**
 * CLASSES · the style system for utility classes (Tailwind and its kin): a value lives in a class in a className
 * string, on the element or carried in through a prop from another file.
 *
 * The page says which class strings set the property and which classes go out and in (it reads the element's classes
 * and the variants active now); this system places each string through the engine (the element, the prop it comes in
 * by, the string itself) and returns the swap as an edit. It never writes.
 */
import type { Change, Edit, Evidence, Origin, StyleContext, StyleSystem } from './systems.js';

export const classes: StyleSystem = {
  id: 'class',
  says: 'a class',
  async locate(evidence: Evidence, _prop: string, ctx: StyleContext): Promise<Origin | null> {
    const places = evidence.classes;
    if (!places?.length) return null;
    const planned: Edit[] = [];
    let first: (Edit & { hash: string }) | null = null;
    for (const place of places) {
      const edit = await ctx.classEdit(place);
      first ??= edit;
      planned.push({ file: edit.file, start: edit.start, end: edit.end, replacement: edit.replacement, hash: edit.hash });
    }
    const name = first!.file.split(/[/\\]/).pop()!, from = places.map(p => p.from).filter(Boolean).join(' ');
    return { system: 'class', file: first!.file, start: first!.start, end: first!.end, value: from || null, prop: _prop, hash: first!.hash,
      said: `${places.length > 1 ? `${places.length} class strings` : `the class${from.includes(' ') ? 'es' : ''}`} in ${name}`, conditions: { important: false }, writable: true, planned };
  },
  encode(token: string): string | null { return token; },
  edit(origin: Origin, _change: Change): Edit[] { return origin.planned ?? []; },
};
