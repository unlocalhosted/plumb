// Three cards in a list, 24px apart. Card A is tidy; card B's subtitle outweighs its title and its inside gap equals
// the gap between cards; card C's title is 16px among 17px titles, and its image corner is not concentric.
const Card = ({ id, title, titleClass = 'text-[17px] font-semibold', subtitleClass = 'text-[17px] font-normal', gapClass = 'gap-2', imageClass = 'rounded-none' }: { id: string; title: string; titleClass?: string; subtitleClass?: string; gapClass?: string; imageClass?: string }) =>
  <li id={id} className={`flex flex-col ${gapClass} rounded-[16px] border border-gray-300 p-6`}>
    <div id={`${id}-image`} className={`h-10 w-full bg-gray-200 ${imageClass}`} />
    <span id={`${id}-title`} className={titleClass}>{title}</span>
    <span id={`${id}-subtitle`} className={subtitleClass}>A subtitle under it</span>
    <p id={`${id}-body`} className="text-[15px] text-gray-600">Body text that runs a little longer, explaining the card in a sentence.</p>
    <span id={`${id}-meta`} className="text-[11px] tracking-[0.08em] uppercase">meta · 2 min</span>
  </li>;
export function Cards() {
  return <main className="p-8">
    <ul id="cards" className="flex flex-col gap-6">
      <Card id="a" title="A tidy card" />
      <Card id="b" title="A heavy subtitle" subtitleClass="text-[17px] font-bold" gapClass="gap-6" />
      <Card id="c" title="A small title" titleClass="text-[16px] font-semibold" imageClass="rounded-[16px]" />
    </ul>
  </main>;
}
