export type ClassArgument = 'classes' | 'config';
/** A static contract for a helper; its implementation is never executed. */
export interface ClassHelper {
  name: string;
  args: ClassArgument;
  /** Only these config properties contain class payloads; other keys are metadata. */
  configKeys?: string[];
  /** Zero-based first config argument for mixed signatures such as cva(base, config). */
  configFrom?: number;
}
/** Existing string entries remain shorthand for { name, args: 'classes' }. */
export type ClassHelperInput = string | ClassHelper;

const recipeKeys = ['base', 'slots', 'variants', 'compoundVariants', 'class', 'className'];
const knownHelpers: ClassHelper[] = [
  ...['cn', 'clsx', 'cx', 'classNames', 'twMerge', 'twJoin'].map(name => ({ name, args: 'classes' as const })),
  { name: 'cva', args: 'classes', configFrom: 1, configKeys: recipeKeys },
  { name: 'tv', args: 'config', configKeys: recipeKeys },
];

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
