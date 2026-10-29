import { isJudged, varUses } from './families.js';
import { matchesGlob, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ClassSite } from '../collect/classes.js';
import type { CandidateCss } from '../lower/css.js';
import { declaredClasses } from '../lower/css.js';
import type { Declaration, Finding, Site } from '../report.js';
import { makeFinding } from '../messages.js';
import type { Decision } from '../report.js';
import { matchProjectFiles } from '../project.js';

export async function unreachableClasses(root: string, reachable: Set<string>, dead: string[], known?: readonly string[]): Promise<Map<string, string>> {
  const classes = new Map<string, string>();
  if (!dead.length) return classes;
  const files = await matchProjectFiles(root, '**/*.css', known);
  for (const file of files.sort()) {
    if (reachable.has(file)) continue;
    try {
      const css = await readFile(file, 'utf8');
      // This scan supplies fix text only. It never contributes existence proof.
      if (!dead.some(token => css.includes(token) || css.includes(token.replace(/[^\w-]/g, char => `\\${char}`)))) continue;
      const result = declaredClasses(css, file);
      for (const name of dead) if (result.classes.has(name) && !classes.has(name)) classes.set(name, relative(root, file));
    }
    catch { /* An unreachable malformed stylesheet cannot affect the project. */ }
  }
  return classes;
}
function marker(token: string, markers: string[]): boolean {
  if (/^(group|peer)(\/[^\s]+)?$/.test(token)) return true;
  return markers.some(pattern => matchesGlob(token, pattern));
}
function distance(a: string, b: string, cutoff: number): number {
  if (Math.abs(a.length - b.length) > cutoff) return cutoff + 1;
  let row = new Int32Array(b.length + 1);
  let next = new Int32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j <= cutoff ? j : cutoff + 1;
  for (let i = 1; i <= a.length; i++) {
    next.fill(cutoff + 1);
    next[0] = i;
    let minimum = cutoff + 1;
    for (let j = Math.max(1, i - cutoff); j <= Math.min(b.length, i + cutoff); j++) {
      next[j] = Math.min(next[j - 1]! + 1, row[j]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      minimum = Math.min(minimum, next[j]!);
    }
    if (minimum > cutoff) return cutoff + 1;
    [row, next] = [next, row];
  }
  return row[b.length]!;
}
export function classDeclaration(site: ClassSite): Declaration {
  return { prop: 'class', value: site.token, refs: [], when: site.conditions,
    site: location(site), owner: site.owner, origin: 'class', ...(site.opaque ? { opaque: site.opaque } : {}) };
}
export function location(site: ClassSite): Site {
  return { file: site.file, line: site.line, column: site.column, text: site.text, ...(site.anchor ? { anchor: site.anchor } : {}), ...(site.defined ? { defined: site.defined } : {}) };
}
export function existence(sites: ClassSite[], candidates: Map<string, CandidateCss>, declared: Set<string>, markers: string[], themeUtilities: { token: string; prefix: string }[], rankings = new Map<string, string[]>()): Finding[] {
  const groups = new Map<string, ClassSite[]>();
  for (const site of sites) {
    if (!site.opaque && (candidates.get(site.token)?.unreadable || candidates.get(site.token)?.css?.trim() || declared.has(site.token) || marker(site.token, markers))) continue;
    const key = `${site.opaque ? 'existence/dynamic-class' : 'existence/dead-class'}:${site.token}`;
    const group = groups.get(key) ?? [];
    group.push(site);
    groups.set(key, group);
  }
  const needsRanking = [...groups.values()].some(([site]) => !site!.opaque && !rankings.has(site!.token));
  const theme = new Map(needsRanking ? themeUtilities.map(hint => [hint.token, hint.prefix]) : []);
  const hints = needsRanking ? [...new Set([...theme.keys(), ...[...candidates].filter(([, result]) => !result.unreadable && result.css?.trim()).map(([token]) => token)])] : [];
  // Tailwind variants are orthogonal to utility spelling. Keep the authored
  // variant chain when suggesting a different base utility.
  function split(token: string): { variants: string; base: string } {
    let depth = 0, last = -1;
    for (let index = 0; index < token.length; index++) {
      if (token[index] === '\\') { index++; continue; }
      if (token[index] === '[' || token[index] === '(') depth++;
      else if (token[index] === ']' || token[index] === ')') depth--;
      else if (token[index] === ':' && depth === 0) last = index;
    }
    return { variants: token.slice(0, last + 1), base: token.slice(last + 1) };
  }
  const prefix = (name: string) => name.startsWith('--') && name.lastIndexOf('-') < 2 ? '' : name.slice(0, name.lastIndexOf('-') + 1);
  const hintNames = hints.map(token => { const parts = split(token); return { ...parts, prefix: theme.get(token) ?? prefix(parts.base), theme: theme.has(token) }; });
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, group]) => {
    const site = group[0]!;
    const nearest: { token: string; distance: number; samePrefix: boolean; theme: boolean; suffix: boolean; shared: number }[] = [];
    const input = split(site.token);
    const compare = (a: typeof nearest[number], b: typeof nearest[number]) =>
      Number(b.samePrefix) - Number(a.samePrefix) || Number(b.theme) - Number(a.theme) || Number(b.suffix) - Number(a.suffix) || b.shared - a.shared || a.distance - b.distance || a.token.localeCompare(b.token);
    for (const hint of site.opaque || input.base.replace(/^--/, '').length < 4 || rankings.has(site.token) ? [] : hintNames) {
      if (hint.base.replace(/^--/, '').length < 4 || hint.variants && hint.variants !== input.variants) continue;
      const samePrefix = !!hint.prefix && (hint.theme ? input.base.startsWith(hint.prefix) : prefix(input.base) === hint.prefix);
      const length = Math.max(input.base.length, hint.base.length);
      const suffix = input.base.endsWith(`-${hint.base}`);
      let shared = 0;
      while (shared < Math.min(input.base.length, hint.base.length) && input.base[shared] === hint.base[shared]) shared++;
      const token = input.variants + hint.base;
      const rank = { token, distance: 0, samePrefix, theme: hint.theme, suffix, shared };
      // Prefix/theme/suffix ordering can rule out a hint without edit-distance work.
      if (nearest.length === 2 && compare(rank, { ...nearest[1]!, distance: 0 }) > 0) continue;
      const cutoff = samePrefix ? length : Math.floor(length * 0.34);
      const editDistance = distance(input.base, hint.base, cutoff);
      if (!samePrefix && editDistance > cutoff) continue;
      if (nearest.some(item => item.token === token)) continue;
      nearest.push({ ...rank, distance: editDistance / length });
      nearest.sort(compare);
      nearest.splice(2);
    }
    const uniqueClasses = new Map(group.map(site => [JSON.stringify(location(site)), site]));
    const uniqueSites = [...uniqueClasses.values()].map(location);
    if (!site.opaque && !rankings.has(site.token)) rankings.set(site.token, nearest.map(item => item.token));
    const alternatives = input.base.replace(/^--/, '').length < 4 ? [] : rankings.get(site.token) ?? [];
    const prefixText = site.token.split(/\$?\{/, 1)[0]!;
    // each suggested class is a choice the overlay can take, with the shape a token choice has: the class is what is
    // written in place of the dead one (classEdit keeps its variants and importance)
    const choices: Decision[] = site.opaque ? [] : alternatives.map(name => ({ family: 'existence' as Decision['family'], name, value: name, refs: [], origin: 'project', tier: 'semantic', why: 'A class Tailwind generates.', source: { file: site.file, line: site.line }, use: { class: name, css: '' } }));
    return makeFinding({ key, rule: site.opaque ? 'existence/dynamic-class' : 'existence/dead-class', family: 'existence', severity: 'error',
      sites: uniqueSites, declaration: classDeclaration(site), occurrences: [...uniqueClasses.values()].map(classDeclaration), decisions: [], ...(choices.length ? { choices } : {}),
      title: site.opaque ? `\`${site.token}\` is assembled at runtime, so Tailwind never generates it` : `\`${site.token}\` does nothing: no CSS is generated for it`,
      because: site.opaque ? 'Tailwind only generates classes it can read as complete strings in your source.' : 'The style it was meant to apply is missing, and nothing warns you.',
      action: site.opaque ? `Map each value to a complete class, e.g. { a: '${prefixText}a', b: '${prefixText}b' }.` : alternatives.length ? `Did you mean ${alternatives.map(name => `\`${name}\``).join(' or ')}?` : `Remove it, or define \`.${site.token}\` in a stylesheet.`,
    });
  });
}

// The variable registry proves existence, not scope/cascade or runtime value.
export function deadVariables(declarations: Declaration[], defined: ReadonlySet<string>, theme: ReadonlySet<string>): Finding[] {
  const groups = new Map<string, Finding>();
  for (const declaration of declarations) {
    if (!isJudged(declaration) || declaration.opaque) continue;
    for (const use of varUses(declaration.value)) {
      if (use.name.startsWith('--tw-') || defined.has(use.name)) continue;
      const previous = groups.get(use.name);
      const severity = use.fallback === undefined ? 'error' : 'warn';
      if (previous) {
        previous.occurrences!.push(declaration);
        if (severity === 'error') { previous.severity = 'error'; previous.title = `\`var(${use.name})\` is never defined`; }
        if (!previous.sites.some(s => s.file === declaration.site.file && s.line === declaration.site.line && s.column === declaration.site.column && s.text === declaration.site.text)) previous.sites.push(declaration.site);
        continue;
      }
      // Reuse dead-class ranking: namespace, theme, shared prefix, edit distance,
      // and two alternatives. A fake class site is only a ranking adapter.
      const site: ClassSite = { token: use.name, file: declaration.site.file, line: declaration.site.line, column: declaration.site.column, text: declaration.site.text, conditions: declaration.when, owner: declaration.owner };
      const ranked = existence([site], new Map([...defined].filter(name => !name.startsWith('--tw-')).map(name => [name, { css: 'defined', declarations: [], notes: [] }])), new Set(), [], [...theme].filter(token => !token.startsWith('--tw-')).map(token => ({ token, prefix: token.lastIndexOf('-') > 1 ? token.slice(0, token.lastIndexOf('-') + 1) : token })))[0];
      groups.set(use.name, makeFinding({ key: `existence/dead-var:${use.name}`, rule: 'existence/dead-var', family: 'existence', severity, sites: [declaration.site], declaration, occurrences: [declaration], decisions: [],
        title: `\`var(${use.name})\` is never defined${use.fallback === undefined ? '' : `, so it always uses \`${use.fallback}\``}`,
        because: `The browser drops a declaration whose variable is undefined, so this ${declaration.prop} is not applied.`,
        action: ranked?.action?.startsWith('Did you mean') ? ranked.action : `Define ${use.name}, or use a token instead.` }));
    }
  }
  return [...groups.values()].sort((a,b) => a.key.localeCompare(b.key));
}
