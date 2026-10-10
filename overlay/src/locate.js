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
import { sourceMapVersion } from './sourcemap.js';

const fiberKey = node => Object.keys(node).find(key => key.startsWith('__reactFiber$'));

// The nearest element React rendered. Markup injected into an element (an icon's SVG) belongs to the element holding it.
function hostOf(element) {
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    const key = fiberKey(node);
    if (key) return node[key];
  }
  return null;
}

// Shared UI is still yours, but a reading starts where the feature uses it.
const shared = file => /(?:^|\/)(?:components\/ui|packages\/[^/]+|design-?systems?|primitives|ui-kit)\//i.test(file);

let cachedVersion = sourceMapVersion();

export async function locate(element, options = {}) {
  const refuse = (reason, detail = {}) => options.explain ? { location: null, reason, detail } : null;
  if (!element || element.nodeType !== 1) return refuse('no-fiber', { step: 'invalid-element' });
  const fiber = hostOf(element);
  if (!fiber) return refuse('no-fiber');
  // After a hot update bippy's cached maps describe old modules; read them fresh once.
  const fresh = cachedVersion !== sourceMapVersion();
  cachedVersion = sourceMapVersion();
  let frames;
  try {
    // Symbolicated names are the source map's own `sources` entries, relative to the module they came from; the raw
    // frames carry those module URLs, one for one, so each name is resolved against its module.
    const [mapped, raw] = await Promise.all([getOwnerStack(fiber, !fresh), getRawOwnerStack(fiber)]);
    const located = mapped.filter(frame => frame.fileName);
    frames = located.map((frame, i) => {
      const base = raw[i]?.fileName;
      let fileName = frame.fileName;
      try { if (base && !/^[a-z]+:/i.test(fileName) && !fileName.startsWith('/')) fileName = new URL(fileName, base).href; } catch {}
      return { ...frame, fileName };
    });
  }
  catch (error) { return refuse('map', { step: 'owner-stack', error: String(error?.message ?? error) }); }
  const candidates = frames.filter(frame => frame.fileName && frame.lineNumber && isSourceFile(frame.fileName));
  if (!candidates.length) return refuse('runtime-only-frames', { frames: frames.slice(0, 6).map(frame => frame.fileName) });

  const chain = [];
  let unchecked;
  for (const frame of candidates) {
    const result = await request('resolve', { source: frame.fileName, line: frame.lineNumber, column: frame.columnNumber ?? 1 }, { explain: true })
      .catch(error => { if (error?.starting || error?.failed) throw error; return { refused: error?.detail ?? error?.message }; });
    if (result?.file) chain.push({ file: result.file, line: result.line, column: result.column, component: result.component ?? frame.functionName ?? null });
    else if (result?.untracked && !unchecked) unchecked = { source: frame.fileName, file: result.untracked };
  }
  if (!chain.length) {
    if (unchecked) return refuse('resolve-refusal', { ...unchecked, response: 'Source is not a tracked project source.' });
    return refuse('runtime-only-frames', { step: 'no-project-frame', frames: candidates.slice(0, 6).map(frame => frame.fileName) });
  }
  const index = Math.max(0, chain.findIndex(link => !shared(link.file)));
  const at = chain[index];
  return { file: at.file, line: at.line, column: at.column, component: at.component, tag: element.localName, via: 'owner-stack', chain, index };
}
