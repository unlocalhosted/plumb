// Wave eight: spacing read against the text it separates (docs/research/video-rules.md). Each rule's broken case
// beside one that follows it, shaped like crafting-ui's own: a heading after a paragraph, a title with its subtitle,
// a card's first line, a padding written in pixels.
const TEXT = 'A line of words long enough to wrap onto a second line, so the block reads as running text and not a label.';
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s6">
        <div id="heading-lead-bad" className="max-w-[320px]"><p className="text-[15px]">{TEXT}</p><h3 className="mt-s2 mb-s6 text-[20px] font-semibold">Where it stops</h3><p className="text-[15px]">{TEXT}</p></div>
        <div id="heading-lead-good" className="max-w-[320px]"><p className="text-[15px]">{TEXT}</p><h3 className="mt-s6 mb-s2 text-[20px] font-semibold">Where it stops</h3><p className="text-[15px]">{TEXT}</p></div>
        <div id="pair-spacing-bad" className="max-w-[320px]"><h3 className="text-[22px] font-semibold">Anticipation</h3><p className="mt-s6 text-[14px]">The wind-up before a move</p><p className="mt-s2 text-[15px]">{TEXT}</p></div>
        <div id="pair-spacing-good" className="max-w-[320px]"><h3 className="text-[22px] font-semibold">Anticipation</h3><p className="mt-s1 text-[14px]">The wind-up before a move</p><p className="mt-s4 text-[15px]">{TEXT}</p></div>
        <div><div id="relative-spacing-bad" className="max-w-[320px] p-[18px] text-[15px]">Space written in pixels around words.</div></div>
        <div><div id="relative-spacing-good" className="max-w-[320px] p-s4 text-[15px]">Space from the scale around words.</div></div>
        <div><div id="card-optical-padding-bad" className="max-w-[320px] rounded-[12px] border border-line bg-surface p-s6"><h3 className="text-[24px] leading-[1.6] font-semibold">Card title</h3><p className="text-[15px]">{TEXT}</p></div></div>
        <div><div id="card-optical-padding-good" className="max-w-[320px] rounded-[12px] border border-line bg-surface px-s6 pb-s6 pt-s4"><h3 className="text-[24px] leading-[1.6] font-semibold">Card title</h3><p className="text-[15px]">{TEXT}</p></div></div>
      </div>
    </main>
  );
}
