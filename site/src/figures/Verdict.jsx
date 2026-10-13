// A verdict mark: colour and shape together, so it reads without colour. Plumb's own marks.
const kinds = {
  on: { word: 'On a decision', tone: 'text-success', shape: <circle cx="7" cy="7" r="5" fill="currentColor" /> },
  near: { word: 'Near a decision', tone: 'text-warning', shape: <path d="M7 2 L12.5 12 L1.5 12 z" fill="currentColor" /> },
  off: {
    word: 'Off the scale',
    tone: 'text-destructive',
    shape: <path d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  },
};

export function Verdict({ kind, compact = false }) {
  const k = kinds[kind];
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold ${k.tone}`}>
      <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">{k.shape}</svg>
      <span className={compact ? 'sr-only' : 'mt-px whitespace-nowrap'}>{k.word}</span>
    </span>
  );
}
