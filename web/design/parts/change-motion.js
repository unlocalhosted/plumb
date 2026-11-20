// The design site's page for how a change moves (2026-11-20): every kind of fix landing on the page, one tile each,
// drawn by the overlay's own module (overlay/src/show-motion.js). Polish the motion there: this page, the demo and
// Clean up's show all draw from it.
import { BOARD_CSS, mountMotionBoard } from '../../../overlay/src/show-motion.js';

export function mount(host, root, css) {
  root.innerHTML = `<style>${css}${BOARD_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    .prose { margin: 0 0 22px; max-width: 680px; }
    .prose p { margin: 0 0 10px; font: 400 15px/24px var(--pl-sans); color: var(--pl-text-secondary); }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .bar { display: flex; justify-content: flex-end; margin: 0 0 8px; }
    .bar button { font: 600 13px var(--pl-sans); padding: 8px 14px; border-radius: 10px; border: 0; background: var(--pl-pink); color: #fff; cursor: pointer; }</style>
    <div class="prose"><p>Every change plays the same four beats. <b>The guides draw in</b>: hairlines at the edges that change, an I-beam, the value in a pill. <b>The page moves</b> on the overlay’s spring, and the guides and the space’s pattern follow it every frame. <b>The number rolls and lands</b>: coral while it is off your scale, sky once it is on, named by its step. <b>The guides go</b>, and the change stays.</p>
    <p>A length is drawn as a length, a time as a bar that shrinks, a colour as a ring with the swatch crossing over. Press Play on any one.</p></div>
    <div class="bar"><button type="button" class="all">Play all</button></div><div class="board"></div>`;
  const b = mountMotionBoard(root.querySelector('.board'), { tokensCss: css });
  root.querySelector('.all').onclick = b.playAll;
}
