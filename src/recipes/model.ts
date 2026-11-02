/**
 * One model per kind of recipe (docs/briefs/recipe-engine.md). Whatever a recipe was read from (a theme, a class, a
 * pasted string, a pack, a design-token file, a motion object), it becomes one of these, and the dials and the writers
 * only know these.
 */
export type RGBA = { r: number; g: number; b: number; a: number; /** how it was written, so it is written back the same way */ notation?: 'rgb' | 'rgba' | 'hex' };
/** Either a colour with channels, or one CSS colour the model does not take apart (a token, var(), hsl(), oklch()). */
export type ShadowColor = RGBA | { token: string };
export interface ShadowLayer {
  x: number; y: number; blur: number; spread: number; color: ShadowColor; inset: boolean;
  /** written form: how many lengths the source gave, and whether the colour came first. Kept so a string reads back as itself. */
  lengths?: 2 | 3 | 4; colorFirst?: boolean; insetLast?: boolean;
}
export interface ShadowModel { layers: ShadowLayer[]; /** degrees, 0 is overhead; read from the layers when not given */ light?: number; /** px of the dominant offset */ height?: number }

export type Easing = [number, number, number, number] | string;
export type Timing =
  | { type: 'spring'; stiffness: number; damping: number; mass?: number }
  | { type: 'spring'; duration: number; bounce: number }
  | { type: 'curve'; duration: number; easing: Easing };
export type Trigger = 'hover' | 'press' | 'focus' | 'enter' | 'exit' | 'layout';
export interface MotionChange { property: string; from: number | string; to: number | string }
/** Durations are milliseconds everywhere in the model (motion/react's seconds are converted at its reader and writer). */
export interface MotionModel { trigger: Trigger; changes: MotionChange[]; timing: Timing; requires: 'none' | 'data-state' | 'motion' }

export type Model = ShadowModel | MotionModel;
export const isShadow = (m: Model): m is ShadowModel => 'layers' in m;

export interface RecipeSource {
  /** which reader produced it: theme, classes, paste, pack, motion-object, dtcg, builtin */
  reader: string;
  file?: string; line?: number; token?: string;
  library?: string; licence?: string; url?: string;
  /** the one-line credit written next to what a recipe adds to a project */
  credit?: string;
}
export interface Recipe {
  /** plain role name: raised, floating, ease-out, lift */
  id: string; name: string; kind: 'shadow' | 'motion';
  model: Model;
  /** an enter recipe's leaving half, when the source has one; written only where something can drive it (data-state, a library) */
  exit?: MotionModel;
  source: RecipeSource;
  summary?: string;
  /** the CSS custom property it lives in, when it lives in the project's theme */
  token?: string;
  /** the utility class that applies it, when there is one */
  class?: string;
}

export const round = (n: number, places = 3): number => { const f = 10 ** places; return Math.round(n * f) / f; };
export const num = (n: number): string => { const s = String(round(n)); return s === '-0' ? '0' : s; };
