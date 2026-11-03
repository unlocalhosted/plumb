export type ClassArgument = 'classes' | 'config';
/** A static contract for a helper; its implementation is never executed. */
export interface ClassHelper {
  name: string;
  args: ClassArgument;
  /** Only these config properties contain class payloads; other keys are metadata. */
  configKeys?: string[];
  /** Zero-based first config argument for mixed signatures such as cva(base, config). */
  configFrom?: number;
  /** An object among its class arguments holds classes as its keys (`clsx({ hidden: !open })`), each under its value as
   * the condition. Only these helpers read objects so; anywhere else an object's keys are names, not classes. */
  objects?: 'keys';
  /** A way of composing classes that the recipes name as the project's idiom (Idioms.classes), when the project uses it most. */
  idiom?: true;
}
/** Existing string entries remain shorthand for { name, args: 'classes' }. */
export type ClassHelperInput = string | ClassHelper;

const recipeKeys = ['base', 'slots', 'variants', 'compoundVariants', 'class', 'className'];
/** The one table of class helpers: the collector, the session's class reading (src/session/props.ts) and the recipes'
 * idioms (src/recipes/project.ts) all read it, so a new helper is one row. */
const knownHelpers: ClassHelper[] = [
  { name: 'cn', args: 'classes', objects: 'keys', idiom: true },
  { name: 'clsx', args: 'classes', objects: 'keys', idiom: true },
  { name: 'cx', args: 'classes', objects: 'keys' },
  { name: 'classNames', args: 'classes', objects: 'keys' },
  { name: 'cva', args: 'classes', configFrom: 1, configKeys: recipeKeys, idiom: true },
  { name: 'twMerge', args: 'classes', idiom: true },
  { name: 'twJoin', args: 'classes' },
  { name: 'tv', args: 'config', configKeys: recipeKeys },
];
/** The helpers every project is read with, before its own config adds any. */
export const knownClassHelpers: readonly ClassHelper[] = knownHelpers;

export function classHelperRegistry(extensions: ClassHelperInput[] = []): ReadonlyMap<string, ClassHelper> {
  return new Map([...knownHelpers, ...extensions.map(item => typeof item === 'string' ? { name: item, args: 'classes' as const } : item)].map(helper => [helper.name, helper]));
}

export function argumentMode(helper: ClassHelper, index: number, objectSignature = false): ClassArgument {
  if (helper.name === 'cva' && index === 0 && objectSignature) return 'config';
  return helper.configFrom !== undefined && index >= helper.configFrom ? 'config' : helper.args;
}

export function configKeyMode(helper: ClassHelper | undefined, key: string): 'classes' | 'values' | 'config' | undefined {
  if (!helper?.configKeys?.includes(key)) return;
  return key === 'compoundVariants' ? 'config' : key === 'class' || key === 'className' ? 'classes' : 'values';
}
