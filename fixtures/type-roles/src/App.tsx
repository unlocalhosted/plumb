import { Labels } from './Labels';
import { Specimen } from './specimen/Specimen';
// Roles reached for by hand: a caps label at 12px, a 24px heading, 17px card titles (semibold) and leads (regular),
// 16px prose (1.6) and 16px list bodies (1.4), a 13px code block, and 11px caps labels. Nothing is named yet.
export function App() {
  return <main className="p-8">
    <header>
      <span id="eyebrow" className="text-[12px] tracking-[0.08em] uppercase">Chapter one</span>
      <h1 id="title" className="text-[1.5rem] font-medium tracking-[-0.02em]">A page about type</h1>
      <p id="lead" className="text-[1rem] leading-[1.6]">The lead paragraph says what the page is for, in two sentences.</p>
    </header>
    <section>
      <h2 id="h2" className="text-[1.5rem] font-medium tracking-[-0.02em]">Rows</h2>
      <p id="prose-a" className="text-[1rem] leading-[1.6]">Prose paragraphs read at a relaxed leading, because they run long.</p>
      <p id="prose-b" className="text-[1rem] leading-[1.6]">A second paragraph, the same.</p>
      <p id="inherit" className="text-[1rem]">A paragraph that sets no leading of its own, and takes the role's.</p>
      <h3 id="card-title-a" className="text-[17px] font-semibold">A card title</h3>
      <p id="card-lead-a" className="text-[17px]">A lead at the same size, regular weight.</p>
      <h3 id="card-title-b" className="text-[17px] font-semibold">Another card title</h3>
      <p id="card-lead-b" className="text-[17px]">Another lead at the same size.</p>
      <ul>
        {[0, 1, 2, 3].map(n => <li key={n} id={`row-${n}`}>
          <span id={`row-label-${n}`} className="text-[12px] tracking-[0.1em] uppercase">Row {n}</span>
          <span id={`row-body-${n}`} className="text-[1rem] leading-[1.4]">A short description of row {n}.</span>
        </li>)}
      </ul>
      <pre id="code" className="text-[13px] leading-[1.6] font-mono">npm run dev</pre>
      <Labels />
    </section>
    <Specimen />
  </main>;
}
