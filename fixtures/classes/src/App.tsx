import { SIZES, TONES } from '@styles/sizes';
const LOCAL = { small: 'py-2', large: 'px-4' } as const;
const BASE = 'flex';
const variant = cva('inline-flex', {
  variants: { size: { small: 'p-2', large: 'cva-dead' } },
  compoundVariants: [{ size: 'small', className: 'compound-dead' }],
});
const slots = tv({
  base: 'grid', slots: { base: 'block', icon: 'slot-dead' },
  variants: { tone: { brand: { base: 'bg-brand', icon: 'text-white' } } },
  compoundVariants: [{ tone: 'brand', class: { base: 'p-2' } }],
});
export function App({ size, n, enabled, external }) {
  return <main className="bg-brnad bg-brand plain-card group group/menu peer peer/input js-menu nested-hook escaped:hook">
    <button className={cn(SIZES[size], TONES[0], LOCAL[size], BASE, { 'object-dead': enabled }, ['hover:bg-brand'])} />
    <span className={enabled ? 'branch-on-dead' : 'branch-off-dead'} />
    <div className={enabled && 'logical-dead'} />
    <p className={`gap-${n} p-2 ${external} bg-brand`} />
    <section className={external} />
    <aside className={joinStyles('configured-dead', 'bg-brand')} />
    <div className="translate-x-2 shadow-sm ring-2 rounded-full folded literal-content animate-spin supports-[display:grid]:grid @sm:flex [&_button]:text-white" />
  </main>;
}
export function Outside() { return twJoin('outside-dead', 'block'); }
export function TemplateBoundaries({ active, external }) {
  return <div className={`bg-brand${active ? ' text-white' : ''} ${external}`} />;
}
export function Wrapped() { return <div className={wrap(clsx('wrapped-dead'))} />; }
