import { Lettering } from '../components/blueprint'
import { motionDisciplines, motionStandards, type MotionStandard } from '../motion/content/standards'

/*
  Drafting standards for Volume II: the screen rules, each shown live
  against its violation, and the twelve principles translated for a flat
  collage world. Same composition as Volume I's standards page.
*/

export function MotionStandardsPage() {
  return (
    <main className="mx-auto max-w-wide px-[clamp(1rem,4vw,2.5rem)] pt-7 pb-16">
      <header className="mt-12 grid gap-5">
        <h1 className="enter font-read text-[clamp(2rem,3.4vw,2.75rem)] leading-[1.05] font-medium tracking-[-0.025em]" style={{ '--i': 0 } as React.CSSProperties}>
          Drafting standards.
        </h1>
        <p className="enter max-w-[34em] font-read text-[1.1875rem] leading-[1.5]" style={{ '--i': 1 } as React.CSSProperties}>
          The rules every clip is checked against. The screen rules each play beside their violation, so the difference is something you see. The twelve principles are translated for cutouts, type and charts, and the translation is mostly knowing where each one stops.
        </p>
        <Lettering className="enter" style={{ '--i': 2 } as React.CSSProperties}>
          <span>{motionStandards.length} standards</span>
          <span>·</span>
          <span>{motionDisciplines.map((d) => d.name).join(', ')}</span>
          <span>·</span>
          <span>rev A · 2026-10-22</span>
        </Lettering>
      </header>

      <div className="mt-16 grid gap-20">
        {motionDisciplines.map((disc, di) => {
          const list = motionStandards.filter((s) => s.discipline === disc.id)
          return (
            <section key={disc.id} aria-labelledby={`disc-${disc.id}`} className="grid gap-x-12 gap-y-8 lg:grid-cols-[16rem_1fr]">
              <aside className="lg:sticky lg:top-8 lg:self-start">
                <Lettering><span>Discipline {String(di + 1).padStart(2, '0')}</span><span>·</span><span>{disc.code}</span></Lettering>
                <h2 id={`disc-${disc.id}`} className="mt-2 font-read text-[1.125rem] font-semibold tracking-[-0.012em]">{disc.name}</h2>
                <p className="mt-2 font-read text-[0.9375rem] leading-relaxed text-muted">{disc.summary}</p>
                <nav aria-label={`${disc.name} standards`} className="mt-5 grid border-t border-line">
                  {list.map((s) => (
                    <a key={s.id} href={`#${s.id}`} className="group/toc grid grid-cols-[6.5rem_1fr] gap-2 border-b border-line py-2 text-[13px] transition-colors duration-150 hover:text-fg">
                      <span className="measure text-[11px] text-faint group-hover/toc:text-draw">{s.id}</span>
                      <span className="text-muted group-hover/toc:text-fg">{s.title}</span>
                    </a>
                  ))}
                </nav>
              </aside>
              <ol className="min-w-0">
                {list.map((s) => <StandardEntry key={s.id} s={s} />)}
              </ol>
            </section>
          )
        })}
      </div>
    </main>
  )
}

function StandardEntry({ s }: { s: MotionStandard }) {
  return (
    <li id={s.id} className="scroll-mt-8 border-t border-line-strong pt-8 pb-16 first:border-t-0 first:pt-0">
      <Lettering><span className="text-draw">{s.id}</span></Lettering>
      <h3 className="mt-2 font-read text-[1.5rem] font-medium tracking-[-0.02em]">{s.title}.</h3>
      <p className="mt-4 max-w-[36em] font-read text-[1.1875rem] leading-[1.5]">{s.rule}</p>

      <dl className="mt-8 grid gap-x-5 gap-y-2 sm:grid-cols-[6.5rem_1fr] sm:gap-y-6 [&>dd]:mb-4 sm:[&>dd]:mb-0">
        <dt className="label pt-[5px]">Why</dt>
        <dd className="max-w-prose type-body">{s.why}</dd>

        <dt className="label pt-[5px] !text-fg">Where it stops</dt>
        <dd>
          <ul className="max-w-prose">
            {s.exceptions.map((x) => (
              <li key={x} className="grid grid-cols-[1.25rem_1fr] gap-2 border-t border-line py-3 type-body first:border-t-0 first:pt-0">
                <span aria-hidden className="mt-[0.8em] h-px w-3 bg-fg" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    </li>
  )
}
