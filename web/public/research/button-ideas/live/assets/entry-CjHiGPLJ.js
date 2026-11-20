import{r as v,j as l}from"./live-XOUlSUgi.js";const Y="#0190fe";function ie({value:e,defaultValue:r,onValueChange:a,alpha:p,presets:t,open:h,defaultOpen:u=!1,onOpenChange:c,label:s="Color",showValue:d=!0,size:g="md",side:f="bottom",align:m="start",name:E,className:k,disabled:x,ref:$,onClick:O,...P}){const[j,S]=q(e,r??Y,a),[_,D]=q(h,u,c),A=v.useId(),I=v.useRef(null),i=v.useRef(null),n=v.useRef(null),w=v.useRef(D);w.current=D;const M=v.useRef(!_);_||(M.current=!0);const y=L(j),U=y?R(y,!1).toUpperCase():j,H=y&&p&&y.a<1?`${Math.round(y.a*100)}%`:null,B=o=>!!o&&(!!n.current?.contains(o)||!!I.current?.contains(o));return v.useLayoutEffect(()=>{const o=n.current;if(!_||!o)return;"showPopover"in o&&!o.matches(":popover-open")&&o.showPopover();const C=()=>{i.current&&oe(o,i.current.getBoundingClientRect(),f,m)};C(),window.addEventListener("resize",C),window.addEventListener("scroll",C,!0);const T=typeof ResizeObserver>"u"?null:new ResizeObserver(C);return T?.observe(o),()=>{window.removeEventListener("resize",C),window.removeEventListener("scroll",C,!0),T?.disconnect(),"hidePopover"in o&&o.isConnected&&o.matches(":popover-open")&&o.hidePopover()}},[_,f,m]),v.useEffect(()=>{const o=n.current;if(!_||!o)return;M.current&&!o.contains(document.activeElement)&&o.querySelector("[role=slider]")?.focus({preventScroll:!0}),M.current=!1;const C=()=>w.current(!1);let T=o.contains(document.activeElement);const X=()=>T=!0,J=b=>T=!!b.relatedTarget&&o.contains(b.relatedTarget);o.addEventListener("focusin",X),o.addEventListener("focusout",J);const Q=b=>{B(b.target)||C()},Z=b=>{if(b.key!=="Escape"||b.defaultPrevented)return;b.preventDefault(),b.stopPropagation();const z=B(document.activeElement);C(),z&&i.current?.focus({preventScroll:!0})},ee=b=>{const z=b.relatedTarget;B(b.target)&&z&&!B(z)&&C()};return document.addEventListener("pointerdown",Q,!0),window.addEventListener("keydown",Z,!0),document.addEventListener("focusout",ee),()=>{document.removeEventListener("pointerdown",Q,!0),window.removeEventListener("keydown",Z,!0),document.removeEventListener("focusout",ee),o.removeEventListener("focusin",X),o.removeEventListener("focusout",J);const b=i.current;T&&window.setTimeout(()=>{const z=document.activeElement;b?.isConnected&&(!z||z===document.body)&&b.focus({preventScroll:!0})})}},[_]),l.jsxs("span",{ref:I,className:["ui-clp",k].filter(Boolean).join(" "),"data-size":g==="sm"?"sm":"md",children:[l.jsx("style",{href:"ui-color-picker",precedence:"default",children:ae}),l.jsxs("button",{...P,ref:o=>{i.current=o,typeof $=="function"?$(o):$&&($.current=o)},type:"button",className:"ui-clp__trigger","data-bare":!d||void 0,disabled:x,"aria-haspopup":"dialog","aria-expanded":_,"aria-controls":_?`${A}-card`:void 0,onClick:o=>{O?.(o),o.defaultPrevented||D(!_)},children:[l.jsx("span",{className:"ui-clp__swatch",style:{"--ui-clp-c":y?V(y):j},"aria-hidden":"true"}),l.jsxs("span",{className:d?"ui-clp__value":"ui-clp__sr",children:[l.jsxs("span",{className:"ui-clp__sr",children:[s,": "]}),U,H&&l.jsxs("span",{className:"ui-clp__alpha",children:[" ",H]})]})]}),E&&l.jsx("input",{type:"hidden",name:E,value:y?R(y,!!p):j}),_&&l.jsx("div",{ref:n,id:`${A}-card`,className:"ui-clp__pop",role:"dialog","aria-label":s,popover:"manual","data-side":f,"data-align":m,children:l.jsx(re,{value:j,onChange:S,alpha:p,presets:t})})]})}function ne({value:e,defaultValue:r,onValueChange:a,alpha:p,presets:t,className:h,...u}){const[c,s]=q(e,r??Y,a);return l.jsxs("div",{...u,className:["ui-clp","ui-clp--inline",h].filter(Boolean).join(" "),children:[l.jsx("style",{href:"ui-color-picker",precedence:"default",children:ae}),l.jsx(re,{value:c,onChange:s,alpha:p,presets:t})]})}function re({value:e,onChange:r,alpha:a,presets:p}){const[t,h]=v.useState(()=>F(L(e)??L(Y),0,a)),[u,c]=v.useState(e),[s,d]=v.useState(null),g=v.useRef(null),f=v.useRef(null),m=v.useRef(null);if(e!==u){c(e);const i=L(e);i&&R(i,!!a)!==R(G(t),!!a)&&h(F(i,t.h,a,t.s))}const E=G(t),k=R(E,!!a),x=i=>{h(i);const n=R(G(i),!!a);n!==e&&r(n)},$=Math.round(t.s*100),O=Math.round(t.v*100),P=Math.round(t.h),j=Math.round(t.a*100),S=(p??[]).map(i=>typeof i=="string"?{value:i,label:i.toUpperCase()}:i),_=S.findIndex(i=>{const n=L(i.value);return!!n&&R(n,!!a)===k}),[D,A]=v.useState(!1),I=i=>{const n=L(i);return n&&x(F(a?n:{...n,a:1},t.h,a,t.s)),!!n};return l.jsxs("div",{className:"ui-clp__panel",style:{"--ui-clp-c":V(E),"--ui-clp-solid":V({...E,a:1}),"--ui-clp-hue":`hsl(${P} 100% 50%)`},children:[l.jsx("div",{ref:g,className:"ui-clp__area",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Saturation and brightness","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":$,"aria-valuetext":`Saturation ${$}%, brightness ${O}%`,...W(g,(i,n)=>x({...t,s:i,v:1-n}),!0),onKeyDown:i=>{const n=i.shiftKey?10:1,M={ArrowRight:[n,0],ArrowLeft:[-n,0],ArrowUp:[0,n],ArrowDown:[0,-n],PageUp:[0,10],PageDown:[0,-10],Home:[-100,0],End:[100,0]}[i.key];M&&(i.preventDefault(),x({...t,s:N($+M[0],0,100)/100,v:N(O+M[1],0,100)/100}))},children:l.jsx("span",{className:"ui-clp__thumb",style:{left:`${t.s*100}%`,top:`${(1-t.v)*100}%`}})}),l.jsx("div",{ref:f,className:"ui-clp__slider ui-clp__slider--hue",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Hue","aria-orientation":"horizontal","aria-valuemin":0,"aria-valuemax":360,"aria-valuenow":P,"aria-valuetext":`${P}°, ${ce(P)}`,...W(f,i=>x({...t,h:i*360})),onKeyDown:i=>{const n=te(i,P,360);n!=null&&x({...t,h:n})},children:l.jsx("span",{className:"ui-clp__knob",style:{"--p":t.h/360,background:`hsl(${P} 100% 50%)`}})}),a&&l.jsx("div",{ref:m,className:"ui-clp__slider ui-clp__slider--alpha",role:"slider",tabIndex:0,dir:"ltr","aria-label":"Opacity","aria-orientation":"horizontal","aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":j,"aria-valuetext":`${j}%`,...W(m,i=>x({...t,a:Math.round(i*100)/100})),onKeyDown:i=>{const n=te(i,j,100);n!=null&&x({...t,a:n/100})},children:l.jsx("span",{className:"ui-clp__knob",style:{"--p":t.a}})}),l.jsxs("div",{className:"ui-clp__fields",children:[l.jsx("span",{className:"ui-clp__preview","aria-hidden":"true"}),l.jsxs("label",{className:"ui-clp__hex","data-invalid":D||void 0,children:[l.jsx("span",{className:"ui-clp__hash","aria-hidden":"true",children:"#"}),l.jsx("input",{className:"ui-clp__input",value:s??k.slice(1).toUpperCase(),"aria-label":"Hex color","aria-invalid":D||void 0,spellCheck:!1,autoComplete:"off",autoCapitalize:"off",onChange:i=>{const n=i.target.value;d(n),A(!1),se.test(n.trim())&&I(n)},onBlur:()=>{s!=null&&I(s),d(null),A(!1)},onKeyDown:i=>{i.key!=="Enter"||s==null||(i.preventDefault(),I(s)?d(null):A(!0))}})]}),a&&l.jsxs("span",{className:"ui-clp__pct",children:[j,"%"]})]}),S.length>0&&l.jsx("div",{className:"ui-clp__presets",role:"radiogroup","aria-label":"Presets",children:S.map((i,n)=>l.jsx("button",{type:"button",role:"radio",className:"ui-clp__preset","aria-checked":n===_,"aria-label":i.label,title:i.label,tabIndex:n===(_>=0?_:0)?0:-1,style:{"--ui-clp-p":i.value},onClick:()=>{const w=L(i.value);w&&x(F(a?w:{...w,a:1},t.h,a,t.s))},onKeyDown:w=>{const M=getComputedStyle(w.currentTarget).direction==="rtl",y={ArrowRight:M?-1:1,ArrowDown:1,ArrowLeft:M?1:-1,ArrowUp:-1}[w.key],U=w.key==="Home"?0:w.key==="End"?S.length-1:y!=null?(n+y+S.length)%S.length:null;if(U==null)return;w.preventDefault();const H=w.currentTarget.parentElement?.children[U];H?.focus(),H?.click()}},`${i.value}-${n}`))})]})}function W(e,r,a=!1){const p=t=>{const h=e.current;if(!h)return;const u=h.getBoundingClientRect(),c=a?0:u.height/2,s=N((t.clientX-u.left-c)/Math.max(1,u.width-c*2),0,1),d=N((t.clientY-u.top)/Math.max(1,u.height),0,1);r(s,d)};return{onPointerDown:t=>{t.button===0&&(e.current?.setPointerCapture(t.pointerId),e.current?.focus({preventScroll:!0}),t.preventDefault(),p(t))},onPointerMove:t=>{e.current?.hasPointerCapture(t.pointerId)&&p(t)},onPointerUp:t=>{e.current?.hasPointerCapture(t.pointerId)&&e.current.releasePointerCapture(t.pointerId)}}}function te(e,r,a){const p=e.shiftKey?10:1,t={ArrowRight:r+p,ArrowUp:r+p,ArrowLeft:r-p,ArrowDown:r-p,PageUp:r+10,PageDown:r-10,Home:0,End:a};return e.key in t?(e.preventDefault(),N(t[e.key],0,a)):null}function q(e,r,a){const[p,t]=v.useState(r),h=e!==void 0;return[h?e:p,c=>{h||t(c),a?.(c)}]}function oe(e,r,a,p){const u=document.documentElement.clientWidth||window.innerWidth,c=window.innerHeight;e.style.maxHeight="";const s=e.offsetWidth,d=e.offsetHeight,g={bottom:c-r.bottom-6-8,top:r.top-6-8};let f=a;g[f]<d&&g[f==="top"?"bottom":"top"]>g[f]&&(f=f==="top"?"bottom":"top");const m=Math.min(d,Math.max(160,g[f])),E=f==="bottom"?r.bottom+6:r.top-6-m;let k=p,x=k==="start"?r.left:r.right-s;k==="start"&&x+s>u-8&&r.right-s>=8?(k="end",x=r.right-s):k==="end"&&x<8&&r.left+s<=u-8&&(k="start",x=r.left),x=Math.min(Math.max(8,x),u-8-s),d>m&&(e.style.maxHeight=`${m}px`),e.style.top=`${Math.round(E)}px`,e.style.left=`${Math.round(x)}px`,e.dataset.side=f,e.dataset.align=k}const N=(e,r,a)=>Math.min(a,Math.max(r,e)),K=e=>Math.round(N(e,0,255)).toString(16).padStart(2,"0"),se=/^(#?([0-9a-f]{6}|[0-9a-f]{8})|rgba?\(.*\))$/i,le=/^-?(\d+\.?\d*|\.\d+)%?$/;function L(e){const r=String(e??"").trim().toLowerCase(),a=/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(r)?.[1];if(a){const c=a.length<=4?[...a].map(d=>d+d).join(""):a,s=d=>parseInt(c.slice(d,d+2),16);return{r:s(0),g:s(2),b:s(4),a:c.length===8?s(6)/255:1}}const p=/^rgba?\(([^)]*)\)$/.exec(r)?.[1];if(p==null)return null;const t=p.trim().split(/\s*[,/]\s*|\s+/).filter(Boolean);if(t.length!==3&&t.length!==4||!t.every(c=>le.test(c)))return null;const h=c=>N(Math.round(c.endsWith("%")?parseFloat(c)*2.55:parseFloat(c)),0,255),u=t[3]==null?1:N(t[3].endsWith("%")?parseFloat(t[3])/100:parseFloat(t[3]),0,1);return{r:h(t[0]),g:h(t[1]),b:h(t[2]),a:u}}const R=(e,r)=>`#${K(e.r)}${K(e.g)}${K(e.b)}${r&&e.a<1?K(e.a*255):""}`,V=e=>`rgb(${Math.round(e.r)} ${Math.round(e.g)} ${Math.round(e.b)} / ${e.a})`;function G({h:e,s:r,v:a,a:p}){const t=h=>{const u=(h+e/60)%6;return Math.round((a-a*r*Math.max(0,Math.min(u,4-u,1)))*255)};return{r:t(5),g:t(3),b:t(1),a:p}}function F({r:e,g:r,b:a,a:p},t,h,u=0){const c=e/255,s=r/255,d=a/255,g=Math.max(c,s,d),f=g-Math.min(c,s,d);let m=t;return f>0&&(m=g===c?(s-d)/f%6:g===s?(d-c)/f+2:(c-s)/f+4,m=(m*60+360)%360),{h:m,s:g===0?u:f/g,v:g,a:h?p:1}}const ce=e=>e<15?"red":e<45?"orange":e<70?"yellow":e<165?"green":e<195?"cyan":e<255?"blue":e<290?"purple":e<335?"pink":"red",ae=`
/* Colors and motion as variables – override them on .ui-clp (see Theming in the docs) */
.ui-clp {
  --ui-clp-ink: var(--aui-ink, #171717);
  --ui-clp-strong: var(--aui-ink, #171717);
  --ui-clp-muted: var(--aui-muted, #8f8f8f);
  --ui-clp-surface: var(--aui-surface, #ffffff);
  --ui-clp-overlay: var(--aui-overlay, var(--aui-surface, #ffffff));
  --ui-clp-hover: rgba(0, 0, 0, 0.04);
  --ui-clp-hairline: rgba(0, 0, 0, 0.08);
  --ui-clp-check: #e6e6e6;
  --ui-clp-shadow: 0 0 0 1px var(--aui-border, #e6e6e8), 0 1px 2px rgba(0, 0, 0, 0.04);
  --ui-clp-shadow-hover: 0 0 0 1px var(--aui-border-strong, #d4d4d8), 0 1px 2px rgba(0, 0, 0, 0.05);
  --ui-clp-edge-focus: 0 0 0 1px var(--aui-border-strong, #b4b4bb), 0 1px 2px rgba(0, 0, 0, 0.05);
  --ui-clp-danger-edge: #f04438;
  --ui-clp-pop-shadow: var(--aui-shadow-popover, 0 0 0 1px rgba(0, 0, 0, 0.06), 0 18px 40px -12px rgba(0, 0, 0, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.06));
  --ui-clp-focus: var(--aui-focus, rgba(0, 96, 226, 0.7));
  --ui-clp-ease: var(--aui-ease, cubic-bezier(0.22, 1, 0.36, 1));
  --ui-clp-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;

  --h: 32px;
  --radius: var(--aui-radius, 9px);

  position: relative;
  display: inline-flex;
  min-width: 0;
  vertical-align: middle;
  font-family: var(--aui-font, "Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-size: 13.5px;
  line-height: 20px;
  color: var(--ui-clp-ink);
  -webkit-font-smoothing: antialiased;
}
.ui-clp[data-size="sm"] { --h: 28px; --radius: calc(var(--aui-radius, 9px) - 1px); }
.ui-clp--inline { display: block; }
.ui-clp *, .ui-clp *::before, .ui-clp *::after { box-sizing: border-box; }
.ui-clp__sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

/* The button: white with a 1px edge, the swatch and the hex in a fixed-width face, so it never jumps */
.ui-clp__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: var(--h);
  margin: 0;
  padding: 0 12px 0 8px;
  border: 0;
  border-radius: var(--radius);
  background: var(--ui-clp-surface);
  box-shadow: var(--ui-clp-shadow);
  font: inherit;
  color: var(--ui-clp-strong);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 140ms ease;
}
.ui-clp[data-size="sm"] .ui-clp__trigger { padding: 0 10px 0 6px; }
.ui-clp__trigger[data-bare] { justify-content: center; width: var(--h); padding: 0; }
.ui-clp__trigger:hover:not(:disabled), .ui-clp__trigger[aria-expanded="true"] { box-shadow: var(--ui-clp-shadow-hover); }
.ui-clp__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.ui-clp__trigger:focus-visible { outline: 2px solid var(--ui-clp-focus); outline-offset: 2px; }

/* A swatch over a checkerboard, so a see-through color reads as see-through */
.ui-clp__swatch, .ui-clp__preview {
  flex: none;
  background: linear-gradient(var(--ui-clp-c), var(--ui-clp-c)), repeating-conic-gradient(var(--ui-clp-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--ui-clp-hairline);
}
.ui-clp__swatch { width: 18px; height: 18px; border-radius: 6px; }
.ui-clp[data-size="sm"] .ui-clp__swatch { width: 16px; height: 16px; border-radius: 5px; }
.ui-clp__value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--ui-clp-mono); font-size: 12px; font-weight: 500; letter-spacing: 0; }
.ui-clp__alpha { color: var(--ui-clp-muted); }

/* The card in the top layer: a 1px edge and a deeper drop */
.ui-clp__pop {
  position: fixed;
  inset: auto;
  z-index: 1000;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  margin: 0;
  padding: 14px;
  border: 0;
  border-radius: calc(var(--aui-radius-lg, 10px) + 6px);
  background: var(--ui-clp-overlay);
  box-shadow: var(--ui-clp-pop-shadow);
  color: var(--ui-clp-ink);
  font: inherit;
  overflow: auto;
  overscroll-behavior: contain;
  transform-origin: top left;
  animation: ui-clp-in 220ms var(--ui-clp-ease) both;
}
.ui-clp__pop::backdrop { display: none; }
.ui-clp__pop[data-align="end"] { transform-origin: top right; }
.ui-clp__pop[data-side="top"] { transform-origin: bottom left; animation-name: ui-clp-in-up; }
.ui-clp__pop[data-side="top"][data-align="end"] { transform-origin: bottom right; }

.ui-clp__panel { display: grid; gap: 14px; width: 236px; max-width: 100%; }
.ui-clp--inline .ui-clp__panel { width: 100%; }

/* Saturation left to right, brightness bottom to top, over the hue */
.ui-clp__area {
  position: relative;
  height: 152px;
  border-radius: calc(var(--radius) + 1px);
  background: linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0)), var(--ui-clp-hue);
  box-shadow: inset 0 0 0 1px var(--ui-clp-hairline);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.ui-clp__thumb, .ui-clp__knob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 0 2px #fff, 0 0 0 2.5px rgba(0, 0, 0, 0.18), 0 1px 4px 1px rgba(0, 0, 0, 0.24);
}
.ui-clp__thumb { width: 12px; height: 12px; margin: -6px 0 0 -6px; background: var(--ui-clp-solid); }

/* The sliders: a 12px rail, the knob stops half its height from each end */
.ui-clp__slider { position: relative; height: 12px; border-radius: 999px; cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: inset 0 0 0 1px var(--ui-clp-hairline); }
.ui-clp__slider--hue { background: linear-gradient(to right, #f00 0%, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00 100%); }
.ui-clp__slider--alpha { background: linear-gradient(to right, transparent, var(--ui-clp-solid)), repeating-conic-gradient(var(--ui-clp-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
.ui-clp__knob { top: 50%; left: calc(6px + (100% - 12px) * var(--p)); width: 16px; height: 16px; margin: -8px 0 0 -8px; background: transparent; }
.ui-clp__slider--alpha .ui-clp__knob { background: linear-gradient(var(--ui-clp-c), var(--ui-clp-c)), repeating-conic-gradient(var(--ui-clp-check) 0 25%, #fff 0 50%) 0 0 / 6px 6px; }
.ui-clp__area:focus-visible, .ui-clp__slider:focus-visible { outline: 2px solid var(--ui-clp-focus); outline-offset: 2px; }

/* The hex field: no ring, only its edge firms up */
.ui-clp__fields { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ui-clp__preview { width: 32px; height: 32px; border-radius: var(--radius); }
.ui-clp__hex {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 2px;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius);
  background: var(--ui-clp-surface);
  box-shadow: var(--ui-clp-shadow);
  cursor: text;
  transition: box-shadow 140ms ease;
}
.ui-clp__hex:hover { box-shadow: var(--ui-clp-shadow-hover); }
.ui-clp__hex:focus-within { box-shadow: var(--ui-clp-edge-focus); }
.ui-clp__hex[data-invalid] { box-shadow: 0 0 0 1px var(--ui-clp-danger-edge); }
.ui-clp__hash { flex: none; font-family: var(--ui-clp-mono); font-size: 12px; color: var(--ui-clp-muted); }
.ui-clp__input {
  flex: 1 1 auto;
  width: 0;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--ui-clp-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-clp-strong);
}
.ui-clp__pct { flex: none; width: 36px; font-size: 12px; line-height: 16px; text-align: end; font-variant-numeric: tabular-nums; color: var(--ui-clp-muted); }

/* Presets: round swatches; the chosen one gets a ring in its own color */
.ui-clp__presets { display: flex; flex-wrap: wrap; gap: 8px; padding: 2px; }
.ui-clp__preset {
  flex: none;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(var(--ui-clp-p), var(--ui-clp-p)), repeating-conic-gradient(var(--ui-clp-check) 0 25%, #fff 0 50%) 0 0 / 8px 8px;
  box-shadow: inset 0 0 0 0.5px var(--ui-clp-hairline);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 140ms var(--ui-clp-ease), box-shadow 140ms ease;
}
.ui-clp__preset:hover { transform: scale(1.1); }
.ui-clp__preset[aria-checked="true"] { box-shadow: inset 0 0 0 0.5px var(--ui-clp-hairline), 0 0 0 2px var(--ui-clp-overlay), 0 0 0 3.5px var(--ui-clp-p); }
.ui-clp__preset:focus-visible { outline: 2px solid var(--ui-clp-focus); outline-offset: 2px; }

@keyframes ui-clp-in { from { opacity: 0; transform: scale(0.96) translateY(-4px); } }
@keyframes ui-clp-in-up { from { opacity: 0; transform: scale(0.96) translateY(4px); } }

/* Touch screens: a bigger button, thumbs and swatches, and 16px in the field so iOS doesn't zoom in */
@media (pointer: coarse) {
  .ui-clp { --h: 40px; }
  .ui-clp[data-size="sm"] { --h: 36px; }
  .ui-clp__area { height: 176px; }
  .ui-clp__slider { height: 14px; }
  .ui-clp__knob { left: calc(7px + (100% - 14px) * var(--p)); width: 20px; height: 20px; margin: -10px 0 0 -10px; }
  .ui-clp__thumb { width: 16px; height: 16px; margin: -8px 0 0 -8px; }
  .ui-clp__panel { gap: 14px; }
  .ui-clp__hex, .ui-clp__preview { height: 40px; }
  .ui-clp__preview { width: 40px; }
  .ui-clp__input { font-size: 16px; }
  .ui-clp__presets { gap: 10px; }
  .ui-clp__preset { width: 28px; height: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .ui-clp__pop { animation-duration: 1ms; }
  .ui-clp__preset { transition: none; }
  .ui-clp__preset:hover { transform: none; }
}

/* Dark mode: follows a .dark class or data-theme="dark" on any ancestor, e.g. <html> */
:where(.dark, [data-theme="dark"]) .ui-clp {
  --ui-clp-ink: var(--aui-ink, #ededed);
  --ui-clp-strong: var(--aui-ink, #ededed);
  --ui-clp-muted: var(--aui-muted, #8b8b92);
  --ui-clp-surface: var(--aui-surface, #1c1c1e);
  --ui-clp-overlay: var(--aui-overlay, var(--aui-surface, #19191b));
  --ui-clp-hover: rgba(255, 255, 255, 0.06);
  --ui-clp-hairline: rgba(255, 255, 255, 0.1);
  --ui-clp-shadow: 0 0 0 1px var(--aui-border, #2a2a2e);
  --ui-clp-shadow-hover: 0 0 0 1px var(--aui-border-strong, #3a3a40);
  --ui-clp-edge-focus: 0 0 0 1px var(--aui-border-strong, #4a4a52);
  --ui-clp-danger-edge: rgba(255, 99, 105, 0.8);
  --ui-clp-pop-shadow: var(--aui-shadow-popover, 0 0 0 1px rgba(255, 255, 255, 0.06), 0 18px 40px -12px rgba(0, 0, 0, 0.6));
  --ui-clp-focus: var(--aui-focus, rgba(77, 141, 255, 0.8));
  color-scheme: dark;
}
`,pe=Object.freeze(Object.defineProperty({__proto__:null,ColorPicker:ie,ColorPickerPanel:ne},Symbol.toStringTag,{value:"Module"})),ue=ie??void 0??Object.values(pe).find(e=>typeof e=="function");function he(){return l.jsx("div",{"data-part":"affectui__color-picker",children:l.jsx(ue,{text:"Get started",label:"Get started",children:"Get started"})})}export{he as default};
