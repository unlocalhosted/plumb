// @tier cli
// The class a write changes is the one showing now, and nothing else (owner, 2026-11-13: "our apply should never cause
// loss of behaviour, it should be smart and should only change the behavior on which we are operating upon").
//
// Input → output, through the engine's own boundary for class edits: the classes as written, the change asked for, and
// what is in force (the breakpoints the window has reached, dark, a state Plumber holds) go in; the edit Plumber would
// write comes out. Every row is one accuracy check; a row that changes its answer is behaviour that broke. The live
// chain (a real window width, real Tailwind, the file written) was checked by hand on crafting-ui (docs/journey.md,
// 2026-11-13) and is not repeated here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boxEditOf } from '../overlay/src/inplace.js';
import { prefixesInForce, splitVariant, swapInForce } from '../overlay/src/variants.js';

const P = (prop, token) => ({ prop, to: { token } });
const on = (...names) => new Set(names);
const NARROW = on(), MEDIUM = on('sm', 'md'), LARGE = on('sm', 'md', 'lg'), WIDE = on('sm', 'md', 'lg', 'xl', '2xl');
const edit = (from, to) => ({ from, to });
const ofList = (s) => s.split(/\s+/).filter(Boolean);
// the classes after the edit, as a set: what the element is written with once Plumber has written
const after = (classes, e) => { if (!e) return classes; const out = new Set(classes); for (const c of ofList(e.from)) out.delete(c); for (const c of ofList(e.to)) out.add(c); return [...out].sort(); };

// ── padding and margin: one row per behaviour ───────────────────────────────────────────────────────────────────────
const BOX = [
  // breakpoints: the widest breakpoint in force that sets the side, else the base
  ['base only, narrow', 'p-4', [P('padding-left', '8')], NARROW, edit('p-4', 'pl-8 pr-4 py-4')],
  ['base only, wide: a base class is still the one showing', 'p-4', [P('padding-left', '8')], WIDE, edit('p-4', 'pl-8 pr-4 py-4')],
  ['md showing at a medium window: only md changes', 'p-4 md:p-6', [P('padding-left', '8')], MEDIUM, edit('md:p-6', 'md:pl-8 md:pr-6 md:py-6')],
  ['md not reached at a narrow window: only the base changes', 'p-4 md:p-6', [P('padding-left', '8')], NARROW, edit('p-4', 'pl-8 pr-4 py-4')],
  ['the widest one in force wins: lg over md at a large window', 'p-2 md:p-4 lg:p-6', [P('padding-top', '8')], LARGE, edit('lg:p-6', 'lg:px-6 lg:pt-8 lg:pb-6')],
  ['a wider breakpoint not reached is left alone', 'p-2 md:p-4 lg:p-6', [P('padding-top', '8')], MEDIUM, edit('md:p-4', 'md:px-4 md:pt-8 md:pb-4')],
  ['a breakpoint that does not set this side is passed over', 'p-4 md:pt-6', [P('padding-left', '8')], MEDIUM, edit('p-4', 'pl-8 pr-4 py-4')],
  ['the side the breakpoint sets is changed there', 'p-4 md:pt-6', [P('padding-top', '8')], MEDIUM, edit('md:pt-6', 'md:pt-8')],
  ['sides split across base and md are each changed where set', 'p-4 md:px-6', [P('padding-top', '2'), P('padding-left', '2')], MEDIUM, edit('p-4 md:px-6', 'px-4 pt-2 pb-4 md:pl-2 md:pr-6')],
  ['a pair set at md stays a pair', 'p-4 md:px-6', [P('padding-left', '2'), P('padding-right', '2')], MEDIUM, edit('md:px-6', 'md:px-2')],
  ['all four at md collapse to one md class', 'p-4 md:p-6', ['top', 'right', 'bottom', 'left'].map((s) => P(`padding-${s}`, '8')), MEDIUM, edit('md:p-6', 'md:p-8')],
  ['an arbitrary base value becomes a token', 'p-[18px]', ['top', 'right', 'bottom', 'left'].map((s) => P(`padding-${s}`, '4')), NARROW, edit('p-[18px]', 'p-4')],
  ['an arbitrary md value with a colon inside is one class', 'p-4 md:p-[calc(1rem+2px)]', [P('padding-top', '6')], MEDIUM, edit('md:p-[calc(1rem+2px)]', 'md:px-[calc(1rem+2px)] md:pt-6 md:pb-[calc(1rem+2px)]')],
  // dark: in force while the page is dark, and only then
  ['dark showing: only dark changes', 'px-4 dark:px-6', [P('padding-left', '5')], on('dark'), edit('dark:px-6', 'dark:pl-5 dark:pr-6')],
  ['light: dark is left alone', 'px-4 dark:px-6', [P('padding-left', '5')], NARROW, edit('px-4', 'pl-5 pr-4')],
  ['a breakpoint beats dark, as Tailwind orders them', 'p-4 dark:p-5 md:p-6', [P('padding-top', '2')], on('sm', 'md', 'dark'), edit('md:p-6', 'md:px-6 md:pt-2 md:pb-6')],
  ['md and dark together beat either alone', 'p-4 dark:p-5 md:p-6 md:dark:p-7', [P('padding-top', '2')], on('sm', 'md', 'dark'), edit('md:dark:p-7', 'md:dark:px-7 md:dark:pt-2 md:dark:pb-7')],
  ['md:dark is not in force when only md is', 'p-4 md:p-6 md:dark:p-7', [P('padding-top', '2')], MEDIUM, edit('md:p-6', 'md:px-6 md:pt-2 md:pb-6')],
  ['dark:md written the other way round is the same thing', 'p-4 dark:md:p-7', [P('padding-top', '2')], on('sm', 'md', 'dark'), edit('dark:md:p-7', 'dark:md:px-7 dark:md:pt-2 dark:md:pb-7')],
  // states: never touched unless Plumber holds the state
  ['hover not held: the base changes, hover:p-8 kept', 'p-4 hover:p-8', [P('padding-top', '2')], NARROW, edit('p-4', 'px-4 pt-2 pb-4')],
  ['hover held: hover changes', 'p-4 hover:p-8', [P('padding-top', '2')], on('hover'), edit('hover:p-8', 'hover:px-8 hover:pt-2 hover:pb-8')],
  ['focus, focus-visible, active, disabled: kept', 'p-4 focus:p-5 focus-visible:p-6 active:p-7 disabled:p-1', [P('padding-left', '2')], MEDIUM, edit('p-4', 'pl-2 pr-4 py-4')],
  ['group-hover and peer states: kept', 'p-4 group-hover:p-6 peer-checked:p-7', [P('padding-left', '2')], MEDIUM, edit('p-4', 'pl-2 pr-4 py-4')],
  ['data-, aria-, supports-, print, arbitrary variants: kept', 'p-4 data-[open]:p-6 aria-selected:p-7 supports-[display:grid]:p-8 print:p-0 [&>*]:p-1', [P('padding-left', '2')], WIDE, edit('p-4', 'pl-2 pr-4 py-4')],
  ['max-width breakpoints are not min-width ones: kept', 'p-4 max-md:p-2', [P('padding-left', '6')], NARROW, edit('p-4', 'pl-6 pr-4 py-4')],
  // margin: the same rule
  ['margin at md', 'mt-4 md:mt-8', [P('margin-top', '6')], MEDIUM, edit('md:mt-8', 'md:mt-6')],
  ['margin, base, md not reached', 'mt-4 md:mt-8', [P('margin-top', '6')], NARROW, edit('mt-4', 'mt-6')],
  ['margin x pair split by one side', 'mx-4 lg:mx-8', [P('margin-left', '2')], LARGE, edit('lg:mx-8', 'lg:ml-2 lg:mr-8')],
  ['padding and margin in one change, each where it shows', 'p-4 md:p-6 m-2', [P('padding-top', '8'), P('margin-top', '4')], MEDIUM, edit('md:p-6 m-2', 'md:px-6 md:pt-8 md:pb-6 mx-2 mt-4 mb-2')],
  // nothing written for this side yet: the base gets it
  ['nothing written: added bare', 'flex gap-2', [P('padding-left', '4')], MEDIUM, edit('', 'pl-4')],
  ['nothing written, dark showing: still added bare (it applies in both themes)', 'flex', [P('padding-left', '4')], on('dark'), edit('', 'pl-4')],
  // nothing to do
  ['the value it already has: no edit', 'p-4 md:p-6', ['top', 'right', 'bottom', 'left'].map((s) => P(`padding-${s}`, '6')), MEDIUM, null],
];

for (const [name, classes, props, active, want] of BOX) {
  test(`padding/margin · ${name}`, () => {
    const list = ofList(classes), got = boxEditOf(list, props, active);
    if (want === null) return assert.equal(got, null);
    // the same classes after the edit, whatever order they're spelled in
    assert.deepEqual(after(list, got), after(list, want), `got ${JSON.stringify(got)}`);
    // and nothing outside the change is touched: every class not in `from` survives
    for (const c of list) if (!ofList(got.from).includes(c)) assert.ok(after(list, got).includes(c), `${c} kept`);
  });
}

// ── one-class families: gap, corners, text size, width, height ──────────────────────────────────────────────────────
const isGap = (c) => /^gap(-[xy])?-/.test(c), isRadius = (c) => /^rounded(-[\w[\].]+)?$/.test(c) && !/^rounded-[trblse]{1,2}(-|$)/.test(c);
const isText = (c) => /^text-(xs|sm|base|lg|xl|\dxl|\[[\d.]+(px|rem)\])$/.test(c), isWidth = (c) => /^w-/.test(c);
const SWAP = [
  ['gap at lg, large window', 'flex gap-2 lg:gap-6', isGap, 'gap-4', LARGE, edit('lg:gap-6', 'lg:gap-4')],
  ['gap at lg, medium window: the base', 'flex gap-2 lg:gap-6', isGap, 'gap-4', MEDIUM, edit('gap-2', 'gap-4')],
  ['gap-x is a gap too', 'flex gap-x-2 md:gap-x-6', isGap, 'gap-x-4', MEDIUM, edit('md:gap-x-6', 'md:gap-x-4')],
  ['corners at md', 'rounded md:rounded-[10px]', isRadius, 'rounded-xl', MEDIUM, edit('md:rounded-[10px]', 'md:rounded-xl')],
  ['corners, dark showing', 'rounded-md dark:rounded-lg', isRadius, 'rounded-xl', on('dark'), edit('dark:rounded-lg', 'dark:rounded-xl')],
  ['one corner side is not the corners family', 'rounded-t-lg rounded-md', isRadius, 'rounded-xl', NARROW, edit('rounded-md', 'rounded-xl')],
  ['text size at sm', 'text-sm sm:text-base', isText, 'text-lg', on('sm'), edit('sm:text-base', 'sm:text-lg')],
  ['a text colour is not a text size', 'text-sm text-gray-500 md:text-base', isText, 'text-lg', NARROW, edit('text-sm', 'text-lg')],
  ['width at md', 'w-full md:w-64', isWidth, 'w-80', MEDIUM, edit('md:w-64', 'md:w-80')],
  ['hover width not held: base', 'w-40 hover:w-48', isWidth, 'w-44', WIDE, edit('w-40', 'w-44')],
  ['nothing written: added bare', 'flex', isGap, 'gap-3', MEDIUM, edit('', 'gap-3')],
  ['the value it already has: no edit', 'flex gap-2 md:gap-4', isGap, 'gap-4', MEDIUM, null],
  ['important and arbitrary kept as one class', 'gap-2 md:!gap-[13px]', (c) => /^!?gap-/.test(c), 'gap-3', MEDIUM, edit('md:!gap-[13px]', 'md:gap-3')],
];
for (const [name, classes, family, to, active, want] of SWAP) {
  test(`one class · ${name}`, () => {
    const got = swapInForce(ofList(classes), family, to, active);
    assert.deepEqual(got, want);
  });
}

// ── what is in force, and in what order ─────────────────────────────────────────────────────────────────────────────
test('prefixes in force: written, in force, least particular first', () => {
  const classes = ofList('p-2 sm:p-3 lg:p-6 dark:p-4 md:dark:p-5 hover:p-9 max-md:p-1 print:p-0');
  assert.deepEqual(prefixesInForce(classes, NARROW), ['']);
  assert.deepEqual(prefixesInForce(classes, on('sm', 'md')), ['', 'sm:']);
  assert.deepEqual(prefixesInForce(classes, on('sm', 'md', 'dark')), ['', 'dark:', 'sm:', 'md:dark:']);
  assert.deepEqual(prefixesInForce(classes, on('sm', 'md', 'lg', 'dark', 'hover')), ['', 'hover:', 'dark:', 'sm:', 'lg:', 'md:dark:']);
});
test('a class splits at its last colon outside [ ]', () => {
  assert.deepEqual(splitVariant('md:hover:p-6'), { prefix: 'md:hover:', base: 'p-6', parts: ['md', 'hover'] });
  assert.deepEqual(splitVariant('p-[calc(1rem+2px)]'), { prefix: '', base: 'p-[calc(1rem+2px)]', parts: [] });
  assert.deepEqual(splitVariant('[&:hover]:p-2'), { prefix: '[&:hover]:', base: 'p-2', parts: ['[&:hover]'] });
  assert.deepEqual(splitVariant('supports-[display:grid]:grid'), { prefix: 'supports-[display:grid]:', base: 'grid', parts: ['supports-[display:grid]'] });
  assert.deepEqual(splitVariant('!p-4'), { prefix: '', base: '!p-4', parts: [] });
});
