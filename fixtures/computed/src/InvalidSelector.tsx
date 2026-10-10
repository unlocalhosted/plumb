// AlgoRecall BuildDetectors shape: JS consumes the slash escape before Tailwind sees it.
export function InvalidSelector({ active }: any) {
  return <div id="invalid-selector" className={active ? '[&_.bg-error\/5]:hidden' : 'p-[10px]'} />;
}
