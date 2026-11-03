import type { Declaration, Decision, Finding, Report, Site } from './report.js';
import { oklab } from './rules/families.js';

/**
 * Causes: findings grouped by what the author meant, across rules.
 *
 * A finding is one rule's complaint about one spelling (`bg-white` renders nothing, `bg-[#ffffff]` copies a theme
 * value, `text-[#ffffff]` is the same copy again). A cause is the decision behind them: white, written three ways.
 * This is the one place that grouping is done. The CLI's `--json`, the session server's `causes` method and anything
 * built on them (the project page, the overlay's panel) read it; none of them groups findings itself.
 *
 * Today a cause is a resolved value (white, 15px, a box-shadow). A component or a scale step as a cause comes later
 * and will reuse `places` and `fixes` unchanged.
 */
export interface CausePlace {
  file: string;
  line: number;
  column: number;
  /** What is written there: `bg-white`, `text-[#ffffff]`, `color: '#ffffffb0'`. */
  text: string;
  /** The rule that found this spelling. */
  rule: string;
  /** The value as the author spelled it: `white`, `#ffffff`, `15px`. */
  spelling: string;
  /** True when the browser applies nothing here (a class Tailwind generates no CSS for). */
  rendersNothing: boolean;
  /** What the text becomes when the cause's suggestion is taken, when that can be said without guessing. */
  to?: string;
  ledger?: Site['ledger'];
}

export interface CauseSuggestion {
  /** The theme variable: `--color-on-accent`. */
  token: string;
  /** The name an author says: `on-accent`. */
  name: string;
  /** The token's value is this cause's value, not merely near it. */
  exact: boolean;
  /** Other theme variables that resolve to the same value. */
  alternatives: string[];
}

/** One request the session's `apply-all` takes (`swaps: [{ cause }]`): every place with this text under this rule moves to `choice`. */
export interface CauseFix { rule: string; text: string; choice: string }

export interface Cause {
  /** Stable across runs while the value is the same: `value:color:white`. */
  id: string;
  kind: 'value';
  family: string;
  /** Canonical form of the value, the same for every spelling: `#ffffff`. */
  value: string;
  /** What an author calls it: `white`, `white at 15%`, `15px`. */
  label: string;
  /** Places, in file order. `places.length` is the number to say. */
  places: CausePlace[];
  count: number;
  /** How many of `places` render nothing. */
  rendersNothing: number;
  /** The ways it was written, most used first: `white` ×16, `#ffffff` ×23. */
  spellings: { text: string; count: number }[];
  /** The rules whose findings this cause gathers. */
  rules: string[];
  /** What new / recorded-as-debt / excepted places there are, by the ledger. */
  status: { new: number; debt: number; exception: number };
  suggestion?: CauseSuggestion;
  /** The requests that move places to the suggestion at once; only places where the move says exactly the same thing (a dead class, a copy of the variable's value). */
  fixes: CauseFix[];
}

const colourUtility = /^((?:[\w-]+:)*)!?((?:bg|text|fill|stroke|accent|caret|decoration|placeholder|from|via|to|shadow|ring|ring-offset|outline|divide|border(?:-[xytrblse])?))-(white|black)(?:\/(\d{1,3}))?$/;
const place = (site: { file: string; line: number; column: number }) => `${site.file}:${site.line}:${site.column}`;
const round = (n: number) => Math.round(n * 1000) / 1000;
const hex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0');

/** The canonical value of a colour, or undefined when it is not one flat colour (a gradient, a mix, a variable). */
function colour(value: string | undefined): { key: string; hex: string; alpha: number } | undefined {
  if (!value) return;
  const lab = oklab(value);
  if (!lab) return;
  // Back to sRGB through the same matrices Plumber judges by, so `#fff`, `white` and `oklch(100% 0 0)` meet.
  const [l, a, b, alpha] = lab;
  const l_ = (l + .3963377774 * a + .2158037573 * b) ** 3, m_ = (l - .1055613458 * a - .0638541728 * b) ** 3, s_ = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l_ - 3.3077115913 * m_ + .2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - .3413193965 * s_, -.0041960863 * l_ - .7034186147 * m_ + 1.707614701 * s_];
  const gamma = (v: number) => v <= .0031308 ? 12.92 * v : 1.055 * Math.abs(v) ** (1 / 2.4) - .055;
  const text = `#${lin.map(v => hex(gamma(v))).join('')}`;
  const alphaPct = Math.round(alpha * 100);
  return { key: alphaPct === 100 ? text : `${text}/${alphaPct}`, hex: text, alpha: alphaPct };
}

/** A class that names white or black (`bg-white`, `focus-visible:ring-white/50`) as the colour the author meant. */
function namedColour(text: string): { word: string; alpha: number; head: string; utility: string } | undefined {
  const match = colourUtility.exec(text);
  return match ? { word: match[3]!, alpha: match[4] === undefined ? 100 : Number(match[4]), head: match[1]!, utility: match[2]! } : undefined;
}

const dimension = (declaration: Declaration) => declaration.prop === 'font-size' || declaration.prop === 'line-height' || declaration.prop === 'font-weight' || declaration.prop === 'letter-spacing' ? declaration.prop : '';
/** One number with its unit (`15px`, `0.9375rem` is the same 15px, `500`, `0.1em`); anything built from several parts or code is not one value. */
function amount(value: string): string | undefined {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)?$/.exec(value.replace(/\s*!important\s*$/i, '').trim().toLowerCase());
  if (!match) return;
  const n = Number(match[1]);
  return match[2] === 'rem' ? `${round(n * 16)}px` : `${round(n)}${match[2] ?? ''}`;
}
const short = (name: string) => name.replace(/^--(?:color|spacing|radius|text|font-weight|shadow|ease|duration|z|leading|tracking|font|animate)-/, '').replace(/^--/, '');

/**
 * How the author wrote the value, without the utility around it: `white`, `#ffffff`, `0.9375rem`. A class that isn't
 * a literal keeps its name (`font-medium`); a value that comes from code (a variable, a ternary) is `in code`.
 */
function spellingOf(text: string, declaration: Declaration): string {
  const named = namedColour(text);
  if (named) return named.alpha === 100 ? named.word : `${named.word}/${named.alpha}`;
  const literal = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value) ? value.toLowerCase() : value;
  if (declaration.origin === 'class') return text;
  const bracket = /\[([^\]]+)\](?:\/\d+)?$/.exec(text)?.[1];
  if (bracket && declaration.origin === 'arbitrary') return literal(bracket.replaceAll('_', ' '));
  const authored = (/^\s*[\w$'"-]+\s*:\s*([\s\S]*)$/.exec(text)?.[1] ?? '').replace(/;\s*$/, '').trim();
  const quoted = /^(['"`])([^'"`$\s,]*)\1$/.exec(authored)?.[2];
  if (quoted !== undefined) return literal(quoted);
  if (/^-?[\d.]+(?:px|rem|em|%)?$/.test(authored) || /^#[0-9a-f]{3,8}$/i.test(authored)) return literal(authored);
  return 'in code';
}

interface Raw { family: string; id: string; value: string; label: string; place: CausePlace; token?: string; finding?: Finding }

/** Every place a finding puts a value on, one `Raw` per (place, value). */
function gather(report: Report): Raw[] {
  const raw: Raw[] = [];
  const seen = new Set<string>();
  const add = (entry: Raw) => {
    const key = `${entry.id}|${place(entry.place)}|${entry.place.text}`;
    if (!seen.has(key)) { seen.add(key); raw.push(entry); }
  };
  for (const finding of report.findings) {
    if (finding.rule === 'existence/dead-class') {
      // The class names a colour the theme doesn't define. What the author meant is that colour.
      for (const site of finding.sites) {
        const named = namedColour(site.text);
        if (!named) continue;
        const value = colour(named.word)!;
        const key = named.alpha === 100 ? value.key : `${value.hex}/${named.alpha}`;
        add({ family: 'color', id: `value:color:${key}`, value: key, label: labelOf(value.hex, named.alpha), place: { file: site.file, line: site.line, column: site.column, text: site.text, rule: finding.rule, spelling: spellingOf(site.text, finding.declaration), rendersNothing: true, ...(site.ledger ? { ledger: site.ledger } : {}) } });
      }
      continue;
    }
    // A provenance finding is a styling value the author chose that isn't their theme's; `opaque-inline` is a value nobody can read.
    if (!finding.rule.startsWith('provenance/') || finding.rule === 'provenance/opaque-inline' || finding.family === 'existence') continue;
    const declarations = finding.occurrences?.length ? finding.occurrences : [finding.declaration];
    const sites = new Set(finding.sites.map(place));
    const edits = new Map((finding.edits ?? []).map(edit => [place(edit.site), edit]));
    for (const declaration of declarations) {
      if (declaration.opaque || !sites.has(place(declaration.site))) continue;
      const resolved = declaration.resolved ?? declaration.value;
      let id: string, value: string, label: string;
      if (finding.family === 'color') {
        const flat = colour(resolved);
        if (!flat) continue;
        id = `value:color:${flat.key}`; value = flat.key; label = labelOf(flat.hex, flat.alpha);
      } else {
        const flat = amount(resolved);
        if (flat === undefined) continue;
        const part = dimension(declaration);
        id = `value:${finding.family}${part ? `:${part}` : ''}:${flat}`; value = flat; label = flat;
      }
      const edit = edits.get(place(declaration.site));
      add({ family: finding.family, id, value, label, place: { file: declaration.site.file, line: declaration.site.line, column: declaration.site.column, text: declaration.site.text, rule: finding.rule, spelling: spellingOf(declaration.site.text, declaration), rendersNothing: false, ...(declaration.site.ledger ? { ledger: declaration.site.ledger } : {}) },
        ...(edit?.token ? { token: edit.token } : {}), finding });
    }
  }
  return raw;
}
function labelOf(hexValue: string, alpha: number): string {
  const name = hexValue === '#ffffff' ? 'white' : hexValue === '#000000' ? 'black' : hexValue;
  return alpha === 100 ? name : `${name} at ${alpha}%`;
}

/** Theme variables whose own value is this colour. */
function exactTokens(report: Report, key: string): Decision[] {
  const found: Decision[] = [];
  for (const decision of [...report.decisions, ...report.decisionInventory ?? []]) {
    if (decision.family !== 'color' || decision.origin !== 'project' || found.some(d => d.name === decision.name)) continue;
    if (colour(decision.resolved ?? decision.value)?.key === key) found.push(decision);
  }
  return found;
}

export function causesOf(report: Report): Cause[] {
  const groups = new Map<string, Raw[]>();
  for (const entry of gather(report)) groups.set(entry.id, [...groups.get(entry.id) ?? [], entry]);
  const causes: Cause[] = [];
  for (const [id, entries] of groups) {
    const first = entries[0]!;
    // Two ways of writing one value is already a cause worth saying once; a lone finding stays a finding, except when
    // it renders nothing or a rule found several places.
    const places = entries.map(entry => entry.place)
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
    const spellings = new Map<string, number>();
    for (const p of places) spellings.set(p.spelling, (spellings.get(p.spelling) ?? 0) + 1);
    const status = { new: 0, debt: 0, exception: 0 };
    for (const p of places) status[p.ledger?.status ?? 'new']++;
    const cause: Cause = {
      id, kind: 'value', family: first.family, value: first.value, label: first.label,
      places, count: places.length, rendersNothing: places.filter(p => p.rendersNothing).length,
      spellings: [...spellings].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)),
      rules: [...new Set(places.map(p => p.rule))].sort(), status, fixes: [],
    };
    if (first.family === 'color') suggestColour(report, cause, entries);
    else suggestNearest(cause, entries);
    causes.push(cause);
  }
  return causes.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

/** A colour has a right answer when the theme already names it: the variable the by-value findings point at, else the first that matches. */
function suggestColour(report: Report, cause: Cause, entries: Raw[]): void {
  let exact = exactTokens(report, cause.value), alpha = false;
  if (!exact.length) {
    // white at 15% has no variable of its own; the variable for white with an opacity modifier says it exactly on a class
    const base = /^(#[0-9a-f]{6})\/\d+$/.exec(cause.value)?.[1];
    if (base) { exact = exactTokens(report, base); alpha = true; }
  }
  if (!exact.length) return;
  const votes = new Map<string, number>();
  for (const entry of entries) if (entry.token) votes.set(entry.token, (votes.get(entry.token) ?? 0) + 1);
  const chosen = [...exact].sort((a, b) => (votes.get(b.name) ?? 0) - (votes.get(a.name) ?? 0))[0]!;
  const name = short(chosen.name);
  cause.suggestion = { token: chosen.name, name, exact: !alpha, alternatives: exact.filter(d => d !== chosen).map(d => d.name) };
  const fixes = new Map<string, CauseFix>();
  for (const entry of entries) {
    const p = entry.place;
    if (p.rendersNothing) {
      const named = namedColour(p.text)!;
      p.to = `${named.head}${named.utility}-${name}${named.alpha === 100 ? '' : `/${named.alpha}`}`;
      fixes.set(`${p.rule}\0${p.text}`, { rule: p.rule, text: p.text, choice: p.to });
    } else if (!alpha && entry.token === chosen.name) {
      const to = /^[^[]*\[[^\]]*\]/.test(p.text) ? p.text.replace(/\[[^\]]*\](?:\/\d+)?$/, name) : undefined;
      if (to) p.to = to;
      fixes.set(`${p.rule}\0${p.text}`, { rule: p.rule, text: p.text, choice: chosen.name });
    }
  }
  cause.fixes = [...fixes.values()];
}

/** Other families: the theme step the findings that make this cause name as closest, the one most of its places agree on. Not exact, so nothing here is applied automatically. */
function suggestNearest(cause: Cause, entries: Raw[]): void {
  const votes = new Map<string, { decision: Decision; n: number; others: Set<string> }>();
  for (const entry of entries) {
    const choices = entry.finding?.choices ?? [];
    const near = choices[0];
    if (!near || near.family !== cause.family) continue;
    const vote = votes.get(near.name) ?? { decision: near, n: 0, others: new Set() };
    vote.n++; for (const other of choices.slice(1)) vote.others.add(other.name);
    votes.set(near.name, vote);
  }
  const best = [...votes.values()].sort((a, b) => b.n - a.n || a.decision.name.localeCompare(b.decision.name))[0];
  if (best) cause.suggestion = { token: best.decision.name, name: short(best.decision.name), exact: false, alternatives: [...best.others] };
}
