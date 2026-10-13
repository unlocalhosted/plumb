/* ─────────────────────────────────────────────────────────
 * FINDING ANATOMY — one real finding, its parts named (site/DOCS.md §4.2)
 *
 * The output is the CLI's real stdout for the gap-[13px] finding on fixtures/docs-judged
 * (docs/recordings/finding.json), with each printed line mapped to its part by the recorder.
 *
 *  rest      the parts listed beside the output; nothing lit
 *  point     hover or focus a part and its lines light in the output; hover a line and its part lights
 *  keys      Tab through the parts
 *  reduced motion: the light changes without a fade
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import recording from '../recordings/finding.json';
import { Recorded } from '../code.jsx';

const PARTS = [
  { id: 'title', name: "What's wrong", says: 'The value as you wrote it, what it does, and how many places it appears.' },
  { id: 'because', name: 'Why it matters', says: 'The harm, in one line, so you can judge whether it matters here.' },
  { id: 'fix', name: 'What to do', says: 'The steps of your scale either side, each with the class, the CSS and the reason you wrote for it.' },
  { id: 'site', name: 'Where', says: 'File, line and column, then the text you wrote there.' },
  { id: 'accept', name: 'If it’s on purpose', says: 'The command that records it as an exception, with a reason.' },
];

export function FindingAnatomy() {
  const [hot, setHot] = useState(null);
  const lit = new Set(recording.lines.filter((l) => l.part === hot).map((l) => l.line - 1));
  const command = recording.runs[0].command.replace(/^node dist\/cli\.js/, 'npx plumb').replace(/ --root \S+/, '');

  return (
    <figure className="my-10">
      <div className="grid gap-5 overflow-hidden rounded-lg bg-card p-5 shadow-plate">
        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>Fig 1</span>
          <span className="uppercase">The parts of a finding</span>
        </div>
        <Recorded
          className="my-0!"
          command={command}
          exit={recording.runs[0].exitCode}
          output={recording.terminalText}
          lit={lit}
        />
        <ul className="grid gap-2 sm:grid-cols-2">
          {PARTS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onPointerEnter={() => setHot(p.id)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(p.id)}
                onBlur={() => setHot(null)}
                className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-(--dur-quick) focus-visible:outline-2 focus-visible:outline-primary ${hot === p.id ? 'bg-tint-2' : 'bg-muted hover:bg-tint-1'}`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.says}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Real output from <code className="font-mono">plumb check</code> on a small fixture. Point at a part to find it in the output.
      </figcaption>
    </figure>
  );
}
