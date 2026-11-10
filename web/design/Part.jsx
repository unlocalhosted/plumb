'use client';
// One page of the design system, drawn by its module (web/design/parts/<id>.js) inside a shadow root, with the
// overlay's own tokens and source: what you see here is the product's code, not a copy of it.
import { useEffect, useRef } from 'react';
import { useScheme } from '../site/Bar.jsx';
import { soften } from '../../overlay/src/soft.js';

const PAGE_CSS = `
  :host { --pl-round-w: 750; --pl-round-w2: 800; --pl-round: var(--font-round), ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", system-ui, sans-serif;
    --pl-sans: var(--font-body), system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  h2, .set h2 { margin: 0 0 6px; font: var(--pl-round-w, 600) 28px/32px var(--pl-round); letter-spacing: -0.01em; color: var(--pl-ink); }
  h2:not(:first-child) { margin-top: 56px; }
  h2 + p, .set > p, .prose p { font: 500 16.5px/26px var(--pl-sans); color: var(--pl-ink-2); max-width: 660px; }
  .set { margin: 0 0 56px; padding: 0; background: none; box-shadow: none; border-radius: 0; }
  .band { display: none; }
  .cell, figure.toy { border-radius: 20px; }
  .cell b, figure.toy figcaption, .hue .top b, .style .meta b, .card .hd h3, .steps b, .chip b, .rung b, .anat ol b { font-family: var(--pl-round); font-weight: var(--pl-round-w, 600); letter-spacing: 0; }
  figure.toy figcaption small, .cell small { font-family: var(--pl-sans); font-weight: 400; letter-spacing: 0; }
  .card, .tbl, .styles, .ladder, .open, .hue, ol.rules { box-shadow: none; background: var(--pl-paper-2); border-radius: 22px; }
  .tr.th { background: none; }
  .tr, .style, .steps, .steps div { border-color: color-mix(in oklab, var(--pl-ink) 8%, transparent); }
  .scene h2 { font-size: 20px; line-height: 24px; }
`;

const LOAD = {
  identity: () => import('./parts/identity.js'),
  color: () => import('./parts/color.js'),
  type: () => import('./parts/type.js'),
  icons: () => import('./parts/icons.js'),
  buttons: () => import('./parts/buttons.js'),
  'fix-bar': () => import('./parts/fix-bar.js'),
  pickers: () => import('./parts/pickers.js'),
  'text-ideas': () => import('./parts/text-ideas.js'),
  'colour-ideas': () => import('./parts/colour-ideas.js'),
  space: () => import('./parts/space.js'),
};

export function Part({ id, css }) {
  const ref = useRef(null);
  const [scheme, flip] = useScheme();
  useEffect(() => {
    const host = ref.current;
    let gone = false;
    LOAD[id]().then(({ mount }) => {
      if (gone) return;
      const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      root.replaceChildren();
      mount(host, root, css);
      // every page of the system is set the same way: the toy face for titles and names, sections without boxes
      // around them (an outline around a pale fill is a wireframe, not a toy), room between them
      const page = document.createElement('style');
      page.textContent = PAGE_CSS;
      root.append(page);
      soften(root); // soft blocks and toy buttons on the page answer a press
    });
    host.addEventListener('kit:flip', flip);
    return () => { gone = true; host.removeEventListener('kit:flip', flip); };
  }, [id, css]);
  return <div ref={ref} data-scheme={scheme} />;
}
