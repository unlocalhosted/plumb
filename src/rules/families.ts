import { transform } from 'lightningcss';
import type { CssColor } from 'lightningcss';
import type { Declaration, Family } from '../report.js';
import { components } from '../decisions/resolve.js';
import type { Variable } from '../decisions/resolve.js';

export const judgedFamilies = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'] as const;
export type JudgedFamily = typeof judgedFamilies[number];
export function isSpacing(prop: string): boolean {
  return /^(?:(?:padding|margin|inset|scroll-padding|scroll-margin)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|gap|row-gap|column-gap|top|right|bottom|left)$/.test(prop);
}
export function familiesFor(prop: string): JudgedFamily[] {
  const result: JudgedFamily[] = [];
  if (isSpacing(prop)) result.push('spacing');
  if (/^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|text-decoration(?:-color)?|fill|stroke|caret-color|accent-color|column-rule(?:-color)?|box-shadow|text-shadow)$/.test(prop)) result.push('color');
  if (/^border(?:-(?:top|bottom)-(?:left|right)|-(?:start|end)-(?:start|end))?-radius$/.test(prop)) result.push('radius');
  if (/^(?:font|font-size|line-height|font-weight|letter-spacing|font-family)$/.test(prop)) result.push('type');
  if (/^(?:transition|animation)(?:-(?:duration|delay|timing-function))?$/.test(prop)) result.push('motion');
  if (prop === 'box-shadow') result.push('elevation');
  if (prop === 'z-index') result.push('z');
  return result;
}
export function isJudged(declaration: Declaration, family?: Family): boolean {
  return declaration.origin !== 'keyframes' && declaration.sourceOrigin !== 'framework' &&
    (!(declaration.origin === 'class' || declaration.origin === 'arbitrary' || declaration.origin === 'apply') || declaration.authoredValue === true) &&
    (family ? familiesFor(declaration.prop).includes(family as JudgedFamily) : familiesFor(declaration.prop).length > 0);
}

// Tokenize authored CSS without splitting functions, strings, URLs or escaped delimiters.
export function tokens(value: string, separators = /[\s,\/]/): string[] {
  const parts: string[] = []; let start = 0, depth = 0, quote = '';
  for (let i = 0; i <= value.length; i++) {
    const c = value[i];
    if (c === '\\') { i++; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (!depth && (c === undefined || separators.test(c))) { if (i > start) parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  return parts.filter(Boolean);
}
export interface VarUse { name: string; fallback?: string; text: string }
export function varUses(value: string): VarUse[] {
  const result: VarUse[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"' || value[i] === "'") { const q = value[i++]; while (i < value.length && value[i] !== q) { if (value[i] === '\\') i++; i++; } continue; }
    if (!value.startsWith('var(', i)) continue;
    let end = i + 4, depth = 1;
    while (end < value.length && depth) { if (value[end] === '(') depth++; if (value[end] === ')') depth--; end++; }
    const body = value.slice(i + 4, end - 1), args = tokens(body, /,/);
    result.push({ name: args[0] ?? '', ...(args.length > 1 ? { fallback: args.slice(1).join(', ') } : {}), text: value.slice(i, end) });
    result.push(...varUses(body.slice((args[0]?.length ?? 0) + 1))); i = end - 1;
  }
  return result;
}

const parsedColors = new Map<string, CssColor | null>();
function parseColor(value: string): CssColor | undefined {
  if (!parsedColors.has(value)) {
    let color: CssColor | undefined;
    try { transform({ filename: 'color.css', code: Buffer.from(`a{color:${value}}`), visitor: { Color(c) { color = c; } } }); } catch { /* Non-color shorthand token. */ }
    parsedColors.set(value, color ?? null);
  }
  return parsedColors.get(value) ?? undefined;
}
export const colorNeutral = /^(?:currentcolor|transparent|inherit|initial|unset|none|revert|revert-layer)$/i;
const colorFunction = /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;
export function colorParts(value: string, variables: ReadonlyMap<string, Variable>, decisionRefs: ReadonlySet<string>, composite = false, seen = new Set<string>()): string[] {
  const parts: string[] = [];
  for (const token of tokens(value)) {
    if (/^(?:url|image-set)\(/i.test(token)) continue;
    if (/gradient\(/i.test(token)) { parts.push(...colorParts(token.slice(token.indexOf('(') + 1, -1), variables, decisionRefs, true, seen)); continue; }
    if (/^var\(/.test(token)) {
      const use = varUses(token)[0];
      if (!use) continue;
      if (decisionRefs.has(`var(${use.name})`)) { parts.push(token); continue; }
      const variable = variables.get(use.name);
      if (!seen.has(use.name) && variable && !variable.dynamic) {
        parts.push(...colorParts(variable.value, variables, decisionRefs, composite, new Set([...seen, use.name])));
      } else if (use.fallback !== undefined) parts.push(...colorParts(use.fallback, variables, decisionRefs, composite, seen));
      else parts.push(token);
      continue;
    }
    if (/^(?:color-mix|light-dark)\(/i.test(token)) {
      const args = tokens(token.slice(token.indexOf('(') + 1, -1), /,/);
      for (const arg of /^color-mix/i.test(token) ? args.slice(1) : args) parts.push(...colorParts(arg, variables, decisionRefs, false, seen));
      continue;
    }
    if (colorFunction.test(token) && /^\w+\(\s*from\s/i.test(token)) {
      const args = tokens(token.slice(token.indexOf('(') + 1, -1));
      parts.push(...colorParts(args[1] ?? '', variables, decisionRefs, false, seen)); continue;
    }
    if (colorNeutral.test(token) || parseColor(token) || colorFunction.test(token)) parts.push(token);
    else if (!composite && !/^[-+\d.]+%$/.test(token)) parts.push(token);
  }
  return parts;
}
export function partsFor(family: JudgedFamily, prop: string, value: string, variables: ReadonlyMap<string, Variable>, refs: ReadonlySet<string>): string[] {
  if (family === 'color') return colorParts(value, variables, refs, !/^(?:color|.*-color|fill|stroke)$/.test(prop));
  if (family === 'elevation') return tokens(value, /,/);
  if (prop === 'font-family') return [value];
  if (family === 'motion' && /^(transition|animation)$/.test(prop)) {
    const expand = (token: string, seen = new Set<string>()): string[] => {
      const use = /^var\(/.test(token) ? varUses(token)[0] : undefined;
      if (use && !refs.has(`var(${use.name})`) && !seen.has(use.name)) {
        const variable = variables.get(use.name);
        if (variable && !variable.dynamic) return tokens(variable.value).flatMap(t => expand(t, new Set([...seen, use.name])));
      }
      return /^(?:[-+]?(?:\d*\.)?\d+(?:ms|s)|ease(?:-in|-out|-in-out)?|linear|step-start|step-end)$/.test(token) || /^(?:var|calc|min|max|clamp|cubic-bezier|steps|linear)\(/.test(token) ? [token] : [];
    };
    return tokens(value).flatMap(token => expand(token));
  }
  return family === 'spacing' ? components(value) : tokens(value);
}

// OKLab comparison, retaining alpha for identity equality. Lightning CSS parses
// CSS named colors, hex, rgb/hsl/hwb and the perceptual color spaces for us.
export type Lab = [number, number, number, number];
const linear = (v: number) => Math.abs(v) <= .04045 ? v / 12.92 : Math.sign(v) * ((Math.abs(v) + .055) / 1.055) ** 2.4;
function fromLinear(r: number, g: number, b: number, alpha: number): Lab {
  const l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b);
  const m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b);
  const s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
  return [.2104542553*l + .793617785*m - .0040720468*s, 1.9779984951*l - 2.428592205*m + .4505937099*s, .0259040371*l + .7827717662*m - .808675766*s, alpha];
}
export function oklab(value: string): Lab | undefined {
  const c = parseColor(value);
  if (!c || typeof c !== 'object' || !('alpha' in c)) return;
  if (c.type === 'oklab') return [c.l, c.a, c.b, c.alpha];
  if (c.type === 'oklch') return [c.l, c.c*Math.cos(c.h*Math.PI/180), c.c*Math.sin(c.h*Math.PI/180), c.alpha];
  if (c.type === 'rgb') return fromLinear(linear(c.r/255), linear(c.g/255), linear(c.b/255), c.alpha);
  if (c.type === 'srgb') return fromLinear(linear(c.r), linear(c.g), linear(c.b), c.alpha);
  if (c.type === 'srgb-linear') return fromLinear(c.r, c.g, c.b, c.alpha);
  const matrix = (m: number[][], v: number[]) => m.map(row => row.reduce((sum, n, i) => sum + n * v[i]!, 0));
  const adapt = (v: number[]) => matrix([[.955473421488075,-.02309845494876471,.06325924320057072],[-.0283697093338637,1.0099953980813041,.021041441191917323],[.012314014864481998,-.020507649298898964,1.330365926242124]], v);
  let xyz: number[] | undefined;
  // CSS Color 4 sample conversion matrices (W3C):
  // https://github.com/w3c/csswg-drafts/blob/main/css-color-4/conversions.js
  if (c.type === 'lab' || c.type === 'lch') {
    const a = c.type === 'lab' ? c.a : c.c*Math.cos(c.h*Math.PI/180), b = c.type === 'lab' ? c.b : c.c*Math.sin(c.h*Math.PI/180);
    const y = (c.l+16)/116, f = (t: number) => t**3 > 216/24389 ? t**3 : (116*t-16)/903.296296;
    xyz = adapt([.9642956764295677*f(y+a/500), f(y), .8251046025104602*f(y-b/200)]);
  } else if (c.type === 'xyz-d50') xyz = adapt([c.x,c.y,c.z]);
  else if (c.type === 'xyz-d65') xyz = [c.x,c.y,c.z];
  else if (c.type === 'display-p3') xyz = matrix([[608311/1250200,189793/714400,198249/1000160],[35783/156275,247089/357200,198249/2500400],[0,32229/714400,5220557/5000800]], [c.r,c.g,c.b].map(linear));
  else if (c.type === 'a98-rgb') xyz = matrix([[573536/994567,263643/1420810,187206/994567],[591459/1989134,6239551/9945670,374412/4972835],[53769/1989134,351524/4972835,4929758/4972835]], [c.r,c.g,c.b].map(v => Math.sign(v)*Math.abs(v)**(563/256)));
  else if (c.type === 'prophoto-rgb') xyz = adapt(matrix([[.7977666449006423,.13518129740053308,.0313477341283922],[.2880748288194013,.711835234241873,.00008993693872564],[0,0,.8251046025104602]], [c.r,c.g,c.b].map(v => Math.abs(v)<=16/512 ? v/16 : Math.sign(v)*Math.abs(v)**1.8)));
  else if (c.type === 'rec2020') xyz = matrix([[63426534/99577255,20160776/139408157,47086771/278816314],[26158966/99577255,472592308/697040785,8267143/139408157],[0,19567812/697040785,295819943/278816314]], [c.r,c.g,c.b].map(v => Math.sign(v)*Math.abs(v)**2.4));
  if (xyz) {
    const [r,g,b] = matrix([[12831/3959,-329/214,-1974/3959],[-851781/878810,1648619/878810,36519/878810],[705/12673,-2585/12673,705/667]], xyz);
    return fromLinear(r!,g!,b!,c.alpha);
  }
}
export function colorDistance(a: Lab, b: Lab): number { return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }

export function typeDeclarations(declaration: Declaration, refs: ReadonlySet<string>): Declaration[] {
  if (declaration.prop !== 'font' || declaration.opaque) return [declaration];
  // Whole type-role references stay whole; literal shorthands expose their knobs.
  if (varUses(declaration.value).some(use => refs.has(`var(${use.name})`)) && /^var\(/.test(declaration.value)) return [{ ...declaration, prop: 'font-family' }];
  if (/^(inherit|initial|unset|revert|revert-layer)$/.test(declaration.value)) return [{ ...declaration, prop: 'font-family' }];
  const parts = tokens(declaration.authoredCss ?? declaration.value, /\s/);
  const sizeIndex = parts.findIndex(p => /^(?:[-+\d.]+(?:px|rem|em|%|pt)|(?:var|calc|clamp)\()/.test(p));
  if (sizeIndex < 0) return [{ ...declaration, prop: 'font-family' }];
  const sizeAndLine = tokens(parts[sizeIndex]!, /\//);
  let familyStart = sizeIndex + 1;
  if (!sizeAndLine[1] && parts[familyStart] === '/') { sizeAndLine.push(parts[familyStart + 1]!); familyStart += 2; }
  else if (!sizeAndLine[1] && parts[familyStart]?.startsWith('/')) { sizeAndLine.push(parts[familyStart]!.slice(1)); familyStart++; }
  const values: [string, string][] = [['font-size', sizeAndLine[0]!], ['font-family', parts.slice(familyStart).join(' ')]];
  if (sizeAndLine[1]) values.push(['line-height', sizeAndLine[1]]);
  const weight = parts.slice(0, sizeIndex).find(p => /^(?:\d+|bold|bolder|lighter|normal)$/.test(p));
  if (weight) values.push(['font-weight', weight]);
  return values.map(([prop, value]) => ({ ...declaration, prop, value, authoredCss: value, refs: varUses(value).map(use => use.name) }));
}
