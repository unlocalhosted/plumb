import { makeRecipe as styled, mixedRecipe, joinStyles, cva as variants, tv as slots } from './helpers-runtime';

export function HelperShapes() {
  return <>
    <div id="custom-config" className={styled({
      classes: { root: 'px-[10px]' }, variants: { tone: { calm: 'gap-[10px]' } },
      compoundVariants: [, { tone: 'metadata-compound', className: 'm-[10px]' }],
      defaultVariants: { tone: 'metadata-default' }, ignored: 'metadata-ignored',
    })} />
    <div id="custom-mixed" className={mixedRecipe('inline-flex', { classes: { root: 'py-[10px]' }, ignored: 'metadata-mixed' })} />
    <div id="custom-legacy" className={joinStyles(null, [, 'p-[10px]'], { 'mt-[10px]': true })} />
    <div id="alias-cva" className={variants('flex', { variants: { tone: { calm: 'mb-[10px]' } }, defaultVariants: { tone: 'metadata-cva' } })} />
    <div id="alias-tv" className={slots({ slots: { root: 'grid mx-[10px]' }, defaultVariants: { tone: 'metadata-tv' } })} />
  </>;
}
