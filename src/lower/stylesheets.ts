import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Rule, Selector } from 'lightningcss';
import type { DecodedSourceMap } from 'tailwindcss';
import type { Condition, Declaration, Site } from '../report.js';
import { tool } from '../report.js';
import type { StylesheetGraph } from '../collect/stylesheets.js';
import { cssCode, maskImports, packageName, resolveStylesheet } from '../collect/stylesheets.js';
import type { EmbeddedStylesheet } from '../collect/inline.js';
import { lineStarts, references, sourceSite } from '../collect/source.js';
import { errorMessage, UsageError } from '../errors.js';
import { atRuleText, declaredClasses, parseCss, pseudos, selectorText } from './css.js';
import { lowerTailwind, tailwindGraph } from './tailwind.js';

interface RawDeclaration { prop: string; value: string; offset: number; text: string }
interface LoweredStylesheets { declarations: Declaration[]; classes: string[]; notes: string[] }
const features = /@(?:apply|utility|custom-variant|variant|theme|reference|config|plugin|tailwind)\b|(?:--theme|theme)\s*\(/;
const usesTailwind = (css: string) => features.test(cssCode(css));

function delimiter(css: string, start: number, target: '{' | '}'): number {
  let quote = '', depth = 0;
  for (let index = start; index < css.length; index++) {
    const char = css[index];
    if (char === '\\') { index++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '/' && css[index + 1] === '*') { index = css.indexOf('*/', index + 2) + 1; continue; }
    if (char === '{') { if (target === '{' && !depth) return index; depth++; }
    if (char === '}') { if (target === '}' && !depth) return index; depth--; }
  }
  return css.length;
}

// Read only the leading declaration run identified by Lightning CSS. Its
// declaration AST lacks property locations and normalizes values. Keep authored
// values/positions, including the final declaration without a semicolon.
function declarationsAt(css: string, offset: number, nested: boolean, limit = Infinity): RawDeclaration[] {
  if (!nested) offset = delimiter(css, offset, '{') + 1;
  const declarations: RawDeclaration[] = [];
  let start = offset, depth = 0, braces = 0, quote = '';
  function emit(end: number): void {
    const raw = css.slice(start, end);
    const prefix = /^(?:\s|\/\*[\s\S]*?\*\/)+/.exec(raw)?.[0].length ?? 0;
    const text = raw.slice(prefix).trim();
    const match = /^(--[\w-]+|[-\w]+)\s*:\s*([\s\S]*)$/.exec(text);
    if (match) declarations.push({ prop: match[1]!, value: match[2]!, offset: start + prefix, text });
  }
  for (; offset < css.length; offset++) {
    const char = css[offset]!;
    if (char === '\\') { offset++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '/' && css[offset + 1] === '*') { const end = css.indexOf('*/', offset + 2); offset = end < 0 ? css.length : end + 1; continue; }
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (char === '{') {
      if (braces || /^\s*--[\w-]+\s*:/.test(cssCode(css.slice(start, offset)))) { depth++; braces++; continue; }
      if (depth === 0) break;
    }
    if (char === '}' && braces) { braces--; depth--; continue; }
    if (depth === 0 && char === '}') { emit(offset); break; }
    if (depth === 0 && char === ';') { emit(offset); start = offset + 1; if (declarations.length >= limit) break; }
  }
  return declarations;
}

function selectorConditions(selector: string): Condition[] {
  const rule = parseCss(`${selector} {}`, 'selector.css').rules[0];
  if (rule?.type !== 'style') return [{ kind: 'selector', text: selector }];
  function positive(selector: Selector): string[] {
    return selector.flatMap(component => {
      if (component.type !== 'pseudo-class') return component.type === 'pseudo-element' ? pseudos([component]) : [];
      const children = (component as unknown as { selectors?: Selector[] }).selectors;
      return [...pseudos([component]), ...(component.kind !== 'not' && children ? children.flatMap(positive) : [])];
    });
  }
  return [{ kind: 'selector', text: selector }, ...[...new Set(rule.value.selectors.flatMap(positive))].map(text => ({ kind: 'pseudo' as const, text }))];
}

export function lowerStylesheet(css: string, filename: string, locate?: (offset: number, raw: RawDeclaration) => { site: Site; origin?: Declaration['origin']; authoredCss?: string }, initial: Condition[] = []): Declaration[] {
  const source = { file: filename, text: css, lineStarts: lineStarts(css) };
  const declarations: Declaration[] = [];
  const offset = (loc: { line: number; column: number }) => source.lineStarts[loc.line]! + loc.column - 1;
  function block(start: number, nested: boolean, when: Condition[], origin: Declaration['origin'] = 'stylesheet'): void {
    for (const raw of declarationsAt(css, start, nested)) {
      const mapped = locate?.(raw.offset, raw);
      const site = mapped?.site ?? sourceSite(source, raw.offset, raw.text);
      const owner = when.find(condition => condition.kind === 'selector')?.text ?? filename;
      const pkg = packageName(site.file);
      declarations.push({ prop: raw.prop, value: raw.value, refs: references(raw.value), when, site: { ...site, anchor: owner === filename ? site.anchor ?? '<module>' : owner },
        ...(mapped?.authoredCss ? { authoredCss: mapped.authoredCss } : {}),
        owner: { kind: 'element', name: owner },
        origin: origin === 'keyframes' ? origin : raw.prop.startsWith('--') ? 'custom-property' : mapped?.origin ?? origin,
        sourceOrigin: pkg ? 'framework' : 'project', ...(pkg ? { package: pkg } : {}) });
    }
  }
  function walk(rules: Rule[], when: Condition[], parent: string | null): void {
    for (const rule of rules) {
      if (rule.type === 'style') {
        for (const selector of rule.value.selectors) {
          const authored = selectorText(selector);
          const code = cssCode(authored);
          let hasNesting = false;
          const expanded = authored.replace(/\\.|&/g, (part, index: number) => {
            if (part !== '&' || code[index] !== '&') return part;
            hasNesting = true;
            return parent ?? part;
          });
          const resolved = parent ? hasNesting ? expanded : `${parent} ${authored}` : authored;
          const conditions = [...when.filter(item => item.kind !== 'selector' && item.kind !== 'pseudo'), ...selectorConditions(resolved)];
          block(offset(rule.value.loc), false, conditions);
          walk(rule.value.rules ?? [], conditions, resolved);
        }
      } else if (rule.type === 'nested-declarations') block(offset(rule.value.loc), true, when);
      else if (rule.type === 'media' || rule.type === 'supports' || rule.type === 'container') walk(rule.value.rules, [...when, { kind: rule.type, text: atRuleText(rule) }], parent);
      else if (rule.type === 'layer-block') walk(rule.value.rules, [...when, { kind: 'layer', text: rule.value.name?.join('.') ?? '(anonymous)' }], parent);
      else if (rule.type === 'keyframes') {
        // Lightning validates frames but provides no per-frame locations.
        // Recover the already validated frames from their source block.
        let start = delimiter(css, offset(rule.value.loc), '{') + 1;
        for (let index = 0; index < rule.value.keyframes.length; index++) {
          const open = delimiter(css, start, '{');
          const close = delimiter(css, open + 1, '}');
          const name = rule.value.name.value;
          const selector = css.slice(start, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
          block(open + 1, true, [...when, { kind: 'selector', text: `@keyframes ${name} ${selector}` }], 'keyframes');
          start = close + 1;
        }
      } else if (rule.type === 'font-face' || rule.type === 'page') block(offset(rule.value.loc), false, [...when, { kind: 'selector', text: `@${rule.type}` }]);
      else if (rule.type === 'starting-style' || rule.type === 'scope') walk(rule.value.rules, [...when, { kind: 'selector', text: `@${rule.type}` }], parent);
    }
  }
  // Remote imports survive Tailwind compilation and may follow expanded local
  // imports. They have no declarations; mask them without moving positions.
  const parsable = maskImports(css);
  walk(parseCss(parsable, filename).rules, initial, null);
  return declarations;
}

async function compiler(entry: string): Promise<{ compile(css: string, options: Record<string, unknown>): Promise<{ build(candidates: string[]): string; buildSourceMap(): DecodedSourceMap }> }> {
  const require = createRequire(join(dirname(entry), 'package.json'));
  const tailwind = require.resolve('tailwindcss');
  let path = tailwind;
  try {
    const node = require.resolve('@tailwindcss/node');
    if (createRequire(node).resolve('tailwindcss') === tailwind) path = node;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error; }
  return import(pathToFileURL(path).href);
}

function mapLocations(css: string, filename: string, map: DecodedSourceMap, embedded?: EmbeddedStylesheet): (offset: number, raw: RawDeclaration) => { site: Site; origin?: Declaration['origin']; authoredCss?: string } {
  const starts = lineStarts(css);
  const mappings = map.mappings.map(item => ({ ...item, offset: starts[item.generatedPosition.line - 1]! + item.generatedPosition.column }));
  const sources = new Map<string, { file: string; text: string; lineStarts: number[] }>();
  return (offset, raw) => {
    let low = 0, high = mappings.length;
    while (low < high) { const middle = (low + high) >>> 1; if (mappings[middle]!.offset <= offset) low = middle + 1; else high = middle; }
    const original = mappings[low - 1]?.originalPosition;
    if (!original?.source.content || !original.source.url) return { site: { file: filename, line: 1, column: 1, text: raw.text } };
    const url = original.source.url;
    let source = sources.get(url);
    if (!source) { source = { file: url.startsWith('file:') ? fileURLToPath(url) : resolve(url), text: original.source.content, lineStarts: lineStarts(original.source.content) }; sources.set(url, source); }
    let position = source.lineStarts[original.line - 1]! + original.column;
    const applies = [...source.text.matchAll(/@apply\s+[^;]+;/g)];
    const apply = applies.find(match => position >= match.index && position < match.index + match[0].length);
    if (apply) position = apply.index;
    const authored = apply ? undefined : declarationsAt(source.text, position, true, 1)[0];
    const authoredText = authored?.prop === raw.prop ? authored.text : raw.text;
    const site = embedded && source.file === filename
      ? sourceSite(embedded.source, embedded.offsets[position] ?? embedded.site.column - 1, apply?.[0] ?? authoredText)
      : sourceSite(source, position, apply?.[0] ?? authoredText);
    return { site, ...(apply ? { origin: 'apply' } : {}), ...(authored?.prop === raw.prop ? { authoredCss: authored.value } : {}) };
  };
}

export async function lowerStylesheets(root: string, entry: string | null, version: string | null, graph: StylesheetGraph, embedded: EmbeddedStylesheet[], readOnly = false): Promise<LoweredStylesheets> {
  const dependencies = await Promise.all([...new Set([...(entry ? [entry] : []), ...graph.roots.filter(file => usesTailwind(graph.files.get(file)!.css))])].map(async file => (await tailwindGraph(file, graph.files.get(file)?.css)).hash));
  const embeddedDependencies = await Promise.all(embedded.filter(sheet => usesTailwind(sheet.css)).map(async sheet => (await tailwindGraph(sheet.source.file, sheet.css)).hash));
  const hash = createHash('sha256').update(JSON.stringify([tool.version, 'layer10-apply-refs-v1', version, entry, dependencies, embeddedDependencies,
    [...graph.files].map(([file, sheet]) => [file, sheet.css, sheet.reached, sheet.sourceOrigin, sheet.package]), embedded.map(sheet => [sheet.source.file, sheet.source.text, sheet.css, sheet.offsets])])).digest('hex');
  const hasModules = await stat(join(root, 'node_modules')).then(info => info.isDirectory()).catch(() => false);
  const directory = resolve(process.env.PLUMB_CACHE_DIR ?? join(root, hasModules ? 'node_modules/.cache/plumb' : '.plumb-cache'), 'stylesheets');
  const path = join(directory, `${hash}.json`);
  try { return JSON.parse(await readFile(path, 'utf8')) as LoweredStylesheets; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  const result: LoweredStylesheets = { declarations: [], classes: [], notes: [...graph.notes] };
  const classes = new Set<string>();
  const covered = new Set<string>();
  const processed = new Set<string>();
  const utilityDefinitions = new Set<string>();
  const independent = (file: string) => graph.files.get(file)!.reached.some(reach => reach.kind === 'entry' || reach.kind === 'side-effect' || reach.kind === 'module');
  const descendants = (file: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(file)) return seen;
    seen.add(file);
    for (const item of graph.files.get(file)?.imports ?? []) descendants(item.file, seen);
    return seen;
  };
  async function compile(css: string, file: string, jsx?: EmbeddedStylesheet): Promise<void> {
    if (!entry && !usesTailwind(css)) return;
    const projectEntry = entry ?? file;
    const api = await compiler(projectEntry);
    let input = css;
    // A reference shares the project's theme/utilities/plugins, without emitting
    // its stylesheet again. Preserve lines in the authored file by appending it.
    if (entry && file !== entry && !descendants(file).has(entry)) input += `\n@reference ${JSON.stringify(entry)};`;
    const options = { base: dirname(file), from: file, onDependency() {},
      loadStylesheet: async (id: string, base: string) => { const path = resolveStylesheet(id, base); return { path, base: dirname(path), content: await readFile(path, 'utf8') }; },
      loadModule: async (id: string, base: string) => { const path = createRequire(join(base, 'package.json')).resolve(id); const module = await import(pathToFileURL(path).href) as { default?: unknown }; return { path, base: dirname(path), module: module.default ?? module }; },
    };
    // The Node wrapper adds its own file/module loaders; direct project compilers
    // use these callbacks instead. Both receive the authored source path.
    const output = await api.compile(input, options);
    const lowered = output.build([]);
    const baseDeclarations = lowerStylesheet(lowered, file, mapLocations(lowered, file, output.buildSourceMap(), jsx));
    result.declarations.push(...baseDeclarations);
    // Tailwind drops @utility definitions until requested. Materialize their
    // static names once at their source-mapped stylesheet definitions, including
    // unused utilities. Class uses must not re-judge compiler-owned values.
    const utilities = (await tailwindGraph(file, css)).utilities;
    if (utilities.length) {
      const compiled = output.build(utilities);
      const identity = (declaration: Declaration) => JSON.stringify([declaration.site, declaration.prop, declaration.value, declaration.when]);
      const base = new Set(baseDeclarations.map(identity));
      for (const declaration of lowerStylesheet(compiled, file, mapLocations(compiled, file, output.buildSourceMap(), jsx))) {
        const key = identity(declaration);
        if (base.has(key) || utilityDefinitions.has(key)) continue;
        utilityDefinitions.add(key);
        result.declarations.push(declaration);
      }
    }
  }
  for (const sheet of graph.files.values()) {
    try {
      const registry = declaredClasses(sheet.css, sheet.file);
      for (const name of registry.classes) classes.add(name);
      result.notes.push(...registry.warnings.map(warning => `CSS scan ${sheet.file}: ${warning}`));
    } catch (error) { throw new UsageError(`Parse stylesheet ${sheet.file}: ${errorMessage(error)}`); }
  }
  // Entry first. Imported files are emitted in their import context, never again
  // as unconditioned source-glob roots. Cycles remain finite.
  for (const file of graph.roots) {
    if (covered.has(file) && !independent(file)) continue;
    const files = descendants(file);
    if ([...files].some(path => usesTailwind(graph.files.get(path)!.css))) {
      try { await compile(graph.files.get(file)!.css, file); }
      catch (error) { throw new UsageError(`Compile stylesheet ${file}: ${errorMessage(error)}`); }
      for (const path of files) covered.add(path);
      processed.add(file);
    }
  }
  function plain(file: string, when: Condition[], stack: Set<string>): void {
    if (stack.has(file)) return;
    const sheet = graph.files.get(file)!;
    covered.add(file);
    const next = new Set([...stack, file]);
    result.declarations.push(...lowerStylesheet(maskImports(sheet.css, true), file, undefined, when));
    for (const item of sheet.imports) {
      if (item.reference) continue;
      const conditions: Condition[] = [...when];
      let tail = item.tail;
      const layer = /^layer(?:\(([^)]+)\))?\s*/.exec(tail);
      if (layer) { conditions.push({ kind: 'layer', text: layer[1] ?? '(anonymous)' }); tail = tail.slice(layer[0].length); }
      // CSS import supports() may contain nested parentheses.
      if (tail.startsWith('supports(')) {
        let depth = 1, end = 9;
        for (; end < tail.length && depth; end++) { if (tail[end] === '(') depth++; if (tail[end] === ')') depth--; }
        conditions.push({ kind: 'supports', text: tail.slice(9, end - 1) }); tail = tail.slice(end).trim();
      }
      if (tail) conditions.push({ kind: 'media', text: tail });
      plain(item.file, conditions, next);
    }
  }
  for (const file of graph.roots) if (!processed.has(file) && (!covered.has(file) || independent(file))) {
    try { plain(file, [], new Set()); }
    catch (error) { throw new UsageError(`Parse stylesheet ${file}: ${errorMessage(error)}`); }
  }
  for (const sheet of embedded) {
    const file = sheet.source.file;
    for (const name of declaredClasses(sheet.css, file).classes) classes.add(name);
    if (usesTailwind(sheet.css)) await compile(sheet.css, file, sheet);
    else result.declarations.push(...lowerStylesheet(sheet.css, file, (offset, raw) => ({ site: sourceSite(sheet.source, sheet.offsets[offset] ?? 0, raw.text) })));
  }
  result.classes = [...classes];
  for (const declaration of result.declarations) {
    const sheet = graph.files.get(declaration.site.file);
    if (!sheet) continue;
    declaration.sourceOrigin = sheet.sourceOrigin;
    if (sheet.package) declaration.package = sheet.package;
    else delete declaration.package;
  }
  // @theme inline can erase a named @apply token's refs just as it does for
  // JSX utilities. Ask the same project oracle which decisions it selected.
  const applications = result.declarations.filter(d => d.origin === 'apply');
  const tokens = (d: Declaration) => /^@apply\s+([\s\S]*?);?$/.exec(d.site.text)?.[1]?.replace(/;$/, '').split(/\s+/).filter(Boolean) ?? [];
  const applied = [...new Set(applications.flatMap(tokens))];
  if (entry && applied.length) {
    const oracle = await lowerTailwind(root, entry, version, applied, readOnly);
    for (const declaration of applications) {
      const refs = tokens(declaration).flatMap(token => oracle.candidates.get(token)?.declarations
        .filter(d => d.prop === declaration.prop).flatMap(d => d.decisionRefs ?? references(d.value)) ?? []);
      if (refs.length) declaration.decisionRefs = [...new Set(refs)];
    }
  }
  if (!readOnly) {
    await mkdir(directory, { recursive: true });
    const temporary = join(directory, `${hash}-${process.pid}.json`);
    await writeFile(temporary, JSON.stringify(result));
    await rename(temporary, path);
  }
  return result;
}
