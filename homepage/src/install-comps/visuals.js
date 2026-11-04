// What each install step does, drawn small and true to the README's Quick start, injected wherever a comp has a
// [data-vis] slot. 1: the package lands in devDependencies. 2: `plumber init` writes the theme, plumber.config.ts and
// the baseline ledger. 3: `install --overlay --write` adds plumb() before react() in the Vite config. 4: holding Alt
// outlines the element under the pointer with its component and how many values are off the scale.
const VIS = {
  1: `<div class="v v-file"><p class="v-name">package.json</p>
      <pre><span class="p">"devDependencies": {</span><span class="v-add">+  "@unlocalhosted/react-plumber": "^0.2.0"</span><span class="p">}</span></pre></div>`,
  2: `<div class="v v-tree"><p class="v-name">written by init</p>
      <ul><li><i class="v-ico v-css"></i>app.css <small>@theme, your steps</small></li>
      <li><i class="v-ico v-ts"></i>plumber.config.ts</li>
      <li><i class="v-ico v-dir"></i>.plumber/ledger.jsonl <small>today’s baseline</small></li></ul></div>`,
  3: `<div class="v v-file"><p class="v-name">vite.config.ts</p>
      <pre><span class="v-del">-  plugins: [react()]</span><span class="v-add">+  plugins: [plumb(), react()]</span></pre></div>`,
  4: `<div class="v v-hold"><div class="v-card"><span class="v-outline"></span><b>Members</b><span class="v-row"></span><span class="v-row"></span>
      <span class="v-tag"><code>&lt;MembersCard&gt;</code> · 2 off the scale</span></div>
      <svg class="v-ptr" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.2 3 7 2.6-1.1-3-6.8H14z" /></svg></div>`,
};
for (const slot of document.querySelectorAll('[data-vis]')) slot.innerHTML = VIS[slot.dataset.vis];
