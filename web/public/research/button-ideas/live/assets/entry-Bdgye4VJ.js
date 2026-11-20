import{r as g,j as o}from"./live-XOUlSUgi.js";import{c as W}from"./utils-B2flkiZ-.js";import{u as D}from"./use-reduced-motion-D_3acLL0.js";import"./bundle-mjs-BeJYaOfh.js";import"./index-CXHAiFMv.js";const h="data-pc-away",K=/^(transform|translate|rotate|scale|cssOffset|offsetDistance|offsetPath|inset|top|right|bottom|left|margin|width|height)/,$=/^(transform|translate|rotate|scale|opacity)$/,B=/^(offset|easing|composite|computedOffset)$/;let E=!1;function F(c){let p="none";for(const d of c.getAnimations({subtree:!0})){const s=d.effect,t=d.animationName;if(!s||s.target!==c||typeof t!="string"||!t.startsWith("pc-")||s.getTiming().iterations!==1/0)continue;const n=s.getKeyframes().flatMap(r=>Object.keys(r)).filter(r=>!B.test(r));if(!(n.length&&n.every(r=>$.test(r)))){if(!s.pseudoElement&&n.some(r=>K.test(r)))return"moving";p="still"}}return p}function L(){if(E||typeof IntersectionObserver>"u"||typeof Element.prototype.getAnimations!="function")return;E=!0;const c=new WeakSet,p=new WeakMap,d=new IntersectionObserver(t=>{for(const n of t){const r=p.get(n.target);if(r){for(const i of r)i.isConnected?n.isIntersecting?i.removeAttribute(h):n.target.isConnected&&i.setAttribute(h,""):r.delete(i);r.size||(p.delete(n.target),d.unobserve(n.target))}}},{rootMargin:"200px"}),s=t=>{if(!t||c.has(t))return;const n=F(t);if(n==="none")return;const r=n==="moving"?t.parentElement:t;if(!r||r.getClientRects().length===0)return;c.add(t);const i=p.get(r);if(i){for(const b of i){b.hasAttribute(h)&&t.setAttribute(h,"");break}i.add(t)}else p.set(r,new Set([t])),d.observe(r)};for(const t of document.getAnimations())s(t.effect?.target??null);document.addEventListener("animationstart",t=>{t.animationName.startsWith("pc-")&&t.target instanceof Element&&s(t.target)},!0)}function U(){return g.useEffect(L,[]),null}const V=`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,q=`
:where(:root){
  --pc-ease-out:cubic-bezier(.23,1,.32,1);
  --pc-ease-out-expo:cubic-bezier(.16,1,.3,1);
  --pc-ease-in-out:cubic-bezier(.77,0,.175,1);
  --pc-ease-drawer:cubic-bezier(.32,.72,0,1);
  --pc-ease-spring:cubic-bezier(.34,1.56,.64,1);
  --pc-spring-css:var(--pc-ease-spring);
  --pc-grain:${V};
  --pc-hair:color-mix(in oklab,var(--foreground) 8%,transparent);
  --pc-sh:240 20% 15%;
  --pc-e1:0 0 0 1px var(--pc-hair),0 1px 2px hsl(var(--pc-sh)/.05);
  --pc-e2:0 0 0 1px var(--pc-hair),0 1px 1px hsl(var(--pc-sh)/.03),0 4px 8px -4px hsl(var(--pc-sh)/.06),0 12px 20px -8px hsl(var(--pc-sh)/.08);
  --pc-e3:0 0 0 1px var(--pc-hair),0 1px 1px hsl(var(--pc-sh)/.03),0 8px 16px -4px hsl(var(--pc-sh)/.07),0 24px 40px -12px hsl(var(--pc-sh)/.14);
  --pc-well:inset 0 1px 2px hsl(var(--pc-sh)/.06);
  --pc-sheen:linear-gradient(rgb(255 255 255/.1),transparent);
  --pc-edge-t:rgb(255 255 255/.22);
  --pc-edge-b:rgb(0 0 0/.12);
}
@supports (animation-timing-function:linear(0,1)){
  :where(:root){--pc-spring-css:linear(0,.042,.141,.267,.399,.526,.639,.735,.813,.875,.922,.957,.981,.997,1.007,1.012,1.015,1.015,1.014,1.012,1.01,1.008,1.007,1.005,1)}
}
:where(.dark){
  --pc-hair:rgb(255 255 255/.08);
  --pc-e1:inset 0 1px rgb(255 255 255/.06),0 0 0 1px rgb(0 0 0/.5),0 1px 2px rgb(0 0 0/.4);
  --pc-e2:inset 0 1px rgb(255 255 255/.08),inset 0 0 0 1px rgb(255 255 255/.04),0 0 0 1px rgb(0 0 0/.6),0 8px 24px -4px rgb(0 0 0/.5);
  --pc-e3:inset 0 1px rgb(255 255 255/.1),inset 0 0 0 1px rgb(255 255 255/.05),0 0 0 1px rgb(0 0 0/.7),0 30px 50px -8px rgb(0 0 0/.6);
  --pc-well:inset 0 1px 2px rgb(0 0 0/.35);
}
.pc-press{transition:scale 120ms var(--pc-ease-out),transform 200ms var(--pc-ease-out),background-color 150ms ease,border-color 150ms ease,color 150ms ease,box-shadow 150ms ease,opacity 150ms ease}
.pc-press:where(:active:not(:disabled,[aria-disabled=true])){scale:.97}
.pc-press-soft:where(:active:not(:disabled,[aria-disabled=true])){scale:.992}
.pc-grain{position:relative;isolation:isolate}
.pc-grain::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:inherit;opacity:.06;mix-blend-mode:overlay;background-image:var(--pc-grain)}
@media (prefers-reduced-motion:reduce){.pc-press,.pc-press-soft{scale:none!important;transition:none}}
[data-pc-away],[data-pc-away]::before,[data-pc-away]::after{animation-play-state:paused!important}
`;function Y(){return o.jsxs(o.Fragment,{children:[o.jsx("style",{href:"pc-tokens",precedence:"default",children:q}),o.jsx(U,{})]})}const Z=`
@keyframes pc-ripple-button-grow { to { transform: translate(-50%, -50%) scale(1) } }
.pc-ripple-button-wave {
  position: absolute; border-radius: 9999px; pointer-events: none;
  background: var(--pc-ripple-color, currentColor); opacity: var(--pc-ripple-opacity, .22);
  transform: translate(-50%, -50%) scale(0);
  animation: pc-ripple-button-grow var(--pc-ripple-duration, 550ms) var(--pc-ease-out) forwards;
  transition: opacity 420ms ease-out;
}
.pc-ripple-button-wave[data-out] { opacity: 0 }
@media (prefers-reduced-motion: reduce) { .pc-ripple-button-wave { display: none } }
`,H={default:"bg-primary text-primary-foreground shadow-[var(--pc-e1)] hover:bg-primary/90",secondary:"bg-secondary text-secondary-foreground hover:bg-secondary/80",outline:"border bg-background text-foreground shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",ghost:"text-foreground hover:bg-muted",destructive:"bg-destructive text-white shadow-[var(--pc-e1)] hover:bg-destructive/90"},J={sm:"h-8 gap-1.5 rounded-md px-3 text-xs [&_svg]:size-3.5",md:"h-10 gap-2 rounded-lg px-4 text-sm [&_svg]:size-4",lg:"h-11 gap-2 rounded-lg px-6 text-base [&_svg]:size-5",icon:"size-10 rounded-full [&_svg]:size-4"};function k({variant:c="default",size:p="md",rippleColor:d,rippleOpacity:s,rippleDuration:t=550,centerRipple:n,className:r,style:i,children:b,onPointerDown:z,onPointerUp:j,onPointerLeave:C,onPointerCancel:S,onKeyDown:A,onKeyUp:T,onBlur:_,...M}){const O=D()??!1,[I,m]=g.useState([]),N=g.useRef(0),y=g.useRef([]);g.useEffect(()=>{const e=y.current;return()=>e.forEach(a=>window.clearTimeout(a))},[]);const w=(e,a,u)=>{if(O)return;const l=e.getBoundingClientRect(),x=a===void 0||n?l.width/2:a-l.left,v=u===void 0||n?l.height/2:u-l.top,R=2*Math.hypot(Math.max(x,l.width-x),Math.max(v,l.height-v)),G=N.current++;m(P=>[...P.slice(-4),{id:G,x,y:v,size:R,out:!1}])},f=()=>{m(a=>a.some(u=>!u.out)?a.map(u=>({...u,out:!0})):a);const e=window.setTimeout(()=>m(a=>a.filter(u=>!u.out)),520);y.current.push(e)};return o.jsxs("button",{"data-slot":"button",className:W("pc-press relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden font-medium whitespace-nowrap transition-[background-color,box-shadow,color] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",H[c],J[p],r),style:{...i,"--pc-ripple-duration":`${t}ms`,...d?{"--pc-ripple-color":d}:{},...s!==void 0?{"--pc-ripple-opacity":s}:{}},onPointerDown:e=>{e.button===0&&w(e.currentTarget,e.clientX,e.clientY),z?.(e)},onPointerUp:e=>{f(),j?.(e)},onPointerLeave:e=>{f(),C?.(e)},onPointerCancel:e=>{f(),S?.(e)},onKeyDown:e=>{(e.key===" "||e.key==="Enter")&&!e.repeat&&w(e.currentTarget),A?.(e)},onKeyUp:e=>{f(),T?.(e)},onBlur:e=>{f(),_?.(e)},...M,children:[o.jsx(Y,{}),o.jsx("style",{href:"pc-ripple-button",precedence:"default",children:Z}),o.jsx("span",{"aria-hidden":"true",className:"pointer-events-none absolute inset-0 -z-10",children:I.map(e=>o.jsx("span",{"data-out":e.out||void 0,className:"pc-ripple-button-wave",style:{left:e.x,top:e.y,width:e.size,height:e.size}},e.id))}),b]})}const Q=Object.freeze(Object.defineProperty({__proto__:null,RippleButton:k},Symbol.toStringTag,{value:"Module"})),X=k??void 0??Object.values(Q).find(c=>typeof c=="function");function oe(){return o.jsx("div",{"data-part":"goodui__ripple-button",children:o.jsx(X,{text:"Get started",label:"Get started",children:"Get started"})})}export{oe as default};
