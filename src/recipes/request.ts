import { UsageError } from '../errors.js';
import { defaultRootPx } from './css.js';
import type { Model, MotionModel, Recipe } from './model.js';
import { readBoxShadow, readDesignTokens, readMotionObject } from './readers.js';

/** What a request can name a recipe by (the keys of POST recipes/preview and recipes/apply that pick one). */
export interface RecipeRequest { designTokens?: unknown; transition?: unknown; recipe?: unknown; boxShadow?: unknown; model?: unknown; kind?: unknown; name?: unknown }
/** What a reader may look in: the recipes the packs offer, the project's own, and the root font size its lengths resolve at. */
export interface RecipeSources { packs: Recipe[]; yours: Recipe[]; rootPx?: number }
/** One way of naming a recipe. `when` says the request is in this shape; `read` makes the recipe or throws a plain UsageError; `says` is the shape for the refusal text. */
export interface RecipeReader { says: string; when(p: RecipeRequest): boolean; read(p: RecipeRequest, from: RecipeSources): Recipe | undefined }

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nameOf = (p: RecipeRequest, fallback: string): string => typeof p.name === 'string' ? p.name : fallback;

/** In the order they are tried: the first whose shape the request has reads it, and its refusal is the answer. */
export const recipeReaders: RecipeReader[] = [
  { says: 'designTokens, a W3C design-token object, with recipe naming one token', when: p => object(p.designTokens),
    read: p => readDesignTokens(p.designTokens).find(r => typeof p.recipe !== 'string' || r.id === p.recipe) },
  { says: 'transition, a motion/react transition object', when: p => object(p.transition),
    read: p => { const r = readMotionObject({ transition: p.transition }, nameOf(p, 'transition')); return r ? { ...r, model: { ...(r.model as MotionModel), requires: 'none' } } : undefined; } },
  { says: 'boxShadow, a CSS box-shadow string', when: p => typeof p.boxShadow === 'string',
    read: (p, from) => readBoxShadow(p.boxShadow as string, nameOf(p, 'custom'), from.rootPx ?? defaultRootPx) ?? undefined },
  { says: 'recipe, an id from GET recipes', when: p => typeof p.recipe === 'string',
    read: (p, from) => { const id = p.recipe as string; return from.packs.find(r => r.id === id || r.source.token === id) ?? from.yours.find(r => r.id === id || r.token === id || r.name === id); } },
  { says: 'model, a shadow ({ layers }) or a motion ({ trigger, changes, timing, requires })', when: p => object(p.model),
    read: p => {
      const model = p.model as unknown as Model, kind = p.kind === 'motion' || 'trigger' in model ? 'motion' : 'shadow';
      if (kind === 'shadow' ? !Array.isArray((model as { layers?: unknown }).layers) : !('timing' in model)) throw new UsageError('model is a shadow ({ layers }) or a motion ({ trigger, changes, timing, requires }).');
      return { id: nameOf(p, 'custom'), name: nameOf(p, 'custom'), kind, model, source: { reader: 'request' } };
    } },
];

/** The recipe a request names, by the first reader whose shape it has. */
export function readRecipeRequest(p: RecipeRequest, from: RecipeSources): Recipe {
  const reader = recipeReaders.find(r => r.when(p));
  const recipe = reader?.read(p, from);
  if (!recipe) throw new UsageError(reader ? `Nothing was found for ${reader.says.split(',')[0]}. Name a recipe by one of: ${recipeReaders.map(r => r.says).join('; ')}.` : `Name a recipe by one of: ${recipeReaders.map(r => r.says).join('; ')}.`);
  return recipe;
}
