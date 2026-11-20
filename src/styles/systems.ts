/**
 * STYLE SYSTEMS · the ways a project writes its look, behind one interface (docs/briefs/css-parity.md).
 *
 * Every reader and writer asks one question: where is this property of this element written, and how is a value
 * written there? The page gathers evidence (what the browser alone knows: which declaration wins, the sheet it came
 * from); a system turns evidence into an Origin (a range in a file) and a change into edits. Systems never write: they
 * return edits, and the engine commits them with one guard, one hash check per file and one undo.
 *
 * A new system (CSS modules, styled-components, vanilla-extract, a design system's props) is one more object in
 * SYSTEMS.
 */

/** What the page saw for one property of one element. Only the browser knows this; the page never decides a system. */
export interface Evidence {
  /** the winning declaration's sheet: a source file (Vite's dev id, or traced through a bundler's source map) */
  file?: string;
  /** the winning rule's selector as the browser spells it */
  selector?: string;
  /** the declarations that carry the property, its own name first, then its shorthands */
  carriers?: string[];
  /** the computed value now */
  computed?: string;
}

/** Where a property's value is written: one range in one file, said in plain words. */
export interface Origin {
  system: string;
  file: string;
  /** the value's range; for an `add`, start === end at the insertion point */
  start: number; end: number;
  value: string | null;
  /** the declaration as written spells its property this way (a shorthand when the longhand is added after it) */
  prop: string;
  hash: string;
  /** what to call it: `.title in foundations.css` */
  said: string;
  conditions: { media?: string; layer?: string; state?: string; important: boolean };
  writable: true | string;
}

/** One replacement in one file. Pure: the engine applies and guards it. */
export interface Edit { file: string; start: number; end: number; replacement: string }

/** One change, in neutral terms: a property, the value it should have, and the token it comes from when there is one. */
export interface Change { prop: string; value: string; token?: string }

export interface ReadFile { (file: string): Promise<{ text: string; hash: string }> }

export interface StyleSystem {
  id: string;
  /** what the person is told it is: "a CSS rule", "a class" */
  says: string;
  /** where this system writes `prop` given what the page saw; null when the evidence isn't this system's */
  locate(evidence: Evidence, prop: string, read: ReadFile): Promise<Origin | null>;
  /** how this system spells a token for a property (`var(--text-meta)`), or null when it has no spelling for it */
  encode(token: string, prop: string): string | null;
  /** the edits that set `origin` to `value` */
  edit(origin: Origin, change: Change): Edit[];
}
