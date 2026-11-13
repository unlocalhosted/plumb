/* ─────────────────────────────────────────────────────────
 * PACK · COMPONENTS · React Plumber overlay
 *
 * What the components pack is (docs/briefs/rule-packs.md): its name, its ground, its rules' words and grounding. Plain
 * data, as pack-a11y.js is; the rules are in components-rules.js.
 *
 * Where the rules come from: Chrome's Modern Web Guidance (npm modern-web-guidance, read at 1.0.0 on 2026-11-14,
 * Apache-2.0), its 22 `ui-components` guides (dialog, tabs, menu, navbar, breadcrumbs, toolbar, progress, spinner,
 * carousel, card, app-menus and the rest). Those guides mostly say how to build a part with the newest platform
 * features; a rule here is the part of that advice a drawn page shows to be broken. Nothing of the guides' text is
 * copied: `npx modern-web-guidance retrieve <guide>` has it.
 * ───────────────────────────────────────────────────────── */

const WCAG = (sc, name) => ({ id: `wcag-${sc}`, name: `WCAG ${sc} ${name}` });
const GUIDE = (id) => ({ id: `mwg-${id}`, name: `Modern Web Guidance: ${id}`, guide: id });
const NAME = WCAG('4.1.2', 'Name, Role, Value'), INFO = WCAG('1.3.1', 'Info and Relationships');
const ADVISORY = { tier: 'advisory' };

// rule short name → [the guide it comes from, its spec entry, its words, further grounding]
const TABLE = {
  'breadcrumb-list': ['breadcrumbs', {}, () => ({ label: 'Breadcrumbs not in an ordered list', line: 'This trail is not an <ol>.', reason: 'The order is the meaning: a screen reader says "list, 4 items" and people know how deep they are.' }), [INFO]],
  'breadcrumb-current': ['breadcrumbs', {}, () => ({ label: 'Trail does not mark this page', line: 'No step of this trail is marked as the current page.', reason: 'A screen reader reads every step the same, so nobody hears where they are.' }), [INFO]],
  'breadcrumb-separator': ['breadcrumbs', {}, ({ mark }) => ({ label: 'Dividers read out loud', line: `The "${mark}" between steps is text in the page.`, reason: 'A screen reader reads it between every step ("Home, slash, Docs, slash").' }), []],
  'link-nested-control': ['card', {}, ({ outer, inner }) => ({ label: `A ${inner} inside a ${outer}`, line: `This ${outer} holds another ${inner}.`, reason: 'One press cannot mean two things: browsers and screen readers each pick a different one.' }), [NAME]],
  'carousel-name': ['carousel', {}, ({ slide }) => ({ label: slide ? 'Slide with no label' : 'Carousel with no name', line: slide ? 'This slide has no label.' : 'This carousel has no name.', reason: slide ? 'People hear "slide" and not which one of how many.' : 'A screen reader says "carousel" and not what it shows.' }), [NAME]],
  'dialog-name': ['dialog', {}, () => ({ label: 'Dialog with no name', line: 'This dialog has no name.', reason: 'A screen reader says "dialog" when it opens and nothing about what it asks.' }), [NAME]],
  'dialog-native': ['dialog', ADVISORY, ({ tag }) => ({ label: `A ${tag} playing dialog`, line: `This <${tag}> is given role="dialog".`, reason: '<dialog> keeps focus inside, closes on Esc and returns focus by itself. A role has to rebuild all three.' }), []],
  'dialog-aria-extras': ['dialog', ADVISORY, () => ({ label: 'aria-modal on a real modal', line: 'This <dialog> is modal already and also says aria-modal.', reason: 'It adds nothing, and it stays true if the dialog is ever shown without being modal.' }), []],
  'dialog-fake-modal': ['dialog', {}, () => ({ label: 'Says modal, is not', line: 'This dialog says it is modal and the page behind can still be used.', reason: 'It was opened with show() or the open attribute. Tab walks out of it into the page behind.' }), [WCAG('2.4.3', 'Focus Order')]],
  'dialog-close': ['dialog', {}, () => ({ label: 'Dialog with no way out', line: 'This dialog has no button.', reason: 'Someone on a touch screen or a screen reader has nothing to press to leave.' }), [WCAG('2.1.2', 'No Keyboard Trap')]],
  'dialog-scroll-lock': ['prevent-page-scroll-under-modal-dialog', ADVISORY, ({ on }) => ({ label: 'Page locked with overflow: hidden', line: `While this is open, <${on}> is set to not scroll.`, reason: 'The scrollbar goes and the page jumps sideways; on iOS the page can still scroll. overscroll-behavior on the dialog does it without either.' }), []],
  'dialog-display': ['dialog', {}, () => ({ label: 'Closed dialog still showing', line: 'This dialog is closed and still drawn.', reason: 'A display set on dialog overrides its closed state. Scope it to dialog[open].' }), []],
  'menu-structure': ['menu', {}, ({ loose }) => ({ label: loose ? 'Menu item outside a menu' : 'Menu whose items are not menu items', line: loose ? 'This is a menu item with no menu around it.' : 'This menu holds controls that are not menu items.', reason: 'A screen reader counts and moves by menu items; these are left out or announced alone.' }), [INFO]],
  'nav-as-menu': ['navbar', {}, ({ role }) => ({ label: 'Site navigation as a menu', line: `These links are in a role="${role}".`, reason: 'A menu takes them out of the Tab order and promises arrow keys. Site navigation is a list of links.' }), []],
  'popup-expanded': ['menu', {}, () => ({ label: 'Opens something, does not say if open', line: 'This opens a popup and has no aria-expanded.', reason: 'A screen reader cannot tell whether pressing it opened anything.' }), [NAME]],
  'checked-missing': ['menu', {}, ({ role }) => ({ label: 'No on or off said', line: `This ${role} has no aria-checked.`, reason: 'A screen reader announces it and never whether it is on.' }), [NAME]],
  'nav-current': ['navbar', {}, ({ name }) => ({ label: 'Navigation does not mark this page', line: `"${name}" leads to this page and is not marked current.`, reason: 'A screen reader reads every link the same. aria-current="page" says where you are, and is the hook to style it.' }), [INFO]],
  'nav-details': ['navbar', ADVISORY, () => ({ label: 'Submenu built on details', line: 'This navigation submenu is a <details>.', reason: 'Screen readers do not agree on what a summary is. A button with aria-expanded is read the same everywhere.' }), []],
  'current-many': ['navbar', {}, ({ count }) => ({ label: 'Several current pages', line: `${count} links here are marked as the current page.`, reason: 'Only one can be where you are.' }), [INFO]],
  'tablist-name': ['tabs', {}, () => ({ label: 'Tabs with no name', line: 'This set of tabs has no name.', reason: 'A screen reader says "tab list" and not what the tabs switch.' }), [NAME]],
  'tab-selected': ['tabs', {}, ({ count }) => ({ label: count ? 'Several tabs selected' : 'No tab says it is selected', line: count ? `${count} tabs say they are selected.` : 'None of these tabs has aria-selected="true".', reason: 'A screen reader cannot say which panel is showing.' }), [NAME]],
  'tabpanel-name': ['tabs', {}, () => ({ label: 'Panel with no name', line: 'This tab panel has no name.', reason: 'Point aria-labelledby at its tab, so the panel is announced by the tab’s words.' }), [NAME]],
  'tabs-as-nav': ['tabs', {}, () => ({ label: 'Tabs that are page links', line: 'This tab is a link to another page.', reason: 'A tab promises a panel on this page and arrow keys. Links that look like tabs are navigation.' }), []],
  'tab-shift': ['tabs', {}, ({ prop }) => ({ label: 'Selected tab changes size', line: `The selected tab has a different ${prop} from the others.`, reason: 'Every tab after it moves when the selection changes.' }), []],
  'tabs-wrap': ['tabs', {}, ({ rows }) => ({ label: 'Tabs on several rows', line: `These tabs wrap onto ${rows} rows.`, reason: 'The order and the selected tab are hard to follow. Scroll the row or move the extra into a menu.' }), []],
  'tab-structure': ['tabs', {}, () => ({ label: 'Tab outside a tab list', line: 'This tab is not inside a role="tablist".', reason: 'A screen reader does not count it or tie it to its neighbours.' }), [INFO]],
  'tabpanel-many': ['tabs', {}, ({ count }) => ({ label: 'Several panels showing', line: `${count} tab panels are showing at once.`, reason: 'Only the selected tab’s panel should be there; the rest need hidden.' }), []],
  'tab-stops': ['tabs', {}, ({ count }) => ({ label: 'Every tab is a Tab stop', line: `${count} tabs here take Tab.`, reason: 'Tabs are one stop: Tab lands on the selected one and arrows move between them.' }), [WCAG('2.4.3', 'Focus Order')]],
  'toolbar-name': ['toolbar', {}, () => ({ label: 'Toolbar with no name', line: 'This toolbar has no name.', reason: 'A screen reader says "toolbar" and not what it is for.' }), [NAME]],
  'menubar-name': ['app-menus', {}, () => ({ label: 'Menu bar with no name', line: 'This menu bar has no name.', reason: 'A screen reader says "menu bar" and not whose.' }), [NAME]],
  'pressed-on-action': ['toolbar', {}, ({ name }) => ({ label: 'On/off state on an action', line: `"${name}" runs once and has aria-pressed.`, reason: 'aria-pressed is for buttons that stay on. This is announced as a toggle.' }), [NAME]],
  'progress-name': ['progress', {}, ({ what }) => ({ label: 'Progress of nothing', line: `This ${what} has no label.`, reason: 'A screen reader says "40 percent" and not of what.' }), [NAME]],
  'progress-tabindex': ['progress', {}, () => ({ label: 'Progress bar takes focus', line: 'This progress bar is in the Tab order.', reason: 'It cannot be used, so Tab stops on something that does nothing.' }), []],
  'progress-native': ['progress', ADVISORY, ({ tag }) => ({ label: `A ${tag} playing progress bar`, line: `This <${tag}> is given role="progressbar".`, reason: '<progress> says its value by itself; a role needs aria-valuenow kept right by hand.' }), []],
  'spinner-silent': ['spinner', {}, () => ({ label: 'Spinner that says nothing', line: 'This spinner has no words and is not hidden.', reason: 'Someone who cannot see it does not know anything is loading.' }), [WCAG('4.1.3', 'Status Messages')]],
  'expanded-on-generic': ['navbar', {}, ({ tag }) => ({ label: 'Open/closed on a plain box', line: `This <${tag}> has aria-expanded and is not a button.`, reason: 'A plain box has no state to announce and cannot be pressed from the keyboard.' }), [NAME]],
  'expanded-out-of-sync': ['menu', {}, ({ says }) => ({ label: 'Says ' + (says === 'true' ? 'open' : 'closed') + ', is not', line: says === 'true' ? 'This says what it controls is open, and it is not showing.' : 'This says what it controls is closed, and it is showing.', reason: 'A screen reader announces the wrong state.' }), [NAME]],
};

export const COMPONENTS = {
  id: 'components',
  title: 'Components',
  ground: 'Chrome Modern Web Guidance 1.0.0, ui-components guides',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'ui-components' },
  runs: 'page',
  guides: Object.fromEntries(Object.entries(TABLE).map(([short, [guide]]) => [short, guide])),
  spec: { access: Object.fromEntries(Object.entries(TABLE).map(([short, [, entry]]) => [short, entry])) },
  words: Object.fromEntries(Object.entries(TABLE).map(([short, [, , words]]) => [short, words])),
  laws: Object.fromEntries(Object.entries(TABLE).map(([short, [guide, , , more]]) => [short, [GUIDE(guide), ...more]])),
};
