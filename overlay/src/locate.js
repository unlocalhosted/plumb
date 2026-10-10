import { request } from './api.js';
import { mapFrame, invalidateSourceMaps, sourceMapVersion } from './sourcemap.js';

const evidence = new WeakMap();

function currentFiber(fiber) {
  const alternate = fiber.alternate;
  if (!alternate) {
    let root = fiber;
    while (root.return) root = root.return;
    return root.tag === 3 && root.stateNode?.current ? fiber : null;
  }
  let a = fiber, b = alternate;
  // React leaves the DOM's fiber key on either side of the double buffer.
  // Follow both branches, including shared children after a bailout, to the
  // committed root. Never remap the previous render's stack through a new map.
  while (a.return) {
    const parent = a.return, other = parent.alternate;
    if (!other) {
      // A hidden Suspense/Activity parent can have no alternate of its own.
      if (parent.return) { a = parent.return; b = parent.return; continue; }
      break;
    }
    if (parent.child === other.child) {
      for (let child = parent.child; child; child = child.sibling) {
        if (child === a) return fiber;
        if (child === b) return alternate;
      }
      return null;
    }
    if (a.return !== b.return) { a = parent; b = other; continue; }
    let found = false;
    for (const branch of [parent, other]) {
      for (let child = branch.child; child; child = child.sibling) {
        if (child === a || child === b) {
          const same = child === a;
          a = same ? branch : branch.alternate;
          b = same ? branch.alternate : branch;
          found = true; break;
        }
      }
      if (found) break;
    }
    if (!found || a.alternate !== b) return null;
  }
  if (a.tag !== 3 || !a.stateNode?.current) return null;
  return a.stateNode.current === a ? fiber : alternate ?? null;
}
function hostFiber(element) {
  for (let node = element; node; node = node.parentElement) {
    const key = Object.keys(node).find(key => key.startsWith('__reactFiber$'));
    for (let fiber = key && node[key]; fiber; fiber = fiber.return) {
      // An imperative child has no authored JSX site. Never borrow its parent's location.
      if (typeof fiber.type === 'string' && fiber.stateNode === element) return currentFiber(fiber);
    }
  }
  return null;
}
function componentName(fiber) {
  for (let owner = fiber?._debugOwner; owner; owner = owner._debugOwner) {
    const type = owner.type;
    const name = owner.name ?? type?.displayName ?? (typeof type === 'function' ? type.name : type?.render?.displayName ?? type?.render?.name);
    if (name) return name;
  }
  return null;
}
function runtimeSource(source) {
  const path = decodeURIComponent(source).replaceAll('\\', '/');
  return /(?:^|\/)node_modules\/|(?:^|\/)\[turbopack\]\/|(?:^|\/)webpack\/bootstrap(?:$|[?#])/.test(path);
}
function frames(stack) {
  return String(stack ?? '').split('\n').flatMap(frame => {
    const match = /((?:https?:\/\/|webpack(?:-internal)?:\/\/|file:\/\/)[^\s]*?):(\d+):(\d+)\)?$/.exec(frame.trim());
    if (!match) return [];
    return match ? [{ source: match[1], line: Number(match[2]), column: Number(match[3]) }] : [];
  });
}
function refuse(reason, detail = {}) { throw Object.assign(new Error(reason), { reason, detail }); }
async function resolveLocation(position, fiber, element, via, invalidate = true) {
  const version = sourceMapVersion();
  // Next stable virtual URLs use an authoritative module-version query; Vite
  // also invalidates on vite:afterUpdate. Both bind the map to server source.
  if (position.hash) {
    const snapshot = await request('resolve', { source: position.source, snapshot: '1' }, { explain: true });
    if (snapshot?.hash !== position.hash) {
      if (invalidate) invalidateSourceMaps();
      refuse('source-mismatch', { source: position.source, mapHash: position.hash, currentHash: snapshot?.hash ?? null, retained: !invalidate });
    }
  }
  const result = await request('resolve', { ...position, tag: element.localName }, { explain: true });
  if (version !== sourceMapVersion()) refuse('map', { step: 'invalidated-during-resolve', source: position.source });
  if (!result || !Number.isSafeInteger(result.line) || !Number.isSafeInteger(result.column)) refuse('resolve-refusal', { source: position.source, result });
  return { ...result, component: componentName(fiber), tag: element.localName, via };
}

/** Locate only evidenced authored sites. All paths and JSX anchors are validated by the server. */
export async function locate(element, options = {}) {
  try {
    if (!element || element.nodeType !== 1) refuse('no-fiber', { step: 'invalid-element' });
    const fiber = hostFiber(element);
    const explicit = /^(.*):([1-9]\d*):([1-9]\d*)$/.exec(element.getAttribute('data-plumb-source') ?? '');
    if (explicit) {
      try {
        return await resolveLocation({ source: explicit[1], line: Number(explicit[2]), column: Number(explicit[3]) }, fiber, element, 'data-plumb-source');
      } catch (error) { if (!fiber) throw error; }
    }
    if (!fiber) refuse('no-fiber');
    if (fiber._debugStack) {
      let version = sourceMapVersion();
      const previous = evidence.get(fiber._debugStack);
      const ownerType = fiber._debugOwner?.type;
      // Next Fast Refresh reuses the Error on both host-fiber alternates. A
      // committed replacement owner function proves this is a new module's
      // render, whereas a save or cache invalidation alone proves nothing.
      const refreshed = previous && ownerType && previous.ownerType && ownerType !== previous.ownerType;
      if (refreshed && previous.version === version) { invalidateSourceMaps(); version = sourceMapVersion(); }
      if (previous && !refreshed && previous.version !== version) return await resolveLocation(previous.position, fiber, element, 'react19', false);
      for (const frame of frames(fiber._debugStack.stack)) {
        if (runtimeSource(frame.source)) continue;
        const mappedResult = await mapFrame(frame.source, frame.line, frame.column, { explain: true });
        const mapped = mappedResult.location;
        if (!mapped) refuse(mappedResult.reason, { ...mappedResult.detail, frame });
        // Opaque Next chunk URLs can contain both runtime and authored modules.
        // Classify their mapped module path, never a symbol/filename substring.
        if (runtimeSource(mapped.source)) continue;
        if (!mapped.hash) refuse('map', { step: 'missing-sources-content', source: mapped.source });
        // A retained Error has old generated coordinates. Adopt only if the
        // fresh map still identifies the same authored position; moved sites
        // need a fresh stack rather than an inferred coordinate correction.
        if (refreshed && ['source', 'line', 'column'].some(key => mapped[key] !== previous.position[key]))
          refuse('map', { step: 'retained-stack-position-changed', previous: previous.position, current: mapped });
        // First authored frame wins; caller frames must never substitute for an unmappable element.
        const result = await resolveLocation(mapped, fiber, element, 'react19');
        if (result && version === sourceMapVersion()) evidence.set(fiber._debugStack, { version, position: mapped, ownerType });
        return result;
      }
      refuse('runtime-only-frames', { stack: String(fiber._debugStack.stack ?? '') });
    }
    const source = fiber._debugSource;
    if (source) return await resolveLocation({ source: source.fileName, line: source.lineNumber, column: source.columnNumber }, fiber, element, 'react-debugSource');
    refuse('runtime-only-frames', { step: 'missing-debug-source' });
  } catch (error) {
    return options.explain ? { location: null, reason: error.reason ?? 'map', detail: error.detail ?? { error: error.message } } : null;
  }
}
