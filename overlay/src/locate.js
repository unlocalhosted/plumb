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
function nameOf(fiber) {
  const type = fiber?.type;
  return fiber?.name ?? type?.displayName ?? (typeof type === 'function' ? type.name : type?.render?.displayName ?? type?.render?.name) ?? null;
}
function componentName(fiber) {
  let depth = 0;
  for (let owner = fiber?._debugOwner; owner && depth++ < 12; owner = owner._debugOwner) {
    const name = nameOf(owner);
    if (name) return name;
  }
  return null;
}
function boundary(fiber) {
  for (let node = fiber; node; node = node.return) {
    // HostPortal and HostRoot delimit ownership; their state survives alternates.
    if (node.tag === 4 || node.tag === 3) return node.stateNode;
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
  // Aliases and member expressions need not match the component's displayName,
  // but an owner site must still be component JSX, never a containing host tag.
  const result = await request('resolve', { ...position, ...(via === 'owner' ? { component: '1' } : { tag: element.localName }) }, { explain: true });
  if (version !== sourceMapVersion()) refuse('map', { step: 'invalidated-during-resolve', source: position.source });
  if (!result || !Number.isSafeInteger(result.line) || !Number.isSafeInteger(result.column)) refuse('resolve-refusal', { source: position.source, result });
  return { ...result, component: via === 'owner' ? nameOf(fiber) : componentName(fiber), tag: element.localName, via,
    ...(via === 'owner' ? { rendered: element.localName } : {}) };
}

async function authoredLocation(fiber, element, via) {
  if (fiber._debugStack) {
    let version = sourceMapVersion();
    const previous = evidence.get(fiber._debugStack);
    const ownerType = fiber._debugOwner?.type;
    // Next Fast Refresh can retain stacks across a committed owner replacement.
    const refreshed = previous && ownerType && previous.ownerType && ownerType !== previous.ownerType;
    if (refreshed && previous.version === version) { invalidateSourceMaps(); version = sourceMapVersion(); }
    if (previous && !refreshed && previous.version !== version) return resolveLocation(previous.position, fiber, element, via, false);
    const creationFrames = frames(fiber._debugStack.stack);
    if (!creationFrames.length) refuse('owner-unproven', { step: 'missing-creation-frames' });
    for (const frame of creationFrames) {
      if (runtimeSource(frame.source)) continue;
      const mappedResult = await mapFrame(frame.source, frame.line, frame.column, { explain: true });
      const mapped = mappedResult.location;
      if (!mapped) refuse(mappedResult.reason, { ...mappedResult.detail, frame });
      // Opaque chunks can mix library and authored modules. Use mapped paths.
      if (runtimeSource(mapped.source)) continue;
      if (!mapped.hash) refuse('map', { step: 'missing-sources-content', source: mapped.source });
      if (refreshed && ['source', 'line', 'column'].some(key => mapped[key] !== previous.position[key]))
        refuse('map', { step: 'retained-stack-position-changed', previous: previous.position, current: mapped });
      // A failed authored frame must never fall through to a caller or owner.
      const result = await resolveLocation(mapped, fiber, element, via);
      if (version === sourceMapVersion()) evidence.set(fiber._debugStack, { version, position: mapped, ownerType });
      return result;
    }
    return null;
  }
  const source = fiber._debugSource;
  if (source && !runtimeSource(source.fileName))
    return resolveLocation({ source: source.fileName, line: source.lineNumber, column: source.columnNumber }, fiber, element, via);
  return null;
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
    const direct = await authoredLocation(fiber, element, fiber._debugStack ? 'react19' : 'react-debugSource');
    if (direct) return direct;
    const tree = boundary(fiber), seen = new Set([fiber]);
    let owner = fiber._debugOwner;
    let child = fiber;
    for (let depth = 0; owner && depth < 12; depth++, owner = owner._debugOwner) {
      if (seen.has(owner) || !tree || boundary(owner) !== tree) refuse('runtime-only-frames', { step: 'owner-boundary' });
      // A null authoredLocation only proves runtime creation when a mapped
      // creation stack was checked. React 17/18 _debugSource records where the
      // child was instantiated, not whether its owner is authored code. Without
      // function provenance, createElement in App is indistinguishable from a
      // library-created host. Never borrow <App /> (or another caller's JSX).
      if (!child._debugStack) refuse('owner-unproven', { step: 'missing-creation-stack', component: nameOf(owner) });
      seen.add(owner);
      const location = await authoredLocation(owner, element, 'owner');
      if (location) return location;
      child = owner;
    }
    refuse('runtime-only-frames', { step: owner ? 'owner-depth-limit' : 'no-authored-owner' });
  } catch (error) {
    if (error?.starting) throw error; // the server has not finished its first read; that is not "unplaced"
    return options.explain ? { location: null, reason: error.reason ?? 'map', detail: error.detail ?? { error: error.message } } : null;
  }
}
