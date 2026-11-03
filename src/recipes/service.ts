import { UsageError } from '../errors.js';
import { sourceHash } from '../collect/cache.js';
import { deriveMotion, deriveShadow, motionDials, shadowDials } from './dials.js';
import type { MotionDials, ShadowDials } from './dials.js';
import { map } from './mapping.js';
import { isShadow } from './model.js';
import type { MotionModel, Recipe } from './model.js';
import { firstPack, readPack } from './pack.js';
import type { Pack } from './pack.js';
import { describeElement, diff, plan } from './plan.js';
import type { Choice, Plan } from './plan.js';
import type { ProjectIndex } from './project.js';
import { readRecipeRequest } from './request.js';
import type { RecipeRequest } from './request.js';
import { renderModel } from './render.js';

export interface RecipeContext {
  index: ProjectIndex;
  /** project file text by path relative to the root, forward slashes */
  read: (path: string) => string | undefined;
  /** the recipe packs on offer; the default is the one that ships */
  packs?: Pack[];
  element: { file: string; text: string; start: number; tag: string; line: number; column: number };
}

/** A recipe as JSON for the overlay: its model, the numbers derived from it, the CSS to show it, and whether it can be written here. */
export function summarize(r: Recipe, index: ProjectIndex): Record<string, unknown> {
  const blocked = (r.model as MotionModel).requires === 'motion' && !index.idioms.motion.installed ? 'needs motion/react, which this project does not have' : undefined;
  return { id: r.id, name: r.name, kind: r.kind, ...(r.token ? { token: r.token } : {}), ...(r.class ? { class: r.class } : {}), source: r.source, ...(r.summary ? { summary: r.summary } : {}),
    model: r.model, derived: isShadow(r.model) ? deriveShadow(r.model) : deriveMotion(r.model), css: renderModel(r.model),
    ...(r.dark ? { dark: r.dark, cssDark: renderModel(r.dark) } : {}),
    ...(isShadow(r.model) ? {} : { requires: (r.model as MotionModel).requires }), ...(r.exit ? { exit: r.exit, exitRequires: r.exit.requires } : {}), ...(blocked ? { blocked } : {}) };
}
const packRecipes = (ctx: RecipeContext): Recipe[] => (ctx.packs ?? [firstPack]).flatMap(pack => readPack(pack));

/** GET /__plumb/recipes: what the project has, what the packs offer against it, and what the element wears. */
export function recipesView(ctx: RecipeContext): Record<string, unknown> {
  const { index } = ctx;
  return {
    file: ctx.element.file, line: ctx.element.line, column: ctx.element.column, hash: sourceHash(ctx.element.text),
    idioms: index.idioms,
    yours: index.yours.map(r => summarize(r, index)),
    packs: packRecipes(ctx).map(recipe => { const { nearest, verdict } = map(recipe, index.yours); return { recipe: summarize(recipe, index), nearest, verdict }; }),
    element: describeElement({ index, read: ctx.read, element: ctx.element }),
  };
}

export interface PlanParams extends RecipeRequest { dials?: unknown; choice?: unknown; forwards?: unknown }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** The recipe a request names (a pack's or the project's by id, a pasted box-shadow, or a model sent whole) with its dials applied. */
export function resolveRecipe(ctx: RecipeContext, p: PlanParams): Recipe {
  let recipe = readRecipeRequest(p, { packs: packRecipes(ctx), yours: ctx.index.yours, rootPx: ctx.index.rootPx });
  if (p.dials !== undefined) {
    if (!object(p.dials)) throw new UsageError('dials is an object.');
    const d = p.dials, numeric = (k: string) => { const v = d[k]; if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) throw new UsageError(`dial ${k} must be a number.`); };
    for (const k of ['height', 'softness', 'light', 'speed', 'bounce', 'distance', 'startScale']) numeric(k);
    // the dark value moves with the light one (height, softness, light); a tint is the light page's surface, so it stays light
    const { tint: _tint, ...shape } = d as ShadowDials;
    recipe = isShadow(recipe.model) ? { ...recipe, model: shadowDials(recipe.model, d as ShadowDials), ...(recipe.dark ? { dark: shadowDials(recipe.dark, shape) } : {}) }
      : { ...recipe, model: motionDials(recipe.model, d as MotionDials), ...(recipe.exit ? { exit: motionDials(recipe.exit, d as MotionDials) } : {}) };
  }
  return recipe;
}

export interface PlanResult { recipe: Recipe; plan: Plan; writes: (Plan['writes'][number] & { hash: string; diff: string })[] }
export function recipesPlan(ctx: RecipeContext, p: PlanParams): PlanResult {
  const recipe = resolveRecipe(ctx, p);
  if (p.choice !== undefined && p.choice !== 'use' && p.choice !== 'move' && p.choice !== 'add') throw new UsageError('choice is use, move or add.');
  const result = plan({ recipe, choice: p.choice as Choice | undefined, name: typeof p.name === 'string' ? p.name : undefined, forwards: p.forwards === true, index: ctx.index, read: ctx.read, element: ctx.element });
  const order = { theme: 0, presets: 1, rule: 2, element: 3 };
  const writes = result.writes.toSorted((a, b) => order[a.role] - order[b.role]).map(w => ({ ...w, hash: sourceHash(w.before), diff: diff(w.before, w.after) }));
  return { recipe, plan: result, writes };
}

/** POST /__plumb/recipes/preview: the recipe with its dials, the CSS to show it, and the exact edits as a diff. Nothing is written. */
export function recipesPreview(ctx: RecipeContext, p: PlanParams): Record<string, unknown> {
  const { recipe, plan: pl, writes } = recipesPlan(ctx, p);
  return {
    file: ctx.element.file, line: ctx.element.line, column: ctx.element.column, hash: sourceHash(ctx.element.text),
    recipe: summarize(recipe, ctx.index), css: renderModel(recipe.model),
    ok: pl.ok, ...(pl.refused ? { refused: pl.refused } : {}), choice: pl.choice, verdict: pl.verdict, nearest: pl.nearest, notes: pl.notes, ...(pl.uses ? { uses: pl.uses } : {}),
    writes: writes.map(w => ({ file: w.file, role: w.role, summary: w.summary, hash: w.hash, diff: w.diff })),
  };
}
