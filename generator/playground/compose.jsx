// The composer: a whole-card direction from a reference's grammar (generator/specimens), drawn with one product's own
// parts and tokens. The grammar says what leads and how strongly, how the parts group and in what order, the card's
// ground, edge and corner, how dense it is and how wide; the product says what each job's part is and which of its
// tokens play each role. Nothing here is drawn from the reference: only its decisions travel.
//   <Compose grammar={…} parts={{ price: (ctx) => …, … }} system={{ grounds, sizes, body }} />

// a rank (1 leads) becomes a size on the product's own scale; the lead's strength says how far the first rank stands out
const sizeOf = (rank, lead, sizes) => {
  if (rank === 1) return lead === 'strong' ? sizes.hero : lead === 'flat' ? sizes.title : sizes.display;
  if (rank === 2) return lead === 'flat' ? sizes.body : sizes.title;
  return rank === 3 ? sizes.body : sizes.small;
};

export function Compose({ grammar: g, parts, system: s }) {
  const ground = s.grounds[g.container.ground] ?? s.grounds.none;
  // space: `between` separates groups, `inside` ties a group, both in the product's body size; a direction never
  // packs tighter than the product's tightest step or looser than two and a half lines (a card that drifts apart
  // reads as separate things)
  const between = Math.min(2.5, Math.max(0.75, g.space.between)) * s.body;
  const inside = Math.min(1.25, Math.max(0.35, g.space.inside)) * s.body;
  const job = (j) => parts[j] ? <div key={j} data-job={j}>{parts[j]({ size: sizeOf(g.hierarchy[j] ?? 4, g.lead, s.sizes), rank: g.hierarchy[j] ?? 4, colour: g.colour[j] ?? 'ink', ground, lead: g.lead })}</div> : null;
  const node = (n, k) => {
    if (typeof n === 'string') return n === 'divider' ? <hr key={k} style={{ border: 0, borderTop: `1px solid ${ground.edge}`, margin: 0, width: '100%' }} /> : job(n);
    if (n.row) {
      const kids = n.row.map(node).filter(Boolean);
      return kids.length ? <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: n.ends ? 'space-between' : 'flex-start', gap: inside * 1.5, flexWrap: 'wrap' }}>{kids}</div> : null;
    }
    if (n.group) { const kids = n.group.map(node).filter(Boolean); return kids.length ? <div key={k} style={{ display: 'grid', gap: inside }}>{kids}</div> : null; }
    if (n.list) return job(n.list);
    if (n.stack) return n.stack.map(node);
    return null;
  };
  const radius = { none: 0, medium: s.radius, large: s.radius * 1.6 }[g.container.shape] ?? s.radius;
  const pad = g.container.ground === 'none' && g.container.edge === 'none' ? 0 : s.body * (g.density === 'compact' ? 1.25 : g.density === 'airy' ? 2.25 : 1.75);
  return (
    <article data-direction style={{
      display: 'flex', flexDirection: 'column', gap: between, width: `${(g.fit.width[0] + g.fit.width[1]) / 2 * s.body}px`, maxWidth: '100%',
      padding: pad, borderRadius: radius, background: ground.bg, color: ground.ink, border: g.container.edge === 'line' ? `1px solid ${ground.edge}` : 'none',
      ['--dir-ink']: ground.ink, ['--dir-quiet']: ground.quiet, ['--dir-edge']: ground.edge, ['--dir-action']: ground.action, ['--dir-on-action']: ground.onAction,
    }}>
      {node(g.nesting.stack ? g.nesting : { stack: g.order })}
    </article>
  );
}

// a colour role on a ground: words and marks read their ink from the ground, never from a value written here
export const ink = (colour, ground) => ({ quieter: ground.quiet, 'the-action': ground.action, link: ground.action, chip: ground.ink }[colour] ?? ground.ink);
