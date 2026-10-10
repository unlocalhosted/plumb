import { cn, cva } from './helpers-runtime';

// Real React hook/destructuring shapes: omitted slots are null ESTree nodes.
export function Nullable([, active = true, ...rest]: any[] = [], { tone }: any = {}) {
  const callback = ([, value]: any[]) => value;
  function optional() { if (active) return; }
  const sparse = [, 'inline-flex', , null, undefined, false, 'px-[10px]'];
  const own = cn(null, undefined, sparse, { 'gap-[10px]': active }, optional());
  const recipe = cva(null, { variants: { tone: { calm: 'm-[10px]' } }, compoundVariants: [, { tone: 'calm', class: 'p-[10px]' }] });
  return <>
    <div id="nullable" className={own}>{/* JSXEmptyExpression */}</div>
    <div id="nullable-helper" className={([, flag] = rest) => flag ? 'py-[10px]' : null} />
    <div id="nullable-recipe" className={recipe({ tone })} />
    <div id="nullable-return" className={() => { if (active) return; }} />
  </>;
}

export declare function declared([, value]: any[]): string;
