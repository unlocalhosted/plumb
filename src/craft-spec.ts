// The craft spec as the server and the CLI see it (docs/briefs/craft-spec.md): the standard resolved with the project's
// config, plus where a new token would be written (file, shape, hash), which only the server can know.
import { existsSync } from 'node:fs';
import { hasShadcnConfig } from './project-facts/index.js';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { resolveSpec } from '../overlay/src/craft-spec.js';
import type { ResolvedSpec, SpecRule } from '../overlay/src/craft-spec.js';
import type { PlumbConfig } from './config.js';
import { sourceHash } from './collect/cache.js';
import { tailwindEntryCandidates } from './project.js';
import type { Report } from './report.js';
import { table, wrap } from './cli-table.js';

export type { ResolvedSpec, SpecRule } from '../overlay/src/craft-spec.js';
export type Shape = 'theme' | 'shadcn' | 'root';
export interface TokenTarget { file: string; shape: Shape; create: boolean; importedFrom: string | null; hash: string | null }
export interface ProjectSpec extends Omit<ResolvedSpec, 'tokens'> { tokens: ResolvedSpec['tokens'] & { file: string | null; shape: Shape | null; hash: string | null; new?: boolean; importedFrom?: string | null } }

/** The stylesheet that holds most of the project's own rules: the one to import a new theme file from. */
function mainStylesheet(report: Report, root: string): string | undefined {
  const sheets = new Map<string, number>();
  for (const sheet of report.stylesheets) if (sheet.sourceOrigin === 'project') sheets.set(relative(root, sheet.file).replaceAll('\\', '/'), 0);
  for (const declaration of report.declarations) if (declaration.sourceOrigin !== 'framework' && (declaration.origin === 'stylesheet' || declaration.origin === 'custom-property')) {
    const file = relative(root, declaration.site.file).replaceAll('\\', '/');
    if (sheets.has(file)) sheets.set(file, sheets.get(file)! + 1);
  }
  return [...sheets].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

const shapeOf = async (root: string, file: string): Promise<Shape> => {
  const text = await readFile(resolve(root, file), 'utf8').catch(() => '');
  if (hasShadcnConfig(root) && /@theme\s+inline\b/.test(text)) return 'shadcn';
  return /@theme\b/.test(text) || /@import\s+["']tailwindcss["']/.test(text) ? 'theme' : 'root';
};

/**
 * Where a new token goes: the config's `craft.tokens.file`, else the Tailwind entry's `@theme` (the onboarding writer's
 * target, src/onboarding/propose.ts), else a theme.css beside the main stylesheet. Null when nothing can be told yet.
 */
export async function tokenTarget(root: string, config: PlumbConfig, report?: Report): Promise<TokenTarget | null> {
  const configured = config.craft?.tokens?.file;
  let file: string | undefined, importedFrom: string | null = null;
  if (configured) file = configured.replaceAll('\\', '/');
  else {
    const entry = report ? report.tailwind.entry : (await tailwindEntryCandidates(root).catch(() => []))[0];
    if (entry) file = relative(root, resolve(root, entry)).replaceAll('\\', '/');
    else if (report) {
      const main = mainStylesheet(report, root);
      file = main ? join(dirname(main), 'theme.css').replaceAll('\\', '/') : 'src/theme.css';
      importedFrom = main && !existsSync(resolve(root, file)) ? main : null;
    }
  }
  if (!file) return null;
  const path = resolve(root, file), exists = existsSync(path);
  const shape: Shape = exists ? await shapeOf(root, file) : 'root';
  const hash = exists ? sourceHash(await readFile(path, 'utf8')) : null;
  return { file, shape, create: !exists, importedFrom, hash };
}

/** The spec in effect for a project, with the token target filled in. */
export async function projectSpec(root: string, config: PlumbConfig, report?: Report): Promise<ProjectSpec> {
  const resolved = resolveSpec(config.craft, config.craftLayers ?? []);
  const target = await tokenTarget(root, config, report);
  return { ...resolved, tokens: { ...resolved.tokens, file: target?.file ?? null, shape: target?.shape ?? null, hash: target?.hash ?? null, ...(target ? { new: target.create, importedFrom: target.importedFrom } : {}) } };
}

const show = (v: unknown): string => typeof v === 'number' ? String(v) : typeof v === 'string' ? v : JSON.stringify(v);
// a rule's values as rows: nested objects (want) flattened to dotted keys
function rows(values: Record<string, unknown>, from: Record<string, string>, path = ''): string[][] {
  const out: string[][] = [];
  for (const [k, v] of Object.entries(values)) {
    const at = path ? `${path}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...rows(v as Record<string, unknown>, from, at));
    else out.push([at, show(v), from[at] ?? 'standard']);
  }
  return out;
}

/** `plumber spec`: the resolved spec, by principle, each value with where it came from. */
export function formatSpec(spec: ProjectSpec, configPath: string | null, only?: string, habits: ReadonlySet<string> = new Set()): string {
  const lines: string[] = [];
  const where = (s: string) => (s === 'config' ? (configPath ?? 'config') : s);
  const changed = spec.principles.flatMap(p => p.rules).filter(r => Object.keys(r.from).length);
  lines.push(`React Plumber craft spec: preset ${spec.preset}${changed.length ? `, ${changed.length} rule${changed.length === 1 ? '' : 's'} tuned` : ', the standard'}${configPath ? ` (${configPath})` : ''}`);
  for (const p of spec.principles) {
    const rules = p.rules.filter(r => !only || r.id === only || r.short === only);
    if (!rules.length) continue;
    lines.push('', p.id, wrap(`  ${p.why}`));
    for (const r of rules) {
      // A habit runs only when the config's habits list names it; the spec can grade it or turn it off, not on.
      const unlisted = r.habit && r.enabled && !habits.has(r.short);
      const state = r.habit ? `${r.enabled && !unlisted ? 'on' : 'off'} · ${r.severity}` : `${r.enabled ? 'on' : 'off'} · tier ${r.tierName}`;
      const by = [unlisted && `not in habits (${configPath ?? 'plumber.config.ts'})`, r.from.enabled && `on/off: ${where(r.from.enabled)}`, r.from.tier && `tier: ${where(r.from.tier)}`, r.from.severity && `severity: ${where(r.from.severity)}`].filter(Boolean).join(' · ');
      lines.push(...table([[r.id, state, by || '']], [{ width: 30 }, { width: 22 }, { weight: 1, ink: 'dim', wrap: true }], { indent: 2, width: 100 }));
      const valueRows = rows(r.values, r.from).map(([k, v, f]) => [k!, v!, where(f!)]);
      if (valueRows.length) lines.push(...table(valueRows, [{ width: 20 }, { width: 8, align: 'right' }, { weight: 1, ink: 'dim' }], { indent: 6, width: 100 }));
    }
  }
  if (!only) {
    const t = spec.tokens;
    lines.push('', `tokens · create ${t.create ? 'yes' : 'no'} (${where(spec.tokensFrom.create ?? 'standard')}) · name ${typeof t.name === 'string' ? t.name : JSON.stringify(t.name)} (${where(spec.tokensFrom.name ?? 'standard')})`,
      `  file ${t.file ? `${t.file}${t.new ? ' (new)' : ''} · ${t.shape === 'shadcn' ? '@theme inline' : t.shape === 'theme' ? '@theme' : ':root'}` : 'none found yet (your Tailwind entry’s @theme, once the project is read)'}${spec.tokensFrom.file ? ` (${where(spec.tokensFrom.file)})` : ''}`);
  }
  return lines.join('\n') + '\n';
}
