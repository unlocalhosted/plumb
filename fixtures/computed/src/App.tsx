import { cn, cva, tv } from './helpers-runtime';
import { dimensions, cls } from './barrel';
import { Button } from './Button';
const recipe = cva('inline-flex py-[10px]', { variants: { tone: { primary: 'gap-[10px]', secondary: 'gap-[999px]' } }, defaultVariants: { tone: 'primary' }, compoundVariants: [{ tone: 'primary', className: 'p-[10px]' }] });
const variant = tv({ base: 'flex px-[10px]', variants: { size: { small: 'm-[10px]', large: 'm-[999px]' } }, defaultVariants: { size: 'small' } });
const duplicate = cn('gap-[10px]', 'gap-[10px]');
export function App({ active = true, phase = 'ready' }) {
  const own = `${dimensions(active)} ${cls.chosen}`;
  return <main>
    <Button />
    <div id="imported" className={own} />
    <div id="cva" className={recipe({ tone: 'primary' })} />
    <div id="tv" className={variant({ size: 'small' })} />
    <div id="cn" className={cn('p-[10px]', active && 'py-[10px]', active ? 'm-[10px]' : 'm-[999px]', { 'px-[10px]': active })} />
    <div id="ambiguous" className={duplicate} />
    <div id="runtime" className={'is-' + phase} />
    <div id="callback" className={(state: any) => { const extra = state ? 'p-[10px]' : ''; return extra ? `${own} ${extra}` : own; }} />
  </main>;
}
