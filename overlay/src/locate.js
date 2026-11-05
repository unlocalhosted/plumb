// From a DOM element to the JSX that rendered it, the way react-grab does it.
//
// bippy (react-grab's fiber and source layer) reads the element's owner stack from React and symbolicates it through
// the dev server's source maps. Frames are innermost first: the JSX that created this element, then the JSX that
// created its owner, and so on up. Every frame that is a source file is a candidate. Plumb's server then confirms each
// one is a tracked file inside the project and anchors the JSX at that position, so an edit can never land on a
// guessed line. The confirmed frames are the chain the reading steps through; the default is react-grab's choice:
// the first frame in feature code, with shared UI (a design-system package, components/ui) ranked after it.
import { getOwnerStack, getRawOwnerStack, isSourceFile } from '../vendor/bippy/source.js';
import { request } from './api.js';
import { sourceMapVersion, mapFrame } from './sourcemap.js';
import { FIX } from './words.js';

// Next's ?id names an eval module, and some versions reuse that id on later
// saves. Only new Error evidence checks its current source version; retained
// Errors keep their old mapping. A save changes one module key, never the store.
const nextModules = new Map();
async function mappedFrame(url, line, column, options = {}) {
  let identity;
  try { const at = new URL(url); identity = at.pathname.startsWith('/_next/static/chunks/') && at.searchParams.has('id'); } catch {}
  let module = identity ? nextModules.get(url) : null;
  const snapshot = source => request('resolve', { source, snapshot: '1' }, { explain: true, batch: true });
  if (module) {
    const current = await snapshot(module.source);
    if (current?.hash && current.hash !== module.hash) {
      module = { source: module.source, hash: current.hash, version: current.hash };
      nextModules.set(url, module);
    }
  }
  const result = await mapFrame(url, line, column, { ...options, contentVersion: module?.version });
  const at = options.explain ? result?.location : result;
  if (identity && !module && at?.source) {
    const current = await snapshot(at.source);
    if (!nextModules.has(url)) nextModules.set(url, { source: at.source, hash: current?.hash });
  }
  return result;
}

// The first frame of a fiber's own creation stack (where its element was created) that is not a dependency, mapped
// through the module's source map. Used when bippy has no raw stack for an owner (forwardRef and memo in library builds).
const creationEvidence = new WeakMap(), ownerEvidence = new WeakMap();
// React keeps a fiber's initial _debugStack when reconciling new elements.
// Observe the actual dev element record instead: React defines _debugStack
// after assigning props, and committed memoizedProps identify that element.
// Weak keys retain neither elements nor their props. Clones keep their original
// Error, so cloning an old element cannot adopt a new map.
const elementStacks = new WeakMap();
const defineProperty = Object.defineProperty;
Object.defineProperty = function (target, key, descriptor) {
  const result = defineProperty(target, key, descriptor);
  if (key === '_debugStack' && descriptor.value instanceof Error &&
    Object.getOwnPropertyDescriptor(target, '$$typeof')?.value === Symbol.for('react.transitional.element')) {
    const props = Object.getOwnPropertyDescriptor(target, 'props')?.value;
    if (props && typeof props === 'object') elementStacks.set(props, descriptor.value);
  }
  return result;
};
const stackOf = fiber => elementStacks.get(fiber?.memoizedProps) ?? fiber?._debugStack;
// The server's hash of a file when a creation stack was first read from it. Seeing the same stack after the file
// changed means the element was kept from before the edit: its positions describe code that no longer exists.
const stackHashes = new WeakMap();
const runtime = url => /\/node_modules\/|\/(?:dist|deps)\/|\/\.vite\/deps\/|\/_next\/static\/chunks\/(?:framework|main|webpack|node_modules_next_dist_)|^about:|\/\((?:rsc|ssr|action-browser)\)\//.test(url);
function creationFrame(fiber) {
  const evidence = stackOf(fiber);
  if (!evidence || typeof evidence !== 'object') return Promise.resolve(null);
  const old = creationEvidence.get(evidence);
  if (old) return old.pending;
  const version = sourceMapVersion();
  const pending = readCreationFrame(fiber).then(frame => {
    // Successful evidence belongs to this Error, not the current module URL.
    // Retained stacks must never be remapped after cache invalidation.
    if (sourceMapVersion() !== version && (!frame || frame.failure)) return { failure: { reason: 'map', detail: { step: 'obsolete-stack' } } };
    // No raw creation frame is different from an unmapped raw frame. The
    // latter must not borrow an owner's JSX or retry through a future map.
    return frame;
  });
  creationEvidence.set(evidence, { version, pending });
  return pending;
}
async function readCreationFrame(fiber) {
  const stack = String(stackOf(fiber)?.stack ?? '');
  if (!stack || stack.includes('UnknownOwner')) return null;
  for (const line of stack.split('\n').slice(1)) {
    const m = /\(?((?:https?|file|webpack(?:-internal)?):\/\/[^\s]+):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m || runtime(m[1])) continue;
    const mapped = await mappedFrame(m[1], Number(m[2]), Number(m[3]) + 1, { explain: true }).catch(() => null);
    const at = mapped?.location;
    if (!at) return { rawSource: m[1], failure: { reason: mapped?.reason ?? 'map', detail: mapped?.detail ?? { step: 'unmapped-creation-frame', source: m[1] } } };
    // Turbopack flattens dependency paths in generated chunk names. Classify
    // the mapped source too, before treating a React runtime call as creation.
    if (runtime(at.source)) continue;
    const name = /at\s+([^\s(]+)\s+\(/.exec(line)?.[1];
    return { fileName: at.source, lineNumber: at.line, columnNumber: at.column - 1, functionName: name, raw: m[1] + ':' + m[2] + ':' + m[3], ...(at.hash ? { hash: at.hash } : {}) };
  }
  return null;
}

const nameOf = fiber => { const type = fiber?.type; return typeof type === 'string' ? type : type?.displayName ?? type?.name ?? type?.render?.name ?? type?.type?.name ?? null; };
// Stack frames name eval wrappers and anonymous callbacks too; those are not component names.
const named = name => name && !/^(?:eval|anonymous|<anonymous>|Array\.map|Object\.\w+)$/.test(name) ? name : null;
const fiberKey = node => Object.keys(node).find(key => key.startsWith('__reactFiber$'));

// The component an element is the outermost element of, or null. Walking up from the element's fiber through the
// components wrapping it, the element must be each one's first rendered child; the innermost named one wins (Card,
// not the Dashboard that renders Card). Providers, fragments and other unnamed wrappers are passed through.
export function componentOf(element) {
  const key = element && fiberKey(element);
  let fiber = key ? element[key] : null;
  for (let n = 0; fiber?.return && n < 32; n++) {
    const parent = fiber.return;
    if (typeof parent.type === 'string' || parent.tag === 3) return null; // reached the next element, or the root
    if (parent.child !== fiber) return null;                              // not its first child, so not its outermost
    const name = typeof parent.type === 'function' || typeof parent.type === 'object' ? named(nameOf(parent)) : null;
    if (name && /^[A-Z]/.test(name)) return name;
    fiber = parent;
  }
  return null;
}

// The nearest element React rendered. Markup injected into an element (an icon's SVG) belongs to the element holding it.
function currentFiber(fiber) {
  // DOM keys are stable across React's double buffer. Follow the committed
  // root's child lists, including shared bailout children, by fiber identity.
  const path = [];
  for (let at = fiber; at; at = at.return) path.push(at);
  let current = path.at(-1)?.stateNode?.current;
  if (!current) return fiber;
  for (let i = path.length - 2; i >= 0; i--) {
    let child = current.child;
    while (child && child !== path[i] && child !== path[i].alternate) child = child.sibling;
    if (!child) return null;
    current = child;
  }
  return current;
}
function hostOf(element) {
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    const key = fiberKey(node);
    if (key) return currentFiber(node[key]);
  }
  return null;
}

// Shared UI is still yours, but a reading starts where the feature uses it.
const shared = file => /(?:^|\/)(?:components\/ui|packages\/[^/]+|design-?systems?|primitives|ui-kit)\//i.test(file);

// A fiber's owner stack, symbolicated. Source-map names are relative to the module they came from, and the raw frames
// carry those module URLs one for one, so each name is resolved against its module; raw names fill in missing ones.
function framesOf(fiber) {
  const evidence = stackOf(fiber);
  if (!evidence || typeof evidence !== 'object') return readFrames(fiber);
  if (!ownerEvidence.has(evidence)) ownerEvidence.set(evidence, readFrames({ ...fiber, _debugStack: evidence }).catch(error => {
    ownerEvidence.delete(evidence); throw error;
  }));
  return ownerEvidence.get(evidence);
}
async function readFrames(fiber) {
  // React 17/18 record the JSX position itself; it needs no stack or source map.
  // React 17/18 have no creation stacks at all; their records are _debugSource on each element's fiber.
  if (!fiber._debugStack && (fiber._debugSource || fiber._debugOwner?._debugSource)) {
    const frames = [];
    for (let at = fiber; at && frames.length < 32; at = at._debugOwner) {
      const source = at._debugSource;
      if (source?.fileName) frames.push({ fileName: 'file://' + source.fileName, lineNumber: source.lineNumber, columnNumber: (source.columnNumber ?? 1) - 1, functionName: nameOf(at._debugOwner) });
    }
    return frames;
  }
  const raw = getRawOwnerStack(fiber);
  // Bippy owns stack extraction; every raw frame uses the same worker/store as
  // creation evidence. Calling getOwnerStack(..., false) fetched whole chunks
  // and maps again for every element. Its column convention is zero-based at
  // symbolication, so adapt once at the standalone mapper's one-based boundary.
  const mapped = raw.length ? await Promise.all(raw.map(async frame => {
    if (!frame.fileName || /\/_next\/static\/chunks\/node_modules_next_dist_/.test(frame.fileName) || !frame.lineNumber || frame.columnNumber === undefined) return frame;
    const at = await mappedFrame(frame.fileName, frame.lineNumber, frame.columnNumber + 1);
    return at ? { ...frame, fileName: at.source, lineNumber: at.line, columnNumber: at.column - 1,
      functionName: at.name ?? frame.functionName, isSymbolicated: true, isIgnoreListed: at.ignored === true } : frame;
  })) : await getOwnerStack(fiber, true);
  const urls = raw.map(frame => frame.fileName).filter(Boolean);
  const pathOf = url => { try { return decodeURIComponent(new URL(url).pathname); } catch { return url; } };
  // bippy may prepend a component definition inferred from an owned child.
  // Keep the raw React creation records, never that synthetic definition.
  const records = raw.length ? mapped.slice(-raw.length) : mapped;
  // Each mapped frame keeps the raw frame it was read from, so another reading of the same frame can be matched to it.
  return records.map((frame, i) => ({ ...frame, raw: raw[i] && raw[i].fileName + ':' + raw[i].lineNumber + ':' + raw[i].columnNumber, i })).filter(frame => frame.fileName && (!/^webpack(?:-internal)?:/.test(frame.fileName) || frame.isSymbolicated)).map(({ i, ...frame }) => {
    let fileName = frame.fileName;
    if (!/^[a-z]+:/i.test(fileName) && !fileName.startsWith('/')) {
      // The module this name came from: the raw frame whose URL ends in the same path (positions need not line up).
      const tail = '/' + fileName.replace(/^(?:\.\.?\/)+/, '');
      const base = urls.find(url => pathOf(url).endsWith(tail)) ?? raw[i]?.fileName;
      try { if (base) fileName = new URL(fileName, base).href; } catch {}
    }
    return { ...frame, fileName, functionName: frame.functionName ?? raw[i]?.functionName };
  });
}

// Whether the host stamps JSX (the readiness report says), and whether any element on the page carries a stamp. When
// the host stamps and the page has none, an element whose own JSX is in your files is refused rather than guessed from
// the owner stack: stamping is not running, and the setup panel says so.
let stampsExpected = false;
/** The host fibers whose own creation frame proved a JSX opening in your files: their JSX is yours, not a library's. */
const ownHosts = new WeakSet();
export function expectStamps(value) { stampsExpected = value === true; }
export function pageStamped() {
  for (const node of document.querySelectorAll('[data-plumb-source]')) if (/^(.+):(\d+):(\d+)#[a-f0-9]{12}$/.test(node.getAttribute('data-plumb-source'))) return true;
  return false;
}

export async function locate(element, options = {}) {
  const fiber = element?.nodeType === 1 ? hostOf(element) : null;
  const stamp = fiber?.memoizedProps?.['data-plumb-source'];
  const match = typeof stamp === 'string' && /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(stamp);
  let confirmed;
  if (match && typeof fiber.type === 'string' && !options.signal?.aborted) {
    try {
      const answer = await request('resolve', { source: match[1], line: match[2], column: match[3], hash: match[4], tag: fiber.type, stamp: '1' }, { explain: true, batch: options.batch });
      if (answer?.file && answer.line && answer.column) confirmed = answer;
    } catch (error) { if (error?.starting || error?.failed) throw error; }
  }
  // Owner-stack behavior remains the fallback and the navigation chain. A
  // forwarded component stamp describes usage, never a new default target.
  // A confirmed host stamp is the answer. The chain above it (for Alt+↑/↓) comes from the owner stack, which costs a few
  // hundred milliseconds; the overlay asks for it after the reading is up, with { chain: true }.
  if (confirmed && !confirmed.usage && !options.chain && !options.signal?.aborted) {
    // The component whose JSX this is: the host's owner, read from React, no stack needed.
    const at = { file: confirmed.file, line: confirmed.line, column: confirmed.column, component: nameOf(fiber._debugOwner) };
    return { ...at, tag: element.localName, via: 'stamp', chain: [at], index: 0, partial: true };
  }
  const owner = await locateOwner(element, { ...options, explain: true });
  if (owner?.reason === 'resolve-refusal' && owner.detail?.file) return options.explain ? owner : null;
  // The element's own JSX is in your files, yet it carries no stamp and nothing on the page does: stamping is not
  // running. The owner stack would be a guess; say why instead. A host a library drew keeps its owner-stack answer.
  if (!confirmed && !match && fiber && ownHosts.has(fiber) && stampsExpected && !pageStamped()) {
    return options.explain ? { location: null, reason: 'no-stamps', detail: { file: owner.file, line: owner.line, column: owner.column } } : null;
  }
  if (!confirmed && !match && fiber && (!owner || owner.location === null) && !options.signal?.aborted) {
    // A host a library drew (an icon's <path>, a primitive's inner <div>) carries no stamp of its own. The component that
    // drew it was stamped where it is used, in its props, so the nearest stamped owner is the usage site: exact, and no
    // source map involved. Only a component stamp can stand in; a host stamp further up describes a different element.
    for (let up = fiber._debugOwner, n = 0; up && n < 32; up = up._debugOwner, n++) {
      const found = typeof up.memoizedProps?.['data-plumb-source'] === 'string' && /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(up.memoizedProps['data-plumb-source']);
      if (!found) continue;
      try {
        const answer = await request('resolve', { source: found[1], line: found[2], column: found[3], hash: found[4], tag: '*', stamp: '1' }, { explain: true, batch: options.batch });
        if (answer?.usage && answer.file) {
          const at = { file: answer.file, line: answer.line, column: answer.column, component: answer.component, usage: true };
          return { ...at, tag: element.localName, via: 'stamp-owner', chain: [at], index: 0 };
        }
      } catch (error) { if (error?.starting || error?.failed) throw error; }
      break;
    }
  }
  if (!confirmed || options.signal?.aborted) return owner?.location === null && !options.explain ? null : owner;
  const chain = [...(owner?.chain ?? [])];
  const index = chain.findIndex(link => link.file === confirmed.file && link.line === confirmed.line && link.column === confirmed.column);
  if (confirmed.usage) {
    // A component's stamp forwarded onto the host it renders (<Link> onto its <a>, <motion.span> onto its <span>) is the
    // exact usage site. When the owner chain cannot answer, that link is the answer.
    if (!owner?.chain) {
      const at = { file: confirmed.file, line: confirmed.line, column: confirmed.column, component: confirmed.component, usage: true };
      return { ...at, tag: element.localName, via: 'stamp-usage', chain: [at], index: 0 };
    }
    if (index >= 0) chain[index] = { ...chain[index], usage: true };
    else chain.push({ file: confirmed.file, line: confirmed.line, column: confirmed.column, component: confirmed.component, usage: true });
    return { ...owner, chain };
  }
  const at = { file: confirmed.file, line: confirmed.line, column: confirmed.column, component: index >= 0 ? chain[index].component : null };
  if (index >= 0) chain.splice(index, 1);
  chain.unshift(at);
  return { ...at, tag: element.localName, via: 'stamp', chain, index: 0 };
}

// Where an element's class list is written: its class site (docs/research/engine-review.md item 1), one resolver for
// every card and Tidy: the server's GET class-site, asked with the element's line and the usages above it (nearest
// first). Each class comes back with the plain strings it is written in: the element's own className (a literal, a
// template's fixed part, a ternary's branch), a variable it reads, or a usage up the chain that passes it in. A writer
// changes a class in the string it is written in (`at`), never adds it into a branch, and adds a new class where the
// server says (`add`).
// Answers { file, line, column, hash (the element a write targets: the usage when the classes are passed in), usage,
// prop, kind, classes (the classes written there), at (the string's line, the line said in the header), sites (class →
// [ClassSite]), add, addRefused, hashes } — { refused } with a sentence — or null when the element can't be placed.
// `need`: the classes a change replaces; their site, or refused when no plain string, or more than one element, holds them.
export const BUILT_IN_CODE = FIX.card.builtInCode, SPLIT = FIX.card.splitClasses;
const readSites = async (element, need) => {
  const at = await locate(element, { chain: true });
  if (!at?.file) return null;
  const chain = (at.chain ?? []).slice(1, 9).filter((l) => l?.file).map(({ file, line, column }) => ({ file, line, column }));
  const params = { file: at.file, line: at.line, column: at.column, ...(chain.length ? { chain: JSON.stringify(chain) } : {}), ...(need?.length ? { classes: need.join(' ') } : {}) };
  const answer = await request('class-site', params).catch(() => null);
  // `of`: the element and chain the sites were read through, sent with a pinned write so the server checks the pin
  // against the same reading (a usage's prop, a variable, a branch) instead of the written element alone
  return answer ? { at, answer, of: { file: at.file, line: at.line, column: at.column, chain } } : null;
};
const keyOf = (e) => `${e.file}:${e.line}:${e.column}`;
export async function classSiteOf(element, need = []) {
  const read = await readSites(element, need);
  if (!read) return null;
  const { answer, of } = read;
  if (answer.refused && !need.length) return { refused: answer.refused, add: answer.add ?? null, addRefused: answer.addRefused };
  // the usages above the place a write targets, as class-site was asked them: the element's own chain, or what is above
  // the usage the classes are written at (the recipes ask with it, so they read the same strings: N7)
  const chainAt = (e) => {
    if (keyOf(e) === keyOf(answer.element ?? {})) return of.chain;
    let i = of.chain.findIndex((l) => keyOf(l) === keyOf(e));
    if (i < 0) i = of.chain.findIndex((l) => l.file === e.file && l.line === e.line);
    return i < 0 ? [] : of.chain.slice(i + 1);
  };
  const sites = new Map((answer.classes ?? []).map((c) => [c.class, c.sites ?? []]));
  // the element whose attribute a write targets: for `need`, the one that holds all of them; else the one most of them
  // are written at (an element passed classes from a usage reads as that usage)
  let pick;
  if (need.length) {
    const entries = need.map((c) => answer.classes?.find((x) => x.class === c));
    if (entries.some((x) => !x?.sites?.length)) return { refused: entries.find((x) => x?.refused)?.refused ?? answer.refused ?? BUILT_IN_CODE };
    const holders = new Set(entries.flatMap((x) => x.sites.map((s) => keyOf(s.element))));
    const common = [...holders].filter((k) => entries.every((x) => x.sites.some((s) => keyOf(s.element) === k)));
    if (!common.length) return { refused: SPLIT };
    pick = entries[0].sites.find((s) => keyOf(s.element) === common[0]);
  } else {
    const count = new Map();
    for (const c of answer.classes ?? []) for (const k of new Set((c.sites ?? []).map((s) => keyOf(s.element)))) count.set(k, (count.get(k) ?? 0) + 1);
    // the usage first: the classes given there are this one's own (the component's are every copy's), and what the
    // card writes for this element goes there (F1-02, N-03); else where most of its classes are written
    const usage = (answer.classes ?? []).flatMap((c) => c.sites ?? []).find((x) => x.kind === 'usage');
    const best = usage ? keyOf(usage.element) : [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
    pick = best ? (answer.classes ?? []).flatMap((c) => c.sites ?? []).find((s) => keyOf(s.element) === best) : null;
    if (!pick) {
      // nothing written yet: a class is added where the server says, or the element is locked with its reason
      const add = answer.add;
      if (!add) return { refused: answer.addRefused ?? answer.refused ?? BUILT_IN_CODE };
      return { file: add.element.file, line: add.element.line, column: add.element.column, hash: answer.hashes?.[add.element.file], usage: add.kind === 'usage', prop: add.prop, kind: add.kind, classes: [], at: add.string?.line ?? add.element.line, sites, add, addRefused: answer.addRefused, hashes: answer.hashes ?? {}, chain: chainAt(add.element) };
    }
  }
  const el = pick.element, here = [...sites].filter(([, ss]) => ss.some((s) => keyOf(s.element) === keyOf(el))).map(([c]) => c);
  return { file: el.file, line: el.line, column: el.column, hash: answer.hashes?.[el.file], usage: pick.kind === 'usage', prop: pick.prop, kind: pick.kind, classes: here, anchor: here.at(-1) ?? null,
    at: pick.string.line, sites, add: answer.add ?? null, addRefused: answer.addRefused, hashes: answer.hashes ?? {}, chain: chainAt(el) };
}
// The edits that turn `from` (classes the element wears, as written) into `to`, each in the string it is written in:
// [{ file, hash, edit: { line, column, from, to, at } }]. Classes written in two strings are changed in each; classes
// split across strings, or a class added where nothing can be added, refuse with the reason (throws).
export async function classEditsOf(element, from, to) {
  const names = (v) => String(v ?? '').split(/\s+/).filter(Boolean);
  const out = names(from), add = names(to);
  const read = await readSites(element, out);
  if (!read) throw new Error(FIX.text.unreachable);
  const { answer, of } = read, hashes = answer.hashes ?? {};
  const edit = (el, string, f, t) => ({ file: el.file, hash: hashes[el.file], edit: { line: el.line, column: el.column, from: f, to: t, ...(string ? { at: { line: string.line, column: string.column }, of } : {}) } });
  if (!out.length) {
    // the element's classes also come in from a usage that wasn't found: the place left is the component's own string,
    // and a class added there (beside a kin or not) lands on every copy (B2)
    if (answer.add?.shared) throw new Error(FIX.card.addShared);
    // a class added beside the one of its family it overrides (pl-3 beside px-2.5, in the variable or the branch that
    // writes px-2.5), so the two stay together where the element's spacing is written; else where the server says. The
    // server takes a write that keeps px-2.5 and adds pl-3 as an add: never into a variable other elements read (N5), so
    // a kin written in one goes where the server says instead
    const family = /^(p|m)[xytrblse]?-|^gap(?:-[xy])?-/.exec(add[0] ?? '')?.[1] ?? (/^gap/.test(add[0] ?? '') ? 'gap' : null);
    const kin = family && (answer.classes ?? []).find((c) => c.sites?.length && !c.class.includes(':') && (family === 'gap' ? /^gap(?:-[xy])?-/ : new RegExp(`^${family}[xytrblse]?-`)).test(c.class));
    if (kin && kin.sites.every((s) => (s.readers ?? 1) <= 1)) return kin.sites.map((s) => edit(s.element, s.string, kin.class, [kin.class, ...add].join(' ')));
    if (!answer.add) throw new Error(answer.addRefused ?? answer.refused ?? BUILT_IN_CODE);
    return [edit(answer.add.element, answer.add.string, '', add.join(' '))];
  }
  const entries = out.map((c) => answer.classes?.find((x) => x.class === c));
  if (entries.some((x) => !x?.sites?.length)) throw new Error(entries.find((x) => x?.refused)?.refused ?? answer.refused ?? BUILT_IN_CODE);
  // the strings that hold the classes: every class of `from` in each one, else the change is split
  const strings = new Map();
  for (const x of entries) for (const s of x.sites) { const k = `${keyOf(s.element)}@${s.string.start}`; if (!strings.has(k)) strings.set(k, { s, n: 0 }); strings.get(k).n++; }
  const whole = [...strings.values()].filter((v) => v.n === out.length);
  if (!whole.length) throw new Error(SPLIT);
  return whole.map(({ s }) => edit(s.element, s.string, out.join(' '), add.join(' ')));
}
// The other elements on the page drawn from an element's class site, outside it: the elements with its own stamp, and
// when the site is a usage, only those whose component was used at that line (the rows of one list, not every Link).
export function siteMates(element, site) {
  const own = element?.getAttribute('data-plumb-source');
  if (!own) return 0;
  const same = [...document.querySelectorAll(`[data-plumb-source="${CSS.escape(own)}"]`)].filter((x) => x !== element && !element.contains(x));
  if (!site?.usage) return same.length;
  const there = (stamp) => {
    const m = typeof stamp === 'string' && /^(.+):(\d+):\d+#/.exec(stamp);
    if (!m || +m[2] !== site.line) return false;
    const file = decodeURIComponent(m[1]);
    return site.file === file || site.file.endsWith('/' + file);
  };
  return same.filter((x) => {
    const key = fiberKey(x);
    for (let f = key ? x[key] : null, n = 0; f && n < 64; f = f.return, n++) if (typeof f.type !== 'string' && there(f.memoizedProps?.['data-plumb-source'])) return true;
    return false;
  }).length;
}

async function locateOwner(element, options = {}) {
  const considered = []; // explain: every frame asked about and the server's answer, attached to refusals
  const refuse = (reason, detail = {}) => options.explain ? { location: null, reason, detail: considered.length ? { ...detail, considered } : detail } : null;
  if (!element || element.nodeType !== 1) return refuse('no-fiber', { step: 'invalid-element' });
  const fiber = hostOf(element);
  if (!fiber) return refuse('no-fiber');
  if (options.signal?.aborted) return refuse('map', { step: 'cancelled' });
  const stack = stackOf(fiber);
  // One answer per question within a locate: frames are asked about together, then read in order.
  const asked = new Map();
  const ask = params => {
    const key = JSON.stringify(params);
    if (!asked.has(key)) asked.set(key, request('resolve', params, { explain: true, batch: options.batch })
      .catch(error => { if (error?.starting || error?.failed) throw error; return { refused: error?.detail ?? error?.message }; }));
    return asked.get(key);
  };
  const chain = [], seen = new Map();
  let ownProven = false;
  let last = [];
  const tryFrame = async frame => {
    if (frame?.failure) {
      if (frame.rawSource) {
        const classification = await ask({ source: frame.rawSource });
        if (classification?.library && !classification.untracked) return { proven: false };
      }
      return frame.failure;
    }
    if (options.signal?.aborted || !frame?.fileName || !frame.lineNumber || frame.fileName.startsWith('about:')) return;
    const at = { source: frame.fileName, line: frame.lineNumber, column: (frame.columnNumber ?? 0) + 1 };
    const key = at.source + ':' + at.line + ':' + at.column;
    if (seen.has(key)) return { proven: seen.get(key) };
    // Hash the original sourcesContent bytes, and compare to disk even when
    // the position still identifies JSX. Never refresh this stack on mismatch.
    if (frame.hash) {
      const snapshot = await ask({ source: at.source, snapshot: '1' });
      if (snapshot?.hash && snapshot.hash !== frame.hash) return { reason: 'source-mismatch', detail: { source: at.source, mapHash: frame.hash, currentHash: snapshot.hash } };
      if (snapshot?.refused) return { reason: 'resolve-refusal', detail: { source: at.source, response: snapshot.refused } };
    }
    const result = await ask({ ...at, ...(frame.hash ? { hash: frame.hash } : {}) });
    if (options.explain) considered.push({ ...at, answer: result?.file ? 'jsx' : result?.refused ? result.refused + (result.at ? ':' + result.at : '') : (result?.untracked ? 'untracked' : result?.library ? 'library' : 'none') });
    // A frame that is not JSX is a call that rendered something (items.map(...), createElement). One past the file, on a
    // hook call or on no call at all cannot have created an element: the module's map is wrong, never skipped past.
    if (result?.refused === 'not-jsx') return !result.at || result.at === 'call' ? { reason: 'no-jsx', detail: at }
      : { reason: 'map', detail: { ...at, step: 'position-not-a-call', at: result.at } };
    if (result?.refused) {
      if (frame.hash) {
        const snapshot = await ask({ source: at.source, snapshot: '1' });
        if (snapshot?.hash && snapshot.hash !== frame.hash) return { reason: 'source-mismatch', detail: { source: at.source, mapHash: frame.hash, currentHash: snapshot.hash } };
      }
      return { reason: 'resolve-refusal', detail: { ...at, response: result.refused } };
    }
    // An authored source boundary must not borrow a checked ancestor's reading.
    if (result?.untracked) return chain.length ? { proven: false } : { reason: 'resolve-refusal', detail: { source: at.source, file: result.untracked, response: 'Source is not a tracked project source.' } };
    const proven = !!(result?.file && result.line && result.column);
    seen.set(key, proven);
    if (proven && !chain.some(link => link.file === result.file && link.line === result.line && link.column === result.column)) chain.push({ file: result.file, line: result.line, column: result.column, component: result.component ?? named(frame.functionName) });
    return { proven };
  };
  // Maps without source content (Turbopack) cannot prove a kept element's positions still describe the file. For
  // those only: the first sight of a creation stack records the file's hash; the same stack after the file changed is
  // an element kept from before the edit, and its positions describe code that no longer exists.
  // Start both mapping paths together. Their frames share chunk/map flights.
  const firstFrames = framesOf(fiber).then(frames => ({ frames }), error => ({ error }));
  const first = stack ? await creationFrame(fiber) : null;
  const initial = await firstFrames;
  if (initial.error) return refuse('map', { step: 'owner-stack', error: String(initial.error?.message ?? initial.error) });
  const initialFrames = initial.frames;
  const prime = frame => {
    if (!frame?.fileName || !frame.lineNumber || frame.fileName.startsWith('about:')) return;
    if (frame.hash || frame === first && !frame.failure) ask({ source: frame.fileName, snapshot: '1' }).catch(() => {});
    ask({ source: frame.fileName, line: frame.lineNumber, column: (frame.columnNumber ?? 0) + 1,
      ...(frame.hash ? { hash: frame.hash } : {}) }).catch(() => {});
  };
  prime(first);
  for (const frame of initialFrames.filter(frame => isSourceFile(frame.fileName))) prime(frame);
  if (first?.fileName && !first.failure && !first.hash) {
    const snapshot = await ask({ source: first.fileName, snapshot: '1' });
    const known = stackHashes.get(stack);
    if (snapshot?.hash && known && known !== snapshot.hash) return refuse('source-mismatch', { source: first.fileName, mapHash: known, currentHash: snapshot.hash, retained: true });
    if (snapshot?.hash && !known) stackHashes.set(stack, snapshot.hash);
  }
  // React 17/18 record no creation stack, so the no-JSX boundary is read from records: an element without its own
  // _debugSource whose owner is a project component (other elements it creates carry project _debugSource) was made
  // without JSX in that component. A library owner's elements carry none, or point into dependencies.
  for (let child = fiber, depth = 0; child && !child._debugStack && depth < 32; child = child._debugOwner, depth++) {
    if (child._debugSource || !child._debugOwner) continue;
    const owner = child._debugOwner, queue = [owner.child], authored = [];
    for (let n = 0; queue.length && n < 400; n++) {
      const at = queue.shift(); if (!at) continue;
      if (at._debugOwner === owner && at._debugSource?.fileName && !runtime(at._debugSource.fileName)) authored.push(at._debugSource);
      queue.push(at.child, at.sibling);
    }
    if (authored.length) {
      const probe = await ask({ source: 'file://' + authored[0].fileName, line: authored[0].lineNumber, column: authored[0].columnNumber ?? 1 });
      if (probe?.file) return refuse('no-jsx', { step: 'created-without-jsx', owner: nameOf(owner), source: 'file://' + authored[0].fileName, line: authored[0].lineNumber, column: authored[0].columnNumber ?? 1 });
    }
    // An authored factory may create no JSX siblings at all. Its own React
    // usage record can prove a local component binding, never an import merely
    // used by this file. This probe only draws a boundary; it adds no location.
    const source = owner._debugSource;
    if (source?.fileName && !runtime(source.fileName)) {
      const at = { source: 'file://' + source.fileName, line: source.lineNumber, column: source.columnNumber ?? 1 };
      const probe = await ask({ ...at, owner: '1' });
      if (probe?.authoredOwner) return refuse('no-jsx', { ...at, step: 'created-without-jsx', owner: nameOf(owner) });
    }
  }
  for (let owner = fiber, depth = 0; owner && depth < 32 && !chain.length; owner = owner._debugOwner, depth++) {
    // Check the actual creation frame before bippy can walk past it. A call
    // in authored code is a boundary, even when an ancestor has valid JSX.
    const own = await creationFrame(owner);
    let frames;
    try { frames = owner === fiber ? initialFrames : await framesOf(owner); }
    catch (error) { return refuse('map', { step: 'owner-stack', error: String(error?.message ?? error) }); }
    // Match the creation boundary to Bippy's exact raw record, preserving its
    // source-content hash. Both paths now use the same symbolication store.
    const same = own?.raw && frames.find(frame => frame.raw === own.raw && frame.lineNumber);
    if (same) Object.assign(own, { lineNumber: same.lineNumber, columnNumber: same.columnNumber });
    // When Plumb's reader cannot map the element's own frame (a Turbopack chunk), bippy's first frame is that frame.
    const unmapped = own?.failure?.reason === 'map' && frames.some(frame => frame.fileName && frame.lineNumber);
    if (own && !unmapped) {
      const failure = await tryFrame(own);
      if (owner === fiber && failure?.proven) ownProven = true;
      // A module Turbopack hot-updated runs from eval with its own inline map, which Next traces a line off. That
      // position is the map's, not evidence the element was made without JSX; refuse it as unreadable until a reload.
      if ((failure?.reason === 'no-jsx' || failure?.reason === 'map') && !own.hash && /[?&]id=/.test(own.raw ?? '')) return refuse('map', { ...failure.detail, step: 'hot-update-map' });
      if (failure?.reason) return refuse(failure.reason, failure.detail);
    }
    const candidates = frames.filter(frame => frame.fileName && frame.lineNumber && !frame.fileName.startsWith('about:') && isSourceFile(frame.fileName));
    if (candidates.length) last = candidates;
    // Start every frame's question at once; the loop below still decides in stack order.
    for (const frame of candidates) ask({ source: frame.fileName, line: frame.lineNumber, column: (frame.columnNumber ?? 0) + 1 }).catch(() => {});
    let ownerStackProven = false;
    for (const [i, frame] of candidates.entries()) {
      const result = await tryFrame(frame);
      // The element's own creation frame (the stack's first), proved in your files: its JSX is yours. A library's host
      // has its first frame in the library, and the first candidate is only where the library was used.
      if (owner === fiber && frame === frames[0] && result?.proven) ownProven = true;
      // Only an element's own creation frame draws the no-JSX boundary. Later frames in a stack are the code that
      // called it, such as App calling items.map(...): not JSX, and not a reason to refuse.
      if (result?.reason === 'no-jsx' && !(unmapped && i === 0)) continue;
      if (result?.reason) return refuse(result.reason, result.detail);
      ownerStackProven ||= result?.proven === true;
    }
    // Webpack eval and memo/forwardRef builds may give bippy no authored
    // frames. React's creation records still prove each owner's usage site.
    for (let up = !ownerStackProven && chain.length ? owner._debugOwner : null, n = 0; up && n < 32; up = up._debugOwner, n++) {
      const frame = await creationFrame(up);
      if (frame) {
        const failure = await tryFrame(frame);
        if (failure?.reason) return refuse(failure.reason, failure.detail);
      }
    }
  }
  if (options.signal?.aborted) return refuse('map', { step: 'cancelled' });
  if (!chain.length) {
    return refuse('runtime-only-frames', { step: 'no-project-frame', frames: last.slice(0, 6).map(frame => frame.fileName) });
  }
  const index = Math.max(0, chain.findIndex(link => !shared(link.file)));
  const at = chain[index];
  if (ownProven) ownHosts.add(fiber);
  return { file: at.file, line: at.line, column: at.column, component: at.component, tag: element.localName, via: 'owner-stack', chain, index };
}
