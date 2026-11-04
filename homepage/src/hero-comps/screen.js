// The hero's app screen: a team's Projects dashboard, drawn twice from one template. "messy" is how it was written in
// a hurry (sizes and spaces picked one at a time); "clean" is after Plumber's clean-up (every one on the scale).
// Each value that changes is named, so the comps can mark it.
const V = {
  // as written, each card and row got its own value; settled, each kind of thing has one
  messy: { title: 27, pad: [14, 18, 21], gap: [7, 11, 13], text: [13.5, 13, 14, 13.5], label: [11.5, 12, 11], row: [9, 10, 8, 9], stat: [26, 28, 25], side: 10 },
  clean: { title: 24, pad: [16, 16, 16], gap: [8, 12, 12], text: [13, 13, 13, 13], label: [12, 12, 12], row: [12, 12, 12, 12], stat: [28, 28, 28], side: 12 },
};
const PROJECTS = [
  ['Checkout redesign', 'On track', 'on', 72, 'AO', 330],
  ['Members & roles', 'At risk', 'off', 41, 'RM', 230],
  ['Billing migration', 'On track', 'on', 88, 'LB', 80],
  ['Onboarding emails', 'Not started', 'idle', 0, 'KS', 160],
];

export function screen(kind) {
  const v = V[kind];
  return `
  <div class="app" data-kind="${kind}">
    <aside class="app-side" style="gap:${v.side - 8}px">
      <span class="app-brand"><i></i>Northwind</span>
      ${['Inbox', 'Projects', 'Roadmap', 'Members', 'Settings'].map(n => `<a class="${n === 'Projects' ? 'on' : ''}" style="padding:${v.side - 4}px 10px">${n}</a>`).join('')}
    </aside>
    <div class="app-main">
      <header class="app-top"><span class="app-search">Search projects</span><span class="app-new">New project</span></header>
      <div class="app-body" style="gap:${v.gap[2]}px">
        <h3 class="app-title" style="font-size:${v.title}px" data-mark="text">Projects</h3>
        <div class="app-stats" style="gap:${v.gap[1]}px" data-mark="gap">
          ${[['Active', 12], ['Due this week', 4], ['Overdue', 1]].map(([l, n], i) => `
            <div class="app-stat" style="padding:${v.pad[i]}px" data-mark="pad"${i === 1 ? ' data-pixel' : ''}><small style="font-size:${v.label[i]}px" data-mark="text">${l}</small><b style="font-size:${v.stat[i]}px" data-mark="text">${n}</b></div>`).join('')}
        </div>
        <div class="app-table" data-mark="pad" style="padding:${v.pad[0] - 6}px ${v.pad[1] - 4}px">
          ${PROJECTS.map(([name, state, tone, pct, who, h], i) => `
            <div class="app-row" style="gap:${v.gap[0] + 4}px;padding:${v.row[i]}px 0;font-size:${v.text[i]}px" data-mark="gap">
              <span class="app-name" data-mark="text">${name}</span>
              <span class="app-chip app-chip-${tone}">${state}</span>
              <span class="app-bar"><i style="width:${pct}%"></i></span>
              <i class="app-av" style="--h:${h}">${who}</i>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// The marks Plumber's spacing pass draws, measured from the screen as rendered: bands for padding and gaps. (Text is
// left unmarked: on a whole screen, line boxes everywhere bury the spaces.)
export function marks(root, tone) {
  const b = root.getBoundingClientRect(), out = [];
  const box = r => `left:${r.left - b.left}px;top:${r.top - b.top}px;width:${r.width}px;height:${r.height}px`;
  for (const el of root.querySelectorAll('[data-mark]')) {
    const r = el.getBoundingClientRect(), css = getComputedStyle(el), kind = el.dataset.mark;
    if (kind === 'text') continue;
    if (kind === 'pad') out.push(`<span class="mk mk-pad" data-tone="${tone}" style="${box(r)};padding:${css.padding};border-radius:${css.borderRadius}"></span>`);
    else {
      const kids = [...el.children].map(k => k.getBoundingClientRect());
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1], z = kids[i];
        const g = z.top >= a.bottom - 1 ? { left: r.left, top: a.bottom, width: r.width, height: z.top - a.bottom } : { left: a.right, top: r.top, width: z.left - a.right, height: r.height };
        if (g.width > 0 && g.height > 0) out.push(`<span class="mk mk-gap" data-tone="${tone}" style="${box(g)}"></span>`);
      }
    }
  }
  return out.join('');
}
