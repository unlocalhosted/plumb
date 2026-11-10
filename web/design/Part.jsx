'use client';
// One page of the design system, drawn by its module (web/design/parts/<id>.js) inside a shadow root, with the
// overlay's own tokens and source: what you see here is the product's code, not a copy of it.
import { useEffect, useRef } from 'react';
import { useScheme } from '../site/Bar.jsx';

const LOAD = {
  color: () => import('./parts/color.js'),
  type: () => import('./parts/type.js'),
  icons: () => import('./parts/icons.js'),
  buttons: () => import('./parts/buttons.js'),
  'fix-bar': () => import('./parts/fix-bar.js'),
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
    });
    host.addEventListener('kit:flip', flip);
    return () => { gone = true; host.removeEventListener('kit:flip', flip); };
  }, [id, css]);
  return <div ref={ref} data-scheme={scheme} />;
}
