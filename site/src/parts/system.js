// This page's own design system, as the spec plate on the scales sheet draws it. Mirrors site/src/styles.css;
// when a token changes there, change it here.

export const SPACING = [
  { name: '1', px: 4 },
  { name: '2', px: 8 },
  { name: '3', px: 12 },
  { name: '4', px: 16 },
  { name: '5', px: 20 },
  { name: '6', px: 24 },
  { name: '8', px: 32 },
  { name: '10', px: 40 },
  { name: '12', px: 48 },
];

export const TYPE = [
  { name: '7xl', size: 88, lead: 84, role: 'the hero', cls: 'text-7xl font-medium' },
  { name: '5xl', size: 60, lead: 62, role: 'closing headlines', cls: 'text-5xl font-medium' },
  { name: '2xl', size: 34, lead: 40, role: 'section titles', cls: 'text-2xl font-medium' },
  { name: 'lg', size: 22, lead: 34, role: 'lede', cls: 'text-lg' },
  { name: 'base', size: 18, lead: 30, role: 'reading', cls: 'text-base', card: true },
  { name: 'sm', size: 14, lead: 22, role: 'captions', cls: 'text-sm', card: true },
  { name: 'xs', size: 12, lead: 16, role: 'labels', cls: 'font-mono text-xs uppercase', card: true },
];

export const RADIUS = [
  { name: 'none', px: 0 },
  { name: 'sm', px: 2 },
  { name: 'md', px: 4 },
  { name: 'lg', px: 6 },
];

export const ELEVATION = [
  { name: 'flat', cls: '' },
  { name: 'plate', cls: 'shadow-plate' },
  { name: 'lift', cls: 'shadow-lift' },
];

export const COLOUR = [
  { name: 'tint-1', cls: 'bg-tint-1' },
  { name: 'tint-2', cls: 'bg-tint-2' },
  { name: 'tint-3', cls: 'bg-tint-3' },
  { name: 'tint-4', cls: 'bg-tint-4' },
  { name: 'primary', cls: 'bg-primary' },
  { name: 'muted-fg', cls: 'bg-muted-foreground' },
  { name: 'foreground', cls: 'bg-foreground' },
];
