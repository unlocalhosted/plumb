export function cn(...values: any[]) { return values.flatMap(value => typeof value === 'object' && value ? Object.keys(value).filter(key => value[key]) : value).filter(Boolean).join(' '); }
export function cva(base: string, config: any) { return (props: any) => cn(base, ...Object.entries(config.variants).map(([axis, choices]: any) => choices[props[axis]])); }
export function tv(config: any) { return cva(config.base, config); }
// Opaque implementations ensure registry contracts, rather than return tracing, feed attribution.
export function makeRecipe(config: any) { return ''; }
export function mixedRecipe(base: any, config: any) { return ''; }
export function joinStyles(...values: any[]) { return ''; }
