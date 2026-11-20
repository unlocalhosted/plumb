import{r as v,j as s}from"./live-XOUlSUgi.js";const Y="#0190fe";function ie({value:e,defaultValue:r,onValueChange:a,alpha:p,presets:t,open:h,defaultOpen:u=!1,onOpenChange:l,label:c="Color",showValue:d=!0,size:x="md",side:f="bottom",align:m="start",name:E,className:k,disabled:g,ref:$,onClick:O,...P}){const[j,S]=q(e,r??Y,a),[_,D]=q(h,u,l),A=v.useId(),I=v.useRef(null),i=v.useRef(null),n=v.useRef(null),w=v.useRef(D);w.current=D;const M=v.useRef(!_);_||(M.current=!0);const y=L(j),U=y?R(y,!1).toUpperCase():j,H=y&&p&&y.a<1?`${Math.round(y.a*100)}%`:null,B=o=>!!o&&(!!n.current?.contains(o)||!!I.current?.contains(o));return v.useLayoutEffect(()=>{const o=n.current;if(!_||!o)return;"showPopover"in o&&!o.matches(":popover-open")&&o.showPopover();const C=()=>{i.current&&oe(o,i.current.getBoundingClientRect(),f,m)};C(),window.addEventListener("resize",C),window.addEventListener("scroll",C,!0);const T=typeof ResizeObserver>"u"?null:new ResizeObserver(C);return T?.observe(o),()=>{window.removeEventListener("resize",C),window.removeEventListener("scroll",C,!0),T?.disconnect(),"hidePopover"in o&&o.isConnected&&o.matches(":popover-open")&&o.hidePopover()}},[_,f,m]),v.useEffect(()=>{const o=n.current;if(!_||!o)return;M.current&&!o.contains(document.activeElement)&&o.querySelector("[role=slider]")?.focus({preventScroll:!0}),M.current=!1;const C=()=>w.current(!1);let T=o.contains(document.activeElement);const X=()=>T=!0,J=b=>T=!!b.relatedTarget&&o.contains(b.relatedTarget);o.addEventListener("focusin",X),o.addEventListener("focusout",J);const Q=b=>{B(b.target)||C()},Z=b=>{if(b.key!=="Escape"||b.defaultPrevented)return;b.preventDefault(),b.stopPropagation();const z=B(document.activeElement);C(),z&&i.current?.focus({preventScroll:!0})},ee=b=>{const z=b.relatedTarget;B(b.target)&&z&&!B(z)&&C()};return document.addEventListener("pointerdown",Q,!0),window.addEventListener("keydown",Z,!0),document.addEventListener("focusout",ee),()=>{document.removeEventListener("pointerdown",Q,!0),window.removeEventListener("keydown",Z,!0),document.removeEventListener("focusout",ee),o.removeEventListener("focusin",X),o.removeEventListener("focusout",J);const b=i.current;T&&window.setTimeout(()=>{const z=document.activeElement;b?.isConnected&&(!z||z===document.body)&&b.focus({preventScroll:!0})})}},[_]),s.jsxs("span",{ref:I,className:["ui-clpc",k].filter(Boolean).join(" "),"data-size":x==="sm"?"sm":"md",children:[s.jsx("style",{href:"ui-color-picker-clean",precedence:"default",children:ae}),s.jsxs("button",{...P,ref:o=>{i.current=o,typeof $=="function"?$(o):$&&($.current=o)},type:"button",className:"ui-clpc__trigger","data-bare":!d||void 0,disabled:g,"aria-haspopup":"dialog","aria-expanded":_,"aria-controls":_?`${A}-card`:void 0,onClick:o=>{O?.(o),o.defaultPrevented||D(!_)},children:[s.jsx("span",{className:"ui-clpc__swatch",style:{"--ui-clpc-c":y?V(y):j},"aria-hidden":"true"}),s.jsxs("span",{className:d?"ui-clpc__value":"ui-clpc__sr",children:[s.jsxs("span",{className:"ui-clpc__sr",children:[c,": "]}),U,H&&s.jsxs("span",{className:"ui-clpc__alpha",children:[" ",H]})]})]}),E&&s.jsx("input",{type:"hidden",name:E,value:y?R(y,!!p):j}),_&&s.jsx("div",{ref:n,id:`${A}-card`,className:"ui-clpc__pop",role:"dialog","aria-label":c,popover:"manual","data-side":f,"data-align":m,children:s.jsx(re,{value:j,onChange:S,alpha:p,presets:t})})]})}function ne({value:e,defaultValue:r,onValueChange:a,alpha:p,presets:t,className:h,...u}){const[l,c]=q(e,r??Y,a);return s.jsxs("div",{...u,className:["ui-clpc","ui-clpc--inline",h].filter(Boolean).join(" "),children:[s.jsx("style",{href:"ui-color-picker-clean",precedence:"default",children:ae}),s.jsx(re,{value:l,onChange:c,alpha:p,presets:t})]})}function re({value:e,onChange:r,alpha:a,presets:p}){const[t,h]=v.useState(()=>F(L(e)??L(Y),0,a)),[u,l]=v.useState(e),[c,d]=v.useState(null),x=v.useRef(null),f=v.useRef(null),m=v.useRef(null);if(e!==u){l(e);const i=L(e);i&&R(i,!!a)!==R(G(t),!!a)&&h(F(i,t.h,a,t.s))}const E=G(t),k=R(E,!!a),g=i=>{h(i);const n=R(G(i),!!a);n!==e&&r(n)},$=Math.round(t.s*100),O=Math.round(t.v*100),P=Math.round(t.h),j=Math.round(t.a*100),S=(p??[]).map(i=>typeof i=="string"?{value:i,label:i.toUpperCase()}:i),_=S.findIndex(i=>{const n=L(i.value);return!!n&&R(n,!!a)===k}),[D,A]=v.useState(!1),I=i=>{const n=L(i);return n&&g(F(a?n:{...n,a:1},t.h,a,t.s)),!!n};return s.jsxs("div",{className:"ui-clpc__panel",style:{"--ui-clpc-c":V(E),"--ui-clpc-solid":V({...E,a:1}),"--ui-clpc-hue":`hsl(${P} 100% 50%)`},children:[s.jsx("div",{ref:x,className:"ui-clpc__area",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Saturation and brightness","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":$,"aria-valuetext":`Saturation ${$}%, brightness ${O}%`,...W(x,(i,n)=>g({...t,s:i,v:1-n}),!0),onKeyDown:i=>{const n=i.shiftKey?10:1,M={ArrowRight:[n,0],ArrowLeft:[-n,0],ArrowUp:[0,n],ArrowDown:[0,-n],PageUp:[0,10],PageDown:[0,-10],Home:[-100,0],End:[100,0]}[i.key];M&&(i.preventDefault(),g({...t,s:N($+M[0],0,100)/100,v:N(O+M[1],0,100)/100}))},children:s.jsx("span",{className:"ui-clpc__thumb",style:{left:`${t.s*100}%`,top:`${(1-t.v)*100}%`}})}),s.jsx("div",{ref:f,className:"ui-clpc__slider ui-clpc__slider--hue",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Hue","aria-orientation":"horizontal","aria-valuemin":0,"aria-valuemax":360,"aria-valuenow":P,"aria-valuetext":`${P}°, ${le(P)}`,...W(f,i=>g({...t,h:i*360})),onKeyDown:i=>{const n=te(i,P,360);n!=null&&g({...t,h:n})},children:s.jsx("span",{className:"ui-clpc__knob",style:{"--p":t.h/360,background:`hsl(${P} 100% 50%)`}})}),a&&s.jsx("div",{ref:m,className:"ui-clpc__slider ui-clpc__slider--alpha",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Opacity","aria-orientation":"horizontal","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":j,"aria-valuetext":`${j}%`,...W(m,i=>g({...t,a:Math.round(i*100)/100})),onKeyDown:i=>{const n=te(i,j,100);n!=null&&g({...t,a:n/100})},children:s.jsx("span",{className:"ui-clpc__knob",style:{"--p":t.a}})}),s.jsxs("div",{className:"ui-clpc__fields",children:[s.jsx("span",{className:"ui-clpc__preview","aria-hidden":"true"}),s.jsxs("label",{className:"ui-clpc__hex","data-invalid":D||void 0,children:[s.jsx("span",{className:"ui-clpc__hash","aria-hidden":"true",children:"#"}),s.jsx("input",{className:"ui-clpc__input",value:c??k.slice(1).toUpperCase(),"aria-label":"Hex color","aria-invalid":D||void 0,spellCheck:!1,autoComplete:"off",autoCapitalize:"off",onChange:i=>{const n=i.target.value;d(n),A(!1),ce.test(n.trim())&&I(n)},onBlur:()=>{c!=null&&I(c),d(null),A(!1)},onKeyDown:i=>{i.key!=="Enter"||c==null||(i.preventDefault(),I(c)?d(null):A(!0))}})]}),a&&s.jsxs("span",{className:"ui-clpc__pct",children:[j,"%"]})]}),S.length>0&&s.jsx("div",{className:"ui-clpc__presets",role:"radiogroup","aria-label":"Presets",children:S.map((i,n)=>s.jsx("button",{type:"button",role:"radio",className:"ui-clpc__preset","aria-checked":n===_,"aria-label":i.label,title:i.label,tabIndex:n===(_>=0?_:0)?0:-1,style:{"--ui-clpc-p":i.value},onClick:()=>{const w=L(i.value);w&&g(F(a?w:{...w,a:1},t.h,a,t.s))},onKeyDown:w=>{const M=getComputedStyle(w.currentTarget).direction==="rtl",y={ArrowRight:M?-1:1,ArrowDown:1,ArrowLeft:M?1:-1,ArrowUp:-1}[w.key],U=w.key==="Home"?0:w.key==="End"?S.length-1:y!=null?(n+y+S.length)%S.length:null;if(U==null)return;w.preventDefault();const H=w.currentTarget.parentElement?.children[U];H?.focus(),H?.click()}},`${i.value}-${n}`))})]})}function W(e,r,a=!1){const p=t=>{const h=e.current;if(!h)return;const u=h.getBoundingClientRect(),l=a?0:u.height/2,c=N((t.clientX-u.left-l)/Math.max(1,u.width-l*2),0,1),d=N((t.clientY-u.top)/Math.max(1,u.height),0,1);r(c,d)};return{onPointerDown:t=>{t.button===0&&(e.current?.setPointerCapture(t.pointerId),e.current?.focus({preventScroll:!0}),t.preventDefault(),p(t))},onPointerMove:t=>{e.current?.hasPointerCapture(t.pointerId)&&p(t)},onPointerUp:t=>{e.current?.hasPointerCapture(t.pointerId)&&e.current.releasePointerCapture(t.pointerId)}}}function te(e,r,a){const p=e.shiftKey?10:1,t={ArrowRight:r+p,ArrowUp:r+p,ArrowLeft:r-p,ArrowDown:r-p,PageUp:r+10,PageDown:r-10,Home:0,End:a};return e.key in t?(e.preventDefault(),N(t[e.key],0,a)):null}function q(e,r,a){const[p,t]=v.useState(r),h=e!==void 0;return[h?e:p,l=>{h||t(l),a?.(l)}]}function oe(e,r,a,p){const u=document.documentElement.clientWidth||window.innerWidth,l=window.innerHeight;e.style.maxHeight="";const c=e.offsetWidth,d=e.offsetHeight,x={bottom:l-r.bottom-6-8,top:r.top-6-8};let f=a;x[f]<d&&x[f==="top"?"bottom":"top"]>x[f]&&(f=f==="top"?"bottom":"top");const m=Math.min(d,Math.max(160,x[f])),E=f==="bottom"?r.bottom+6:r.top-6-m;let k=p,g=k==="start"?r.left:r.right-c;k==="start"&&g+c>u-8&&r.right-c>=8?(k="end",g=r.right-c):k==="end"&&g<8&&r.left+c<=u-8&&(k="start",g=r.left),g=Math.min(Math.max(8,g),u-8-c),d>m&&(e.style.maxHeight=`${m}px`),e.style.top=`${Math.round(E)}px`,e.style.left=`${Math.round(g)}px`,e.dataset.side=f,e.dataset.align=k}const N=(e,r,a)=>Math.min(a,Math.max(r,e)),K=e=>Math.round(N(e,0,255)).toString(16).padStart(2,"0"),ce=/^(#?([0-9a-f]{6}|[0-9a-f]{8})|rgba?\(.*\))$/i,se=/^-?(\d+\.?\d*|\.\d+)%?$/;function L(e){const r=String(e??"").trim().toLowerCase(),a=/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(r)?.[1];if(a){const l=a.length<=4?[...a].map(d=>d+d).join(""):a,c=d=>parseInt(l.slice(d,d+2),16);return{r:c(0),g:c(2),b:c(4),a:l.length===8?c(6)/255:1}}const p=/^rgba?\(([^)]*)\)$/.exec(r)?.[1];if(p==null)return null;const t=p.trim().split(/\s*[,/]\s*|\s+/).filter(Boolean);if(t.length!==3&&t.length!==4||!t.every(l=>se.test(l)))return null;const h=l=>N(Math.round(l.endsWith("%")?parseFloat(l)*2.55:parseFloat(l)),0,255),u=t[3]==null?1:N(t[3].endsWith("%")?parseFloat(t[3])/100:parseFloat(t[3]),0,1);return{r:h(t[0]),g:h(t[1]),b:h(t[2]),a:u}}const R=(e,r)=>`#${K(e.r)}${K(e.g)}${K(e.b)}${r&&e.a<1?K(e.a*255):""}`,V=e=>`rgb(${Math.round(e.r)} ${Math.round(e.g)} ${Math.round(e.b)} / ${e.a})`;function G({h:e,s:r,v:a,a:p}){const t=h=>{const u=(h+e/60)%6;return Math.round((a-a*r*Math.max(0,Math.min(u,4-u,1)))*255)};return{r:t(5),g:t(3),b:t(1),a:p}}function F({r:e,g:r,b:a,a:p},t,h,u=0){const l=e/255,c=r/255,d=a/255,x=Math.max(l,c,d),f=x-Math.min(l,c,d);let m=t;return f>0&&(m=x===l?(c-d)/f%6:x===c?(d-l)/f+2:(l-c)/f+4,m=(m*60+360)%360),{h:m,s:x===0?u:f/x,v:x,a:h?p:1}}const le=e=>e<15?"red":e<45?"orange":e<70?"yellow":e<165?"green":e<195?"cyan":e<255?"blue":e<290?"purple":e<335?"pink":"red",ae=`
/* Colors and motion as variables – override them on .ui-clpc (see Theming in the docs) */
.ui-clpc {
  --ui-clpc-ink: var(--aui-ink, rgba(0, 0, 0, 0.88));
  --ui-clpc-strong: var(--aui-ink, #000000);
  --ui-clpc-muted: var(--aui-muted, rgba(0, 0, 0, 0.45));
  --ui-clpc-surface: var(--aui-surface, #ffffff);
  --ui-clpc-overlay: var(--aui-overlay, var(--aui-surface, #ffffff));
  --ui-clpc-hover: rgba(0, 0, 0, 0.04);
  --ui-clpc-hairline: rgba(0, 0, 0, 0.1);
  --ui-clpc-check: #e6e6e6;
  --ui-clpc-shadow: 0 0 0 0.5px var(--aui-border, rgba(0, 0, 0, 0.08)), 0 1px 1px -1px rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --ui-clpc-shadow-hover: 0 0 0 0.5px var(--aui-border-strong, rgba(0, 0, 0, 0.14)), 0 1px 1px -1px rgba(0, 0, 0, 0.12), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --ui-clpc-edge-focus: 0 0 0 1px var(--aui-border-strong, rgba(0, 0, 0, 0.28)), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --ui-clpc-danger-edge: rgba(229, 72, 77, 0.8);
  --ui-clpc-pop-shadow: var(--aui-shadow-popover, 0 0 0 0.5px var(--aui-border-strong, rgba(0, 0, 0, 0.1)), 0 12px 32px -8px rgba(0, 0, 0, 0.16));
  --ui-clpc-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
  --ui-clpc-ease: var(--aui-ease, cubic-bezier(0.22, 1, 0.36, 1));
  --ui-clpc-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;

  --h: 28px;
  --radius: var(--aui-radius, 6px);

  position: relative;
  display: inline-flex;
  min-width: 0;
  vertical-align: middle;
  font-family: var(--aui-font, "Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: 13px;
  line-height: 20px;
  color: var(--ui-clpc-ink);
  -webkit-font-smoothing: antialiased;
}
.ui-clpc[data-size="sm"] { --h: 24px; }
.ui-clpc--inline { display: block; }
.ui-clpc *, .ui-clpc *::before, .ui-clpc *::after { box-sizing: border-box; }
.ui-clpc__sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* The button: a white tool with a hairline shadow, the swatch and the hex in a fixed-width face, so it never jumps */
.ui-clpc__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: var(--h);
  margin: 0;
  padding: 0 10px 0 6px;
  border: 0;
  border-radius: var(--radius);
  background: var(--ui-clpc-surface);
  box-shadow: var(--ui-clpc-shadow);
  font: inherit;
  color: var(--ui-clpc-strong);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 140ms ease;
}
.ui-clpc[data-size="sm"] .ui-clpc__trigger { padding: 0 8px 0 4px; }
.ui-clpc__trigger[data-bare] { justify-content: center; width: var(--h); padding: 0; }
.ui-clpc__trigger:hover:not(:disabled), .ui-clpc__trigger[aria-expanded="true"] { box-shadow: var(--ui-clpc-shadow-hover); }
.ui-clpc__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.ui-clpc__trigger:focus-visible { outline: 2px solid var(--ui-clpc-focus); outline-offset: 2px; }

/* A swatch over a checkerboard, so a see-through color reads as see-through */
.ui-clpc__swatch, .ui-clpc__preview {
  flex: none;
  background: linear-gradient(var(--ui-clpc-c), var(--ui-clpc-c)), repeating-conic-gradient(var(--ui-clpc-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--ui-clpc-hairline);
}
.ui-clpc__swatch { width: 16px; height: 16px; border-radius: 4px; }
.ui-clpc[data-size="sm"] .ui-clpc__swatch { width: 14px; height: 14px; border-radius: 3px; }
.ui-clpc__value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--ui-clpc-mono); font-size: 12px; font-weight: 500; letter-spacing: 0; }
.ui-clpc__alpha { color: var(--ui-clpc-muted); }

/* The card in the top layer: a 0.5px edge and a soft drop */
.ui-clpc__pop {
  position: fixed;
  inset: auto;
  z-index: 1000;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: calc(var(--aui-radius-lg, 10px) + 2px);
  background: var(--ui-clpc-overlay);
  box-shadow: var(--ui-clpc-pop-shadow);
  color: var(--ui-clpc-ink);
  font: inherit;
  overflow: auto;
  overscroll-behavior: contain;
  transform-origin: top left;
  animation: ui-clpc-in 220ms var(--ui-clpc-ease) both;
}
.ui-clpc__pop::backdrop { display: none; }
.ui-clpc__pop[data-align="end"] { transform-origin: top right; }
.ui-clpc__pop[data-side="top"] { transform-origin: bottom left; animation-name: ui-clpc-in-up; }
.ui-clpc__pop[data-side="top"][data-align="end"] { transform-origin: bottom right; }

.ui-clpc__panel { display: grid; gap: 12px; width: 232px; max-width: 100%; }
.ui-clpc--inline .ui-clpc__panel { width: 100%; }

/* Saturation left to right, brightness bottom to top, over the hue */
.ui-clpc__area {
  position: relative;
  height: 148px;
  border-radius: var(--radius);
  background: linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0)), var(--ui-clpc-hue);
  box-shadow: inset 0 0 0 0.5px var(--ui-clpc-hairline);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ui-clpc__thumb, .ui-clpc__knob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 0 2px #fff, 0 0 0 2.5px rgba(0, 0, 0, 0.18), 0 1px 4px 1px rgba(0, 0, 0, 0.24);
}
.ui-clpc__thumb { width: 12px; height: 12px; margin: -6px 0 0 -6px; background: var(--ui-clpc-solid); }

/* The sliders: a 10px rail, the knob stops half its height from each end */
.ui-clpc__slider { position: relative; height: 10px; border-radius: 999px; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: inset 0 0 0 0.5px var(--ui-clpc-hairline); }
.ui-clpc__slider--hue { background: linear-gradient(to right, #f00 0%, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00 100%); }
.ui-clpc__slider--alpha { background: linear-gradient(to right, transparent, var(--ui-clpc-solid)), repeating-conic-gradient(var(--ui-clpc-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
.ui-clpc__knob { top: 50%; left: calc(5px + (100% - 10px) * var(--p)); width: 14px; height: 14px; margin: -7px 0 0 -7px; background: transparent; }
.ui-clpc__slider--alpha .ui-clpc__knob { background: linear-gradient(var(--ui-clpc-c), var(--ui-clpc-c)), repeating-conic-gradient(var(--ui-clpc-check) 0 25%, #fff 0 50%) 0 0 / 6px 6px; }
.ui-clpc__area:focus-visible, .ui-clpc__slider:focus-visible { outline: 2px solid var(--ui-clpc-focus); outline-offset: 2px; }

/* The hex field: no ring, only its edge firms up */
.ui-clpc__fields { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ui-clpc__preview { width: 28px; height: 28px; border-radius: var(--radius); }
.ui-clpc__hex {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 2px;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--radius);
  background: var(--ui-clpc-surface);
  box-shadow: var(--ui-clpc-shadow);
  cursor: text;
  transition: box-shadow 140ms ease;
}
.ui-clpc__hex:hover { box-shadow: var(--ui-clpc-shadow-hover); }
.ui-clpc__hex:focus-within { box-shadow: var(--ui-clpc-edge-focus); }
.ui-clpc__hex[data-invalid] { box-shadow: 0 0 0 1px var(--ui-clpc-danger-edge); }
.ui-clpc__hash { flex: none; font-family: var(--ui-clpc-mono); font-size: 12px; color: var(--ui-clpc-muted); }
.ui-clpc__input {
  flex: 1 1 auto;
  width: 0;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--ui-clpc-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-clpc-strong);
}
.ui-clpc__pct { flex: none; width: 36px; font-size: 12px; line-height: 16px; text-align: end; font-variant-numeric: tabular-nums; color: var(--ui-clpc-muted); }

/* Presets: round swatches; the chosen one gets a ring in its own color */
.ui-clpc__presets { display: flex; flex-wrap: wrap; gap: 8px; padding: 2px; }
.ui-clpc__preset {
  flex: none;
  width: 20px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(var(--ui-clpc-p), var(--ui-clpc-p)), repeating-conic-gradient(var(--ui-clpc-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--ui-clpc-hairline);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 140ms var(--ui-clpc-ease), box-shadow 140ms ease;
}
.ui-clpc__preset:hover { transform: scale(1.1); }
.ui-clpc__preset[aria-checked="true"] { box-shadow: inset 0 0 0 0.5px var(--ui-clpc-hairline), 0 0 0 2px var(--ui-clpc-overlay), 0 0 0 3.5px var(--ui-clpc-p); }
.ui-clpc__preset:focus-visible { outline: 2px solid var(--ui-clpc-focus); outline-offset: 2px; }

@keyframes ui-clpc-in { from { opacity: 0; transform: scale(0.96) translateY(-4px); } }
@keyframes ui-clpc-in-up { from { opacity: 0; transform: scale(0.96) translateY(4px); } }

/* Touch screens: a bigger button, thumbs and swatches, and 16px in the field so iOS doesn't zoom in */
@media (pointer: coarse) {
  .ui-clpc { --h: 36px; }
  .ui-clpc[data-size="sm"] { --h: 32px; }
  .ui-clpc__area { height: 168px; }
  .ui-clpc__slider { height: 14px; }
  .ui-clpc__knob { left: calc(7px + (100% - 14px) * var(--p)); width: 20px; height: 20px; margin: -10px 0 0 -10px; }
  .ui-clpc__thumb { width: 16px; height: 16px; margin: -8px 0 0 -8px; }
  .ui-clpc__panel { gap: 14px; }
  .ui-clpc__hex, .ui-clpc__preview { height: 36px; }
  .ui-clpc__preview { width: 36px; }
  .ui-clpc__input { font-size: 16px; }
  .ui-clpc__presets { gap: 10px; }
  .ui-clpc__preset { width: 28px; height: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-clpc__pop { animation-duration: 1ms; }
  .ui-clpc__preset { transition: none; }
  .ui-clpc__preset:hover { transform: none; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .ui-clpc {
  --ui-clpc-ink: var(--aui-ink, rgba(255, 255, 255, 0.9));
  --ui-clpc-strong: var(--aui-ink, #ffffff);
  --ui-clpc-muted: var(--aui-muted, rgba(255, 255, 255, 0.46));
  --ui-clpc-surface: var(--aui-surface, #1f1f22);
  --ui-clpc-overlay: var(--aui-overlay, var(--aui-surface, #1b1b1e));
  --ui-clpc-hover: rgba(255, 255, 255, 0.06);
  --ui-clpc-hairline: rgba(255, 255, 255, 0.14);
  --ui-clpc-shadow: 0 0 0 0.5px var(--aui-border, rgba(255, 255, 255, 0.14)), 0 1px 2px rgba(0, 0, 0, 0.4);
  --ui-clpc-shadow-hover: 0 0 0 0.5px var(--aui-border-strong, rgba(255, 255, 255, 0.24)), 0 1px 2px rgba(0, 0, 0, 0.4);
  --ui-clpc-edge-focus: 0 0 0 1px var(--aui-border-strong, rgba(255, 255, 255, 0.34));
  --ui-clpc-danger-edge: rgba(255, 99, 105, 0.8);
  --ui-clpc-pop-shadow: var(--aui-shadow-popover, 0 0 0 0.5px var(--aui-border-strong, rgba(255, 255, 255, 0.14)), 0 12px 32px -8px rgba(0, 0, 0, 0.6));
  --ui-clpc-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
  color-scheme: dark;
}
`,pe=Object.freeze(Object.defineProperty({__proto__:null,ColorPicker:ie,ColorPickerPanel:ne},Symbol.toStringTag,{value:"Module"})),ue=ie??void 0??Object.values(pe).find(e=>typeof e=="function");function he(){return s.jsx("div",{"data-part":"affectui__color-picker-clean",children:s.jsx(ue,{text:"Get started",label:"Get started",children:"Get started"})})}export{he as default};
