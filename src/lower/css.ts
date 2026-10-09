import { transform } from 'lightningcss';
import type { Rule, Selector, StyleSheet, DeclarationBlock } from 'lightningcss';
import type { Condition } from '../report.js';
import { cssCode, maskImports } from '../collect/stylesheets.js';

export interface LoweredDeclaration { prop: string; value: string; when: Condition[]; decisionRefs?: string[] }
export interface CandidateCss { css: string | null; declarations: LoweredDeclaration[]; notes: string[]; authoredValue?: boolean }

export function parseCss(css: string, filename: string): StyleSheet {
  let ast: StyleSheet | undefined;
  transform({ filename, code: Buffer.from(css), visitor: { StyleSheet(value) { ast = value; } } });
  return ast!;
}
function print(rules: Rule[]): string {
  // lightningcss emits absent optional fields as null, but its return visitor
  // deserializer expects them omitted (notably var()'s Specifier.from).
  function omitNull(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(omitNull);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null).map(([key, item]) => [key, omitNull(item)]));
    return value;
  }
  const printable = omitNull(rules) as Rule[];
  return transform({ filename: 'plumb.css', code: Buffer.from(''), visitor: {
    StyleSheet(sheet) { return { ...sheet, rules: printable }; },
  } }).code.toString();
}
const sentinel = parseCss('.plumb { --plumb: 0; }', 'plumb.css').rules[0]!;
export function selectorText(selector: Selector): string {
  if (sentinel.type !== 'style') throw new Error('Expected style rule');
  // Lightning CSS 1.33 serializes this pseudo's `type: string[]` payload
  // over the selector-component discriminator. It cannot round-trip its own
  // AST. Print that component directly, using Lightning for all other parts.
  const collision = selector.findIndex(component => (component as unknown as { kind?: string }).kind === 'active-view-transition-type');
  if (collision !== -1) {
    const component = selector[collision] as unknown as { type: string[] };
    const part = (items: Selector) => items.length ? selectorText(items) : '';
    return `${part(selector.slice(0, collision))}:active-view-transition-type(${component.type.join(', ')})${part(selector.slice(collision + 1))}`;
  }
  const css = print([{ ...sentinel, value: { ...sentinel.value, selectors: [selector] } }]);
  return css.slice(0, cssCode(css).indexOf('{')).trim();
}
// Keep declaration values as authored by Tailwind. Returning lightningcss's
// parsed declaration AST through a JS visitor cannot round-trip infinity
// (rounded-full), so use its rule locations and validated declaration counts.
function declarationText(block: DeclarationBlock, css: string, loc: { line: number; column: number }, nested: boolean): { prop: string; value: string }[] {
  const lines = css.split('\n');
  let offset = lines.slice(0, loc.line).reduce((count, line) => count + line.length + 1, 0) + loc.column - 1;
  if (!nested) {
    let quote = '';
    while (offset < css.length) {
      const char = css[offset++]!;
      if (char === '\\') { offset++; continue; }
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '{') break;
    }
  }
  const count = (block.declarations?.length ?? 0) + (block.importantDeclarations?.length ?? 0);
  const declarations: { prop: string; value: string }[] = [];
  let start = offset;
  let quote = '';
  let parens = 0;
  for (; offset < css.length && declarations.length < count; offset++) {
    const char = css[offset]!;
    if (char === '\\') { offset++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '/' && css[offset + 1] === '*') { offset = css.indexOf('*/', offset + 2) + 1; continue; }
    if (char === '(' || char === '[') parens++;
    if (char === ')' || char === ']') parens--;
    if (parens === 0 && (char === '{' || char === '}')) break;
    if (parens === 0 && char === ';') {
      const text = css.slice(start, offset).replace(/^(?:\s|\/\*[\s\S]*?\*\/)+/, '').trim();
      const match = /^([-\w]+):\s*([\s\S]*)$/.exec(text);
      if (match) declarations.push({ prop: match[1]!, value: match[2]! });
      start = offset + 1;
    }
  }
  if (declarations.length !== count) throw new Error('Could not recover validated declarations from compiler CSS');
  return declarations;
}
export function atRuleText(rule: Rule): string {
  if (rule.type === 'media' || rule.type === 'supports' || rule.type === 'container') {
    const css = print([{ ...rule, value: { ...rule.value, rules: [sentinel] } } as Rule]);
    return css.slice(0, cssCode(css).indexOf('{')).trim().replace(/^@\w+\s*/, '');
  }
  return '';
}
export function pseudos(selector: Selector): string[] {
  return selector.flatMap(component => {
    if (component.type === 'pseudo-class' || component.type === 'pseudo-element') return [selectorText([component])];
    return [];
  });
}

export function lowerCss(css: string | null): CandidateCss {
  if (!css) return { css, declarations: [], notes: [] };
  const declarations: LoweredDeclaration[] = [];
  const ast = parseCss(css, 'candidate.css');
  const defaults = new Map<string, string>();
  for (const rule of ast.rules) if (rule.type === 'property') {
    const printed = print([rule]);
    const initial = /initial-value:\s*([^;]+);/.exec(printed)?.[1];
    if (initial) defaults.set(rule.value.name, initial.replace(/#0000\b/g, 'transparent'));
  }
  const notes = new Set<string>();
  function block(value: DeclarationBlock, when: Condition[], loc: { line: number; column: number }, nested = false): void {
    const raw = declarationText(value, css!, loc, nested);
    const variables = new Map([...defaults, ...raw.filter(item => item.prop.startsWith('--tw-')).map(item => [item.prop, item.value.replace(/\s*!important$/, '')] as const)]);
    const lowered = raw.filter(item => !item.prop.startsWith('--tw-')).map(item => {
      let value = item.value;
      for (let hop = 0; hop < variables.size + 1; hop++) {
        const next = value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|var\((--tw-[\w-]+)(?:,\s*([^()]*))?\)/g, (raw: string, key: string | undefined) => key ? variables.get(key) ?? raw : raw);
        if (next === value) break;
        value = next;
      }
      return { ...item, value, when };
    });
    const rawNeeded = raw.some(item => item.prop.startsWith('--tw-')) && (lowered.length === 0 || lowered.some(item => /var\(--tw-/.test(item.value)));
    if (rawNeeded) {
      notes.add('Kept --tw-* assignments: not all reads can be folded within the same rule.');
      declarations.push(...raw.filter(item => item.prop.startsWith('--tw-')).map(item => ({ ...item, when })), ...lowered);
    } else declarations.push(...lowered);
  }
  function walk(rules: Rule[], when: Condition[], parents: string[]): void {
    for (const rule of rules) {
      if (rule.type === 'style') {
        const selectors = rule.value.selectors.flatMap(selector => {
          const authored = selectorText(selector);
          if (!parents.length) return [authored];
          return parents.map(parent => authored.includes('&') ? authored.replaceAll('&', parent) : `${parent} ${authored}`);
        });
        const conditions: Condition[] = [...when.filter(item => item.kind !== 'selector'),
          { kind: 'selector', text: selectors.join(', ') },
          ...rule.value.selectors.flatMap(pseudos).map(text => ({ kind: 'pseudo' as const, text }))];
        if (rule.value.declarations) block(rule.value.declarations, conditions, rule.value.loc);
        walk(rule.value.rules ?? [], conditions, selectors);
      } else if (rule.type === 'nested-declarations') block(rule.value.declarations, when, rule.value.loc, true);
      else if (rule.type === 'media' || rule.type === 'supports' || rule.type === 'container') {
        walk(rule.value.rules, [...when, { kind: rule.type, text: atRuleText(rule) }], parents);
      } else if (rule.type === 'layer-block') walk(rule.value.rules, [...when, { kind: 'layer', text: rule.value.name?.join('.') ?? '(anonymous)' }], parents);
      // @property and keyframes are compiler infrastructure, not declarations
      // applied to the class's element.
    }
  }
  walk(ast.rules, [], []);
  return { css, declarations, notes: [...notes] };
}

export function declaredClasses(css: string, filename: string): { classes: Set<string>; warnings: string[] } {
  const classes = new Set<string>();
  // Imports declare no selectors. Removing them permits Tailwind's valid
  // preprocessor ordering (e.g. imports following @theme).
  const selectorsOnly = maskImports(css);
  const result = transform({ filename, code: Buffer.from(selectorsOnly), errorRecovery: true, visitor: {
    Rule: { style(rule) {
      function visit(value: unknown): void {
        if (Array.isArray(value)) { for (const item of value) visit(item); }
        else if (value && typeof value === 'object') {
          const record = value as Record<string, unknown>;
          if (record.type === 'class' && typeof record.name === 'string') classes.add(record.name);
          for (const item of Object.values(record)) visit(item);
        }
      }
      visit(rule.value.selectors);
    } },
  } });
  return { classes, warnings: [...new Set(result.warnings.map(warning => warning.message).filter(message => !/^Unknown at rule: @(theme|utility|apply|reference|source|custom-variant|variant|config|plugin|tailwind)$/.test(message)))] };
}
