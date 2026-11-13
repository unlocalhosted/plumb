// The burst: when a fix lands, its check bursts into pieces of the visual language itself (a hatched padding square, a
// striped gap, a dotted margin, a tick), thrown up and falling under gravity. The fix bar plays it when a page is
// clear; the homepage plays it when an example's fix lands. One canvas over the page for its life, then removed.
export const BURST = { pieces: 40, speed: [380, 760], spread: 1.1, gravity: 1100, spin: 9, life: 1600, size: [7, 11] };

// root: where the canvas goes (a document's body or a shadow root); ox, oy: where it bursts from, in viewport pixels;
// frames: who runs the frames (the fix bar's lifecycle, so a closed panel stops it), else requestAnimationFrame
export function burst(root, ox, oy, { frames, pieces = BURST.pieces } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const B = { ...BURST, pieces }, dpr = devicePixelRatio || 1;
  const cv = Object.assign(document.createElement('canvas'), { className: 'fx-burst', width: innerWidth * dpr, height: innerHeight * dpr });
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:3';
  root.append(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const HUES = { pad: '#1a9e62', gap: '#7a5cf0', mar: '#e2800a', ink: '#1c1b19' }, rand = (a, b) => a + Math.random() * (b - a);
    const kinds = ['pad', 'pad', 'gap', 'gap', 'mar', 'mar', 'ink'];
    const parts = Array.from({ length: B.pieces }, (_, i) => { const a = -Math.PI / 2 + rand(-B.spread, B.spread), v = rand(...B.speed); return { kind: kinds[i % kinds.length], x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(0, Math.PI * 2), vr: rand(-B.spin, B.spin), size: rand(...B.size), wobble: rand(0, 6) }; });
    const paint = (p, alpha) => {
      const s = p.size, c = HUES[p.kind];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = alpha; ctx.scale(1, Math.abs(Math.cos(p.r * 0.6 + p.wobble)) * 0.6 + 0.4);
      if (p.kind === 'pad') { ctx.fillStyle = '#fff'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.beginPath(); for (let k = -s; k < s; k += 2.6) { ctx.moveTo(k - s / 2, s / 2); ctx.lineTo(k + s / 2, -s / 2); } ctx.save(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip(); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
      else if (p.kind === 'gap') { const w = s * 1.5, h = s * 0.62; ctx.fillStyle = c; for (let k = 0; k < 3; k++) ctx.fillRect(-w / 2, -h / 2 + k * (h / 2.5), w, h / 5); }
      else if (p.kind === 'mar') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.globalAlpha = alpha * 0.25; ctx.fill(); ctx.globalAlpha = alpha; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { ctx.beginPath(); ctx.arc(dx * s * 0.2, dy * s * 0.2, 1, 0, Math.PI * 2); ctx.fill(); } }
      else { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(-s * 0.1, s * 0.3); ctx.lineTo(s * 0.45, -s * 0.35); ctx.stroke(); }
      ctx.restore();
    };
    let last = performance.now(); const t0 = last;
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000), t = now - t0; last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) { p.vy += B.gravity * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; paint(p, Math.max(0, Math.min(1, (B.life - t) / (B.life / 3)))); }
      if (t < B.life) return true;
      cv.remove(); return false;
    };
  const run = frames ?? ((f) => { const step = (now) => { if (f(now)) requestAnimationFrame(step); }; requestAnimationFrame(step); });
  run(tick);
}
