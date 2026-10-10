// Static class recipe copied from MetalUI button/button.tsx (2026-10-10).
export type ButtonCap = 'standard' | 'primary' | 'destructive' | 'link' | 'graphite' | 'strip' | 'strip-danger';
const BODY = 'box-border inline-flex items-center justify-center m-0 border-0 whitespace-nowrap cursor-pointer select-none antialiased tap-highlight-none [&>svg]:flex-none data-disabled:cursor-default data-disabled:opacity-button-disabled';
/** The cap's own focus ring; a strip key shows focus as a fill instead (button-strip-focus). */
const RING = 'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep';
const FRAME = `${BODY} ${RING}`;
const PRESS = 'not-data-disabled:active:translate-y-button-travel not-data-disabled:active:duration-button-press not-data-disabled:active:ease-linear';
// Fixture drift: original px-button-pad replaced with px-[10px] for source-edit proof.
const REGULAR = 'gap-button-gap h-button-height px-[10px] rounded-pill type-ui transition-button [&>svg]:size-button-glyph';

const CAPS: Record<ButtonCap, string> = {
  standard: `${REGULAR} text-ink recipe-button ${PRESS} not-data-disabled:active:recipe-button-pressed`,
  primary: `${REGULAR} text-button-primary-ink recipe-button-primary ${PRESS} not-data-disabled:active:recipe-button-primary-pressed`,
  destructive: `${REGULAR} text-button-destructive-ink recipe-button-destructive ${PRESS} not-data-disabled:active:recipe-button-destructive-pressed`,
  link: 'gap-button-gap [&>svg]:size-button-compact-glyph h-auto p-0 rounded-none bg-transparent type-button-link text-button-link-ink transition-button',
  graphite: `[&>svg]:size-button-compact-glyph gap-button-gap h-button-graphite-height px-button-graphite-pad rounded-pill type-button-graphite text-button-graphite-ink recipe-button-graphite transition-button ${PRESS}`,
  strip: `[&>svg]:size-button-compact-glyph gap-button-gap h-button-strip-height px-button-strip-pad rounded-button-strip-radius type-button-strip text-button-strip-ink bg-transparent transition-button pointer-hover:text-button-strip-ink-hover pointer-hover:recipe-button-strip-hover ${PRESS} not-data-disabled:active:recipe-button-strip-pressed focus-visible:button-strip-focus`,
  'strip-danger': `[&>svg]:size-button-compact-glyph gap-button-gap h-button-strip-height px-button-strip-pad rounded-button-strip-radius type-button-strip text-button-strip-danger-ink bg-transparent transition-button pointer-hover:recipe-button-strip-hover ${PRESS} not-data-disabled:active:recipe-button-strip-pressed focus-visible:button-strip-focus`,
};
const COMPACT = `gap-button-compact-gap h-button-compact-height px-button-compact-pad rounded-pill type-button-compact text-ink2 pointer-hover:text-ink recipe-button-compact transition-button-compact [&>svg]:size-button-compact-glyph ${PRESS} not-data-disabled:active:recipe-button-compact-pressed`;

/** The cap's frame and regular size without its press, for keys that travel their own way (Toggle). */
export const buttonParts = { FRAME, REGULAR } as const;

/** The utilities for a cap and size: the caps that set their own size ignore `size`. */
export function buttonClasses(cap: ButtonCap = 'standard', size: 'default' | 'compact' = 'default') {
  const compact = size === 'compact' && ['standard', 'primary', 'destructive'].includes(cap);
  if (compact && cap !== 'standard') {
    const dimensions = 'gap-button-compact-gap h-button-compact-height px-button-compact-pad rounded-pill type-button-compact [&>svg]:size-button-compact-glyph transition-button';
    return `${FRAME} ${dimensions} ${cap === 'primary' ? 'text-button-primary-ink recipe-button-primary not-data-disabled:active:recipe-button-primary-pressed' : 'text-button-destructive-ink recipe-button-destructive not-data-disabled:active:recipe-button-destructive-pressed'} ${PRESS}`;
  }
  return `${cap === 'strip' || cap === 'strip-danger' ? BODY : FRAME} ${compact ? COMPACT : CAPS[cap]}`;
}


export function Button({cap = "standard", size = "default", face = "idle", iconOnly = false, holdEnabled = false}: any) {
  const pressed = face === 'waiting' ? cap === 'standard' ? size === 'compact' ? 'recipe-button-compact-pressed' : 'recipe-button-pressed' : cap === 'primary' ? 'recipe-button-primary-pressed' : cap === 'destructive' ? 'recipe-button-destructive-pressed' : '' : '';
  const square = iconOnly ? ['strip', 'strip-danger'].includes(cap) ? 'w-button-strip-height px-0!' : cap === 'graphite' ? 'w-button-graphite-height px-0!' : size === 'compact' ? 'w-button-compact-height px-0!' : 'w-button-height px-0!' : '';
  const own = `mu-button mu-icon-trigger ${buttonClasses(cap, size)} ${square} ${pressed} ${face === 'waiting' ? 'translate-y-button-travel cursor-default' : ''} ${holdEnabled ? `relative overflow-clip data-holding:translate-y-button-travel ${cap === 'strip-danger' ? 'data-holding:recipe-button-strip-pressed' : 'data-holding:recipe-button-destructive-pressed'} data-holding:duration-button-press data-holding:ease-linear` : ''}`;
  return <button id="computed-button" className={own}>Computed</button>;
}
