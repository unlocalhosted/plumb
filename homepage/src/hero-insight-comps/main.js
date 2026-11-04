// Fills the three hero comps from one screen template, then draws each comp's marks measured from the screen.
const tpl = document.getElementById('screen');
for (const layer of document.querySelectorAll('[data-screen]')) {
  layer.append(tpl.content.cloneNode(true));
  layer.firstElementChild.dataset.kind = layer.dataset.screen;
}

// what each mistake is called, in the overlay's words where it has them (overlay/src/words.js)
const NAMES = {
  18: ['One word alone', 'No widows in headings'],
  space: ['gap-[13px] hardcodes 13px', 'Spacing on your theme'],
  2: ['Icon looks off-centre', 'Optical centre beats geometric centre'],
  16: ['Figures don’t line up', 'Tabular figures'],
  21: ['Grey shadow on colour', 'Shadows are tinted, not grey'],
};

// the heading must really be widowed as written: narrow it until exactly one word sits on its last line (the fixed
// copy keeps the same width and balances)
function widow() {
  for (const h of document.querySelectorAll('.hs[data-kind="messy"] .hs-title')) {
    h.style.width = '';
    const lastLine = () => { const t = h.firstChild, words = h.textContent.split(' '), r = document.createRange(); let i = 0; const tops = [];
      for (const w of words) { r.setStart(t, i); r.setEnd(t, i + w.length); tops.push(Math.round(r.getBoundingClientRect().top)); i += w.length + 1; }
      return tops.filter(x => x === tops.at(-1)).length; };
    for (let w = 640; w > 380; w -= 4) { h.style.width = `${w}px`; if (lastLine() === 1) break; }
    h.closest('.hc-frame').querySelectorAll('.hs[data-kind="clean"] .hs-title').forEach(c => { c.style.width = h.style.width; });
  }
}

function draw() {
  for (const layer of document.querySelectorAll('[data-tags], [data-pins], [data-zoom]')) {
    layer.querySelector('.hc-marks')?.remove();
    const frame = layer.closest('.hc-frame'), f = frame.getBoundingClientRect(), wrap = document.createElement('div');
    wrap.className = 'hc-marks';
    // A names only the mistakes wholly on its as-written side (left of the split at 62%); a tag cut by the line reads broken
    const split = f.left + f.width * 0.62;
    const issues = [...layer.querySelectorAll('[data-issue]')].filter(el => !layer.hasAttribute('data-tags') || el.getBoundingClientRect().right < split);
    const at = el => { const r = el.getBoundingClientRect(); return { x: r.left - f.left, y: r.top - f.top, w: r.width, h: r.height }; };
    if (layer.hasAttribute('data-tags') || layer.hasAttribute('data-pins')) {
      issues.forEach((el, i) => {
        const r = at(el), [name, rule] = NAMES[el.dataset.issue];
        wrap.insertAdjacentHTML('beforeend', `<span class="hc-box" style="left:${r.x - 3}px;top:${r.y - 3}px;width:${r.w + 6}px;height:${r.h + 6}px"></span>`);
        // a pin's label opens to the right, or to the left when it would run off the frame
        const flip = r.x + r.w > f.width - 260;
        // the play pin's label wraps so it stays inside the video, off the figures beside it
        // the grid-wide space pins at its bottom-left corner, clear of the pins on the cards inside it
        const wide = el.dataset.issue === 'space', px = wide ? r.x - 10 : r.x + r.w - 8, py = wide ? r.y + r.h - 8 : r.y - 10;
        if (layer.hasAttribute('data-pins')) wrap.insertAdjacentHTML('beforeend', `<span class="hc-pin${flip && !wide ? ' hc-pin-left' : ''}${el.dataset.issue === '2' ? ' hc-pin-narrow' : ''}" style="left:${px}px;top:${py}px"><b>${i + 1}</b><span><em>${name}</em><small>${rule}</small></span></span>`);
        else wrap.insertAdjacentHTML('beforeend', `<span class="hc-tag" style="left:${r.x - 3}px;top:${r.y - 24}px">${name}</span>`);
      });
    } else {
      // C: the camera on the play button, its two centre lines, the measured number
      layer.querySelector('.hs').style.cssText = ''; // measure the screen as drawn, never an already-zoomed one
      const btn = layer.querySelector('.hs-play'), svg = btn.querySelector('svg'), b = btn.getBoundingClientRect(), v = svg.getBoundingClientRect();
      const k = 3.2, cx = b.left + b.width / 2 - f.left, cy = b.top + b.height / 2 - f.top;
      const fw = f.width, fh = f.height;
      layer.querySelector('.hs').style.cssText = `transform-origin:0 0;transform:translate(${fw / 2 - k * cx}px,${fh / 2 - k * cy}px) scale(${k})`;
      const bx = fw / 2, by = fh / 2, half = (b.width * k) / 2;
      const weight = (v.left - b.left + v.width * (11 / 24)) * k - half; // the triangle's weight sits at x 11 of 24
      wrap.insertAdjacentHTML('beforeend', `<svg class="hc-guides" width="${fw}" height="${fh}"><line x1="${bx}" y1="${by - half - 30}" x2="${bx}" y2="${by + half + 30}"/><line class="w" x1="${bx + weight}" y1="${by - 70}" x2="${bx + weight}" y2="${by + 70}"/></svg>`);
      wrap.insertAdjacentHTML('beforeend', `<span class="hc-big-pill" style="left:${bx}px;top:${by - half - 64}px">${(Math.abs(weight) / k).toFixed(1)}px · Icon looks off-centre</span>`);
    }
    frame.append(wrap);
  }
}
document.fonts.ready.then(() => requestAnimationFrame(() => { widow(); draw(); }));
addEventListener('resize', () => requestAnimationFrame(() => { widow(); draw(); }));
