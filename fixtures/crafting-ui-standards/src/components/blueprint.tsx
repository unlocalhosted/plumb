/** A line of mono lettering: masthead, breadcrumb, meta. Children are the cells; dots separate them. */
export function Lettering({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p style={style} className={`measure flex flex-wrap items-center gap-x-3 text-[12px] tracking-[0.08em] text-faint uppercase ${className}`}>{children}</p>
}
