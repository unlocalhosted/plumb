import{r as e,j as a}from"./live-XOUlSUgi.js";function S({variant:i="primary",size:o="md",loading:r=!1,icon:u,iconRight:s,children:c,className:E,disabled:B,onClick:C,onPointerEnter:M,type:$="button",ref:b,...g}){const d=typeof c=="string"?c:void 0,v=c!=null&&c!==!1&&c!=="",l=!v&&!!(u||s),I=W.includes(i)?i:"primary",N=A.includes(o)?o:"md",m=e.useRef(null),x=e.useRef(0),[T,L]=e.useState(!1);e.useEffect(()=>L(!0),[]);const y=d??"label",w=r&&u?"spinner":z(u),_=z(s),p=`${y}|${w}|${_}`,k=e.useRef(p);return e.useLayoutEffect(()=>{const t=m.current;if(!t)return;const n=t.getBoundingClientRect().width,f=x.current,R=k.current!==p;x.current=n,k.current=p,!(!R||!f||Math.abs(f-n)<.5)&&(window.matchMedia("(prefers-reduced-motion: reduce)").matches||t.animate([{width:`${f}px`},{width:`${n}px`}],{duration:480,easing:"cubic-bezier(0.25, 1, 0.5, 1)"}))}),a.jsxs(a.Fragment,{children:[a.jsx("style",{href:"ui-button-clean",precedence:"default",children:D}),a.jsxs("button",{type:$,className:["ui-buttonc",E].filter(Boolean).join(" "),"data-variant":I,"data-size":N,"data-loading":r||void 0,"data-icon-only":l||void 0,"data-icon-left":!l&&!!u||void 0,"data-icon-right":!l&&!!s||void 0,"data-ready":T||void 0,ref:t=>{m.current=t,typeof b=="function"?b(t):b&&(b.current=t)},disabled:B,"aria-busy":r||void 0,"aria-disabled":r||void 0,onClick:t=>{if(r){t.preventDefault();return}C?.(t)},onPointerEnter:t=>{const n=t.currentTarget.querySelector(".ui-buttonc__label");n&&d&&!g.title&&(n.title=n.scrollWidth>n.clientWidth+1?d:""),M?.(t)},...g,children:[u&&a.jsx("span",{className:"ui-buttonc__icon","aria-hidden":"true",onErrorCapture:j,children:r?a.jsx(K,{}):u},`icon-${w}`),v&&a.jsx("span",{className:"ui-buttonc__label","data-text":d,dir:"auto",children:c},`label-${y}`),s&&a.jsx("span",{className:"ui-buttonc__icon","aria-hidden":"true",onErrorCapture:j,children:s},`icon-right-${_}`)]})]})}const W=["primary","secondary","ghost","destructive"],A=["sm","md","lg"],j=i=>{i.target instanceof HTMLImageElement&&(i.target.style.visibility="hidden")},K=()=>a.jsxs("svg",{className:"ui-buttonc__spinner",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",children:[a.jsx("circle",{cx:"12",cy:"12",r:"8.5",opacity:.2}),a.jsx("path",{d:"M12 3.5a8.5 8.5 0 0 1 8.5 8.5"})]}),h=new WeakMap;let O=1;function z(i){if(!e.isValidElement(i)||typeof i.type=="string")return 0;const o=i.type;return h.has(o)||h.set(o,O++),h.get(o)}const D=`
/* Colors and motion as variables – override them on .ui-buttonc (see Theming in the docs) */
.ui-buttonc {
  --ui-btnc-title: var(--aui-ink, #000);
  --ui-btnc-ink: var(--aui-ink, rgba(0, 0, 0, 0.88));
  --ui-btnc-muted: var(--aui-muted, rgba(0, 0, 0, 0.61));
  --ui-btnc-icon: var(--aui-muted, rgba(0, 0, 0, 0.447));
  --ui-btnc-solid: var(--aui-primary, rgba(0, 0, 0, 0.88));
  --ui-btnc-solid-hover: rgba(0, 0, 0, 0.8);
  --ui-btnc-on-solid: var(--aui-on-primary, #fcfcfc);
  --ui-btnc-surface: var(--aui-surface, #ffffff);
  --ui-btnc-shadow: 0 0 0 0.5px var(--aui-border, rgba(0, 0, 0, 0.06)), 0 1px 1px -1px rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --ui-btnc-shadow-hover: 0 0 0 0.5px var(--aui-border-strong, rgba(0, 0, 0, 0.1)), 0 1px 1px -1px rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.07);
  --ui-btnc-wash: rgba(0, 0, 0, 0.03);
  --ui-btnc-danger: var(--aui-danger, #c4320a);
  --ui-btnc-danger-bg: color-mix(in srgb, var(--aui-red, #f04438) 8%, transparent);
  --ui-btnc-danger-bg-hover: color-mix(in srgb, var(--aui-red, #f04438) 12%, transparent);
  --ui-btnc-shine: rgba(255, 255, 255, 0.82);
  --ui-btnc-shine-on-solid: #ffffff;
  --ui-btnc-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
  --ui-btnc-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ui-btnc-load: 650ms;

  --h: 28px;
  --px: 10px;
  --gap: 6px;
  --fs: 13px;
  --lh: 20px;
  --icon: 16px;
  --radius: var(--aui-radius, 6px);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap);
  box-sizing: border-box;
  height: var(--h);
  padding: 0 var(--px);
  margin: 0;
  border: 0;
  border-radius: var(--radius);
  font-family: var(--aui-font, "Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: var(--fs);
  font-weight: 500;
  line-height: var(--lh);
  letter-spacing: 0;
  max-width: 100%;
  min-width: 0;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease,
    transform 160ms var(--ui-btnc-ease),
    opacity 140ms ease;
}

/* Sizes: 24 · 28 · 32 high (taller on touch screens, see below) */
.ui-buttonc[data-size="sm"] {
  --h: 24px;
  --px: 8px;
  --gap: 4px;
  --fs: 12px;
  --lh: 16px;
  --icon: 14px;
  --radius: var(--aui-radius, 6px);
}
.ui-buttonc[data-size="lg"] {
  --h: 32px;
  --px: 12px;
  --gap: 6px;
  --fs: 13px;
  --icon: 16px;
  --radius: var(--aui-radius, 6px);
}
/* Touch screens: every size grows to a comfortable tap height – 32 · 34 · 36 – the look stays the same */
@media (pointer: coarse) {
  .ui-buttonc[data-size="sm"] { --h: 32px; }
  .ui-buttonc[data-size="md"] { --h: 34px; }
  .ui-buttonc[data-size="lg"] { --h: 36px; }
}
/* An icon sits closer to the edge than the text, so both look evenly spaced */
.ui-buttonc[data-icon-left] {
  padding-left: calc(var(--px) - 2px);
}
.ui-buttonc[data-icon-right] {
  padding-right: calc(var(--px) - 2px);
}
.ui-buttonc[data-icon-only] {
  width: var(--h);
  padding: 0;
}

/* primary: a dark chip */
.ui-buttonc[data-variant="primary"] {
  background: var(--ui-btnc-solid);
  color: var(--ui-btnc-on-solid);
}
.ui-buttonc[data-variant="primary"]:hover:not(:disabled) {
  background: var(--ui-btnc-solid-hover);
}

/* secondary: white with the card's hairline shadow */
.ui-buttonc[data-variant="secondary"] {
  background: var(--ui-btnc-surface);
  color: var(--ui-btnc-title);
  box-shadow: var(--ui-btnc-shadow);
}
.ui-buttonc[data-variant="secondary"] .ui-buttonc__icon {
  color: var(--ui-btnc-icon);
}
.ui-buttonc[data-variant="secondary"]:hover:not(:disabled) {
  box-shadow: var(--ui-btnc-shadow-hover);
}

/* ghost: a muted label, a soft wash appears on hover */
.ui-buttonc[data-variant="ghost"] {
  background: transparent;
  color: var(--ui-btnc-muted);
}
.ui-buttonc[data-variant="ghost"] .ui-buttonc__icon {
  color: var(--ui-btnc-icon);
}
.ui-buttonc[data-variant="ghost"]:hover:not(:disabled) {
  background: var(--ui-btnc-wash);
  color: var(--ui-btnc-ink);
}
.ui-buttonc[data-variant="ghost"]:hover:not(:disabled) .ui-buttonc__icon {
  color: var(--ui-btnc-ink);
}

/* destructive: red label on a minimal red fill, no stroke */
.ui-buttonc[data-variant="destructive"] {
  background: var(--ui-btnc-danger-bg);
  color: var(--ui-btnc-danger);
}
.ui-buttonc[data-variant="destructive"]:hover:not(:disabled) {
  background: var(--ui-btnc-danger-bg-hover);
}

.ui-buttonc .ui-buttonc__icon {
  transition: color 140ms ease;
}
.ui-buttonc:active:not(:disabled):not([data-loading]) {
  transform: scale(0.97);
}
.ui-buttonc:focus-visible {
  outline: 2px solid var(--ui-btnc-focus);
  outline-offset: 2px;
}
.ui-buttonc:disabled {
  opacity: 0.4;
  cursor: default;
}
.ui-buttonc[data-loading] {
  cursor: default;
}

.ui-buttonc__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--icon);
  height: var(--icon);
}
.ui-buttonc__icon {
  overflow: hidden;
}
.ui-buttonc__icon > svg,
.ui-buttonc__icon > img {
  display: block;
  width: 100%;
  height: 100%;
}
.ui-buttonc__icon > img {
  object-fit: contain;
}

/* Morph: the button clips while its width glides; changed parts blur in */
.ui-buttonc {
  overflow: clip;
}
.ui-buttonc[data-ready] .ui-buttonc__label {
  animation: ui-buttonc-label-in 480ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
.ui-buttonc[data-ready] .ui-buttonc__icon {
  animation: ui-buttonc-icon-in 520ms cubic-bezier(0.25, 1, 0.5, 1) both;
}

/* Loading: a light band sweeps across a copy of the dimmed label */
/* A label too long for its parent ends in "…" – the full text shows on hover */
.ui-buttonc__label {
  position: relative;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ui-buttonc__label::after {
  content: attr(data-text);
  content: attr(data-text) / "";
  position: absolute;
  inset: 0;
  white-space: nowrap;
  color: transparent;
  background: linear-gradient(90deg, transparent 38%, var(--ui-btnc-shine) 50%, transparent 62%) 100% 0 / 300% 100%
    no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  opacity: 0;
  pointer-events: none;
}
.ui-buttonc[data-variant="primary"] .ui-buttonc__label::after {
  --ui-btnc-shine: var(--ui-btnc-shine-on-solid);
}
.ui-buttonc[data-loading] .ui-buttonc__label {
  color: color-mix(in srgb, currentColor 50%, transparent);
}
.ui-buttonc[data-loading] .ui-buttonc__label::after {
  opacity: 1;
  animation: ui-buttonc-sweep calc(var(--ui-btnc-load) * 1.6) linear infinite;
}
.ui-buttonc__spinner {
  animation: ui-buttonc-spin 900ms linear infinite;
}

@keyframes ui-buttonc-label-in {
  from {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(25%);
  }
}
@keyframes ui-buttonc-icon-in {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: scale(0.7);
  }
}

@keyframes ui-buttonc-spin {
  to {
    transform: rotate(1turn);
  }
}

@keyframes ui-buttonc-sweep {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-buttonc[data-ready] .ui-buttonc__label,
  .ui-buttonc[data-ready] .ui-buttonc__icon {
    animation: none;
  }
  .ui-buttonc {
    transition-duration: 1ms;
  }
  .ui-buttonc[data-loading] .ui-buttonc__label::after {
    animation: none;
    opacity: 0;
  }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .ui-buttonc {
  /* primary inverts: a light chip with dark text */
  --ui-btnc-solid: var(--aui-primary, rgba(255, 255, 255, 0.9));
  --ui-btnc-solid-hover: rgba(255, 255, 255, 0.82);
  --ui-btnc-on-solid: var(--aui-on-primary, #161618);
  --ui-btnc-shine-on-solid: #ffffff;

  --ui-btnc-title: var(--aui-ink, rgba(255, 255, 255, 0.9));
  --ui-btnc-ink: var(--aui-ink, rgba(255, 255, 255, 0.9));
  --ui-btnc-muted: var(--aui-muted, rgba(255, 255, 255, 0.62));
  --ui-btnc-icon: var(--aui-muted, rgba(255, 255, 255, 0.5));
  --ui-btnc-surface: var(--aui-surface, #1c1c1e);
  --ui-btnc-shadow: 0 0 0 0.5px var(--aui-border, rgba(255, 255, 255, 0.1)), 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --ui-btnc-shadow-hover: 0 0 0 0.5px var(--aui-border-strong, rgba(255, 255, 255, 0.16)), 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --ui-btnc-wash: rgba(255, 255, 255, 0.06);
  --ui-btnc-danger: var(--aui-danger, #ff8a7a);
  --ui-btnc-danger-bg: color-mix(in srgb, var(--aui-red, #ff6b5f) 14%, transparent);
  --ui-btnc-danger-bg-hover: color-mix(in srgb, var(--aui-red, #ff6b5f) 20%, transparent);
  --ui-btnc-shine: #ffffff;
  --ui-btnc-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
}

/* Hover of the primary button follows its fill – also a brand color from --aui-primary. Browsers without
   color-mix() (Safari before 16.2) keep the fixed hover above */
@supports (color: color-mix(in srgb, red 50%, transparent)) {
  .ui-buttonc {
    --ui-btnc-solid-hover: color-mix(in srgb, var(--ui-btnc-solid) 91%, transparent);
  }
}
`,G=Object.freeze(Object.defineProperty({__proto__:null,Button:S},Symbol.toStringTag,{value:"Module"})),V=S??void 0??Object.values(G).find(i=>typeof i=="function");function P(){return a.jsx("div",{"data-part":"affectui__button-clean",children:a.jsx(V,{text:"Get started",label:"Get started",children:"Get started"})})}export{P as default};
