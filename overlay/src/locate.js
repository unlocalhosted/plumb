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
import { invalidateSourceMaps, sourceMapVersion, mapFrame } from './sourcemap.js';

// The first frame of a fiber's own creation stack (where its element was created) that is not a dependency, mapped
// through the module's source map. Used when bippy has no raw stack for an owner (forwardRef and memo in library builds).
const creationEvidence = new WeakMap(), ownerEvidence = new WeakMap(), committedStacks = new WeakMap();
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
const runtime = url => /\/node_modules\/|\/(?:dist|deps)\/|\/\.vite\/deps\/|\/_next\/static\/chunks\/(?:framework|main|webpack)|^about:|\/\((?:rsc|ssr|action-browser)\)\//.test(url);
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
    const mapped = await mapFrame(m[1], Number(m[2]), Number(m[3]), { explain: true }).catch(() => null);
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
  const [mapped, raw] = await Promise.all([getOwnerStack(fiber, false), getRawOwnerStack(fiber)]);
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

export async function locate(element, options = {}) {
  const fiber = element?.nodeType === 1 ? hostOf(element) : null;
  const stamp = fiber?.memoizedProps?.['data-plumb-source'];
  const match = typeof stamp === 'string' && /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(stamp);
  let confirmed;
  if (match && typeof fiber.type === 'string' && !options.signal?.aborted) {
    try {
      const answer = await request('resolve', { source: match[1], line: match[2], column: match[3], hash: match[4], tag: fiber.type, stamp: '1' }, { explain: true });
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
  const owner = await locateOwner(element, options);
  if (!confirmed && !match && fiber && (!owner || owner.location === null) && !options.signal?.aborted) {
    // A host a library drew (an icon's <path>, a primitive's inner <div>) carries no stamp of its own. The component that
    // drew it was stamped where it is used, in its props, so the nearest stamped owner is the usage site: exact, and no
    // source map involved. Only a component stamp can stand in; a host stamp further up describes a different element.
    for (let up = fiber._debugOwner, n = 0; up && n < 32; up = up._debugOwner, n++) {
      const found = typeof up.memoizedProps?.['data-plumb-source'] === 'string' && /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(up.memoizedProps['data-plumb-source']);
      if (!found) continue;
      try {
        const answer = await request('resolve', { source: found[1], line: found[2], column: found[3], hash: found[4], tag: '*', stamp: '1' }, { explain: true });
        if (answer?.usage && answer.file) {
          const at = { file: answer.file, line: answer.line, column: answer.column, component: answer.component, usage: true };
          return { ...at, tag: element.localName, via: 'stamp-owner', chain: [at], index: 0 };
        }
      } catch (error) { if (error?.starting || error?.failed) throw error; }
      break;
    }
  }
  if (!confirmed || options.signal?.aborted) return owner;
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

async function locateOwner(element, options = {}) {
  const considered = []; // explain: every frame asked about and the server's answer, attached to refusals
  const refuse = (reason, detail = {}) => options.explain ? { location: null, reason, detail: considered.length ? { ...detail, considered } : detail } : null;
  if (!element || element.nodeType !== 1) return refuse('no-fiber', { step: 'invalid-element' });
  const fiber = hostOf(element);
  if (!fiber) return refuse('no-fiber');
  if (options.signal?.aborted) return refuse('map', { step: 'cancelled' });
  // Next uses stable chunk URLs. A different committed creation stack on the
  // same DOM node starts new module evidence; old Errors retain their own maps.
  const previous = committedStacks.get(fiber.stateNode);
  const stack = stackOf(fiber);
  if (stack && previous && previous !== stack && !creationEvidence.has(stack)) invalidateSourceMaps();
  if (stack && fiber.stateNode) committedStacks.set(fiber.stateNode, stack);
  // One answer per question within a locate: frames are asked about together, then read in order.
  const asked = new Map();
  const ask = params => {
    const key = JSON.stringify(params);
    if (!asked.has(key)) asked.set(key, request('resolve', params, { explain: true })
      .catch(error => { if (error?.starting || error?.failed) throw error; return { refused: error?.detail ?? error?.message }; }));
    return asked.get(key);
  };
  const chain = [], seen = new Map();
  let last = [], unchecked;
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
    // An untracked file is not the project's checked source: pass through it like library code, and only report it
    // ("not checked") when nothing tracked is found further up.
    if (result?.untracked) { unchecked ??= { source: at.source, file: result.untracked, response: 'Source is not a tracked project source.' }; return { proven: false }; }
    const proven = !!(result?.file && result.line && result.column);
    seen.set(key, proven);
    if (proven && !chain.some(link => link.file === result.file && link.line === result.line && link.column === result.column)) chain.push({ file: result.file, line: result.line, column: result.column, component: result.component ?? named(frame.functionName) });
    return { proven };
  };
  // Maps without source content (Turbopack) cannot prove a kept element's positions still describe the file. For
  // those only: the first sight of a creation stack records the file's hash; the same stack after the file changed is
  // an element kept from before the edit, and its positions describe code that no longer exists.
  const first = stack ? await creationFrame(fiber) : null;
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
    try { frames = await framesOf(owner); }
    catch (error) { return refuse('map', { step: 'owner-stack', error: String(error?.message ?? error) }); }
    // Plumb's reader maps to the nearest preceding segment, which can land before the JSX (even on the line above,
    // the component's name); bippy's symbolication of the same raw frame is exact. Keep Plumb's hash, take bippy's position.
    const same = own?.raw && frames.find(frame => frame.raw === own.raw && frame.lineNumber);
    if (same) Object.assign(own, { lineNumber: same.lineNumber, columnNumber: same.columnNumber });
    // When Plumb's reader cannot map the element's own frame (a Turbopack chunk), bippy's first frame is that frame.
    const unmapped = own?.failure?.reason === 'map' && frames.some(frame => frame.fileName && frame.lineNumber);
    if (own && !unmapped) {
      const failure = await tryFrame(own);
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
    if (unchecked) return refuse('resolve-refusal', unchecked);
    return refuse('runtime-only-frames', { step: 'no-project-frame', frames: last.slice(0, 6).map(frame => frame.fileName) });
  }
  const index = Math.max(0, chain.findIndex(link => !shared(link.file)));
  const at = chain[index];
  return { file: at.file, line: at.line, column: at.column, component: at.component, tag: element.localName, via: 'owner-stack', chain, index };
}
