// The motion numbers from a frame-by-frame trace (data/record.mjs, sandbox/record-all.mjs share them).
// ── From traces to numbers ───────────────────────────────────────────────────────────────────────────────────────
// For each element and property, the runs of change: when a change starts (after which mark), how long until it
// stops, how far it went, and how far past its end it travelled before settling (overshoot, as a share of the travel).
// Colours as OKLab distance (ΔE ×100: about 2 is just visible, 10 plainly different). The words' faintest opacity.
export function measure(rec) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lab = ([r, g, b]) => { const [R, G, B] = [r, g, b].map(lin); const l = Math.cbrt(0.4122 * R + 0.5363 * G + 0.0514 * B), m = Math.cbrt(0.2119 * R + 0.6807 * G + 0.1074 * B), s = Math.cbrt(0.0883 * R + 0.2817 * G + 0.6299 * B); return [0.2105 * l + 0.7936 * m - 0.0041 * s, 1.978 * l - 2.4286 * m + 0.4506 * s, 0.0259 * l + 0.7828 * m - 0.8087 * s]; };
  const dE = (a, b) => { const [x, y] = [lab(a), lab(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; };
  const after = (t) => [...rec.marks].reverse().find((m) => m.t <= t) ?? { name: 'start', t: 0 };
  const series = new Map();
  for (const fr of rec.frames) for (const e of fr.els) { if (!series.has(e.id)) series.set(e.id, []); series.get(e.id).push({ t: fr.t, ...e }); }
  const motions = [], colours = [];
  const PROPS = { x: 1, y: 1, w: 1, h: 1, sc: 0.01, o: 0.02 };
  for (const [eid, s] of series) {
    for (const [prop, eps] of Object.entries(PROPS)) {
      let i = 1;
      while (i < s.length) {
        if (Math.abs(s[i][prop] - s[i - 1][prop]) <= eps * 0.2) { i++; continue; }
        // a run: from the frame before the first change to the last frame that still changes (gaps under 120ms join)
        const a = i - 1; let z = i, last = i;
        while (z < s.length && s[z].t - s[last].t < 120) { if (Math.abs(s[z][prop] - s[z - 1][prop]) > eps * 0.2) last = z; z++; }
        const from = s[a][prop], to = s[last][prop], travel = to - from;
        if (Math.abs(travel) >= eps) {
          const run = s.slice(a, last + 1).map((q) => q[prop]);
          const beyond = Math.max(0, ...run.map((q) => (travel > 0 ? q - to : to - q)));
          const m = after(s[a].t);
          // overshoot is only read on a real move: on a few pixels it is noise (a 3px wobble is not a 158% overshoot)
          const real = prop === 'o' || prop === 'sc' ? Math.abs(travel) >= 0.1 : Math.abs(travel) >= 8;
          motions.push({ el: rec.labels[eid], prop, after: m.name, startMs: s[a].t - m.t, durationMs: s[last].t - s[a].t, from: +from.toFixed(2), to: +to.toFixed(2), overshootPct: real ? +(beyond / Math.abs(travel) * 100).toFixed(1) : null });
        }
        i = last + 1;
      }
    }
    for (const prop of ['bg', 'fg']) {
      const vis = s.filter((q) => q[prop][3] > 0); if (vis.length < 2) continue;
      for (let i = 1; i < vis.length; i++) {
        if (dE(vis[i][prop], vis[i - 1][prop]) < 0.5) continue;
        let last = i; while (last + 1 < vis.length && dE(vis[last + 1][prop], vis[last][prop]) >= 0.5) last++;
        const d = dE(vis[i - 1][prop], vis[last][prop]), m = after(vis[i - 1].t);
        if (d >= 2) colours.push({ el: rec.labels[eid], prop: prop === 'bg' ? 'fill' : 'words', after: m.name, startMs: vis[i - 1].t - m.t, durationMs: vis[last].t - vis[i - 1].t, from: `rgb(${vis[i - 1][prop].slice(0, 3)})`, to: `rgb(${vis[last][prop].slice(0, 3)})`, deltaE: +d.toFixed(1) });
        i = last;
      }
    }
  }
  // the words: the faintest any of them got while the form was in use
  const words = [...series].filter(([eid]) => /“/.test(rec.labels[eid]) && !/decor/.test(rec.labels[eid]));
  const faintest = words.length ? Math.min(...words.flatMap(([, s]) => s.map((q) => q.o))) : null;
  const settle = motions.length ? Math.max(...motions.map((m) => m.durationMs)) : 0;
  // grouped: one row per moment and property, however many elements moved together (a cascade of letters is one row)
  const NAMES = { x: 'moves across', y: 'moves up or down', w: 'changes width', h: 'changes height', sc: 'scales', o: 'fades' };
  const groups = new Map();
  for (const m of motions) { const k = `${m.after}|${m.prop}`; const g = groups.get(k) ?? { after: m.after, does: NAMES[m.prop], elements: 0, firstMs: Infinity, lastMs: 0, longestMs: 0, biggest: 0, overshootPct: null }; g.elements++; g.firstMs = Math.min(g.firstMs, m.startMs); g.lastMs = Math.max(g.lastMs, m.startMs + m.durationMs); g.longestMs = Math.max(g.longestMs, m.durationMs); g.biggest = Math.max(g.biggest, +Math.abs(m.to - m.from).toFixed(2)); if (m.overshootPct != null) g.overshootPct = Math.max(g.overshootPct ?? 0, m.overshootPct); groups.set(k, g); }
  const real = motions.filter((m) => m.overshootPct != null);
  return { marks: rec.marks, movements: [...groups.values()], motions: motions.sort((a, b) => a.after.localeCompare(b.after) || a.startMs - b.startMs), colours, faintestWords: faintest, longestMovementMs: settle,
    maxOvershootPct: real.length ? Math.max(...real.map((m) => m.overshootPct)) : 0 };
}
