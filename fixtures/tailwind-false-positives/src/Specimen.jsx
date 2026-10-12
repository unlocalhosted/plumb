export function Specimen({ bg, fill, className, x }) {
  return <main>
    <div className={`rounded-plate border border-rule ${bg}`} />
    <svg><path className={`draw-line ${fill}`} /></svg>
    <span className={`text-label text-line ${className}`} />
    <div className={`${x} border-rule`} />
    <div className={`border-brnad ${x} text-brnad`} />
    <div className={`border-rule	${x}
text-line`} />
    <div className={`bg-${x}`} />
    <div className={`${x}-500`} />
    <div className="text-label transition-colors shadow-lift token-shadow" />
    <div className="missing-variable missing-shadow mixed-shadow" />
    <div className="shadow-[0_1px_1px_rgb(1_2_3)] text-[#123456]" />
  </main>;
}
