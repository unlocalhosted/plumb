import { ResolverFactory } from 'oxc-resolver';
import type { NapiResolveOptions } from 'oxc-resolver';
import { intern } from './strings.js';

/**
 * What every import resolved to, as the analysis found it (docs/briefs/server-warm-start.md, the receipt). One table
 * per kind of resolver, keyed by the resolver's own options, so the start-up check can ask the same question the
 * same way and see whether the answer is still the same. A table, not a log: asking twice keeps the last answer.
 */
const tables = new Map<string, Map<string, string | null>>();

/** A resolver whose answers are remembered. Use it wherever the analysis resolves an import. */
export function tracked(options: NapiResolveOptions): ResolverFactory {
  const resolver = new ResolverFactory(options), kind = JSON.stringify(options);
  let table = tables.get(kind);
  if (!table) tables.set(kind, table = new Map());
  const answers = table, ask = resolver.resolveFileSync.bind(resolver);
  resolver.resolveFileSync = (file, specifier) => {
    const answer = ask(file, specifier);
    // the specifier is a piece of the importing file's text: keyed by a copy, the record does not keep the text
    answers.set(intern(`${file}\0${specifier}`), answer.path === undefined ? null : intern(answer.path));
    return answer;
  };
  return resolver;
}

export type Resolutions = [options: string, answers: [key: string, target: string | null][]][];
export const resolutions = (): Resolutions => [...tables].map(([kind, table]) => [kind, [...table]]);

/** How many of these no longer resolve to what they did, with a few of them named. */
export function resolutionsChanged(kept: Resolutions, sample: (what: string) => void): number {
  let changed = 0;
  for (const [kind, answers] of kept) {
    const resolver = new ResolverFactory(JSON.parse(kind) as NapiResolveOptions);
    for (const [key, target] of answers) {
      const cut = key.indexOf('\0'), file = key.slice(0, cut), specifier = key.slice(cut + 1);
      let now: string | null;
      try { now = resolver.resolveFileSync(file, specifier).path ?? null; } catch { now = null; }
      if (now !== target) { changed++; sample(`import: ${specifier} in ${file}`); }
    }
  }
  return changed;
}
