// #59 safe triangle for submenus. Plate, a design tool: the Layers panel of a travel site's hero, Story card selected,
// its ⋯ menu open beside it with Arrange's submenu out to the right. Two sides, two components (the fix is a change of
// component, not a class):
//   broken  a menu written by hand: a submenu closes the moment the pointer enters any other item. Every submenu on it
//           (Arrange, Copy as, Move to page) has the item under it on the straight way there, so every one is lost
//   fixed   Radix's DropdownMenu: a safe triangle from where the pointer left the item holds the submenu open
// Both are probed by plumber for real (src/craft-probe.ts, the submenu gesture), and the stage plays back what it did.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowRightIcon, CodeIcon, CopyIcon, EyeIcon, FileIcon, LayersIcon, LockIcon, PlusIcon, SearchIcon, TrashIcon } from '@unlocalhosted/dither-icons';
import cabin from '../../media/s59-cabin.jpg';
import ines from '../../media/people/person-01.jpg';
import arlo from '../../media/people/person-06.jpg';

export const n = 59;

// a component's own colour in a design tool (approved in the comp)
const COMPONENT = 'text-[#8a4fd8]';

// the layer tree: depth, kind, name, and what sits at the row's end
const LAYERS = [
  { d: 0, kind: 'frame', name: 'Hero, desktop', open: true, num: '1440' },
  { d: 1, kind: 'stack', name: 'Nav' },
  { d: 1, kind: 'rect', name: 'Story card', open: true, selected: true },
  { d: 2, kind: 'image', name: 'Cabin in the pines', inside: 'first' },
  { d: 2, kind: 'text', name: 'Kicker', inside: true },
  { d: 2, kind: 'text', name: 'Headline', inside: true },
  { d: 2, kind: 'text', name: 'Body', inside: true },
  { d: 2, kind: 'component', name: 'Book a stay', inside: 'last' },
  { d: 1, kind: 'stack', name: 'Price strip', closed: true, who: <Presence src={ines} ring="#e0802a" /> },
  { d: 1, kind: 'component', name: 'Footer' },
  { d: 1, kind: 'rect', name: 'Background', hidden: true },
  { d: 0, kind: 'frame', name: 'Hero, tablet', closed: true, num: '834' },
  { d: 0, kind: 'frame', name: 'Hero, mobile', closed: true, num: '390', who: <Presence src={arlo} ring="#1f9d6b" /> },
];
function Presence({ src, ring }) {
  return <img src={src} alt="" className="size-[18px] rounded-full object-cover" style={{ boxShadow: `0 0 0 1.5px var(--color-surface), 0 0 0 3px ${ring}` }} />;
}
// a layer's kind, as design tools draw it
function Kind({ kind }) {
  if (kind === 'image') return <img src={cabin} alt="" className="size-4 rounded-[3px] object-cover outline-1 -outline-offset-1 outline-black/10" />;
  const glyph = { frame: '#', text: 'T', component: '◇', stack: '≡', rect: '▢' }[kind];
  return <span aria-hidden="true" className="grid size-4 place-items-center text-[13px] leading-none">{glyph}</span>;
}

// the menu, the same on both sides. A row with `sub` opens a submenu; each submenu has a plain item right under it
const ARRANGE = [['Bring to front', '⌥⌘]'], ['Bring forward', '⌘]'], ['Send backward', '⌘['], ['Send to back', '⌥⌘[']];
const COPY_AS = [['PNG', '⇧⌘C'], ['SVG', null], ['CSS', null], ['Link to selection', '⌥⌘L']];
const PAGES = [['Hero', 'this page'], ['Pricing', null], ['Journal', null]];
const ROWS = [
  { label: 'Copy', key: '⌘C', icon: CopyIcon },
  { label: 'Duplicate', key: '⌘D', icon: PlusIcon },
  null,
  { label: 'Arrange', sub: 'arrange', items: ARRANGE, icon: LayersIcon },
  { label: 'Hide', key: '⇧⌘H', icon: EyeIcon },
  { label: 'Lock', key: '⇧⌘L', icon: LockIcon },
  null,
  { label: 'Copy as', sub: 'copy', items: COPY_AS, icon: CodeIcon },
  { label: 'Rename', key: '⌘R', icon: FileIcon },
  null,
  { label: 'Move to page', sub: 'move', items: PAGES, icon: ArrowRightIcon },
  { label: 'Delete', key: '⌫', icon: TrashIcon, danger: true },
];
const menuBox = 'z-10 flex w-52 flex-col rounded-card bg-surface p-1 text-[13px] font-normal text-ink shadow-popover ring-1 ring-ink/[0.07] outline-none';
const itemBox = 'flex h-[30px] cursor-default items-center gap-2 rounded-control px-2.5 whitespace-nowrap outline-none select-none';
const Label = () => <span className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-ink-subtle">Story card</span>;
const Sep = () => <span aria-hidden="true" className="mx-1.5 my-1 h-hairline bg-line" />;
const Icon = ({ icon: I }) => <span className={'grid size-4 place-items-center ' + (I ? '' : 'invisible')}>{I ? <I size={14} texture="solid" /> : null}</span>;
const Key = ({ k }) => (k ? <kbd className="ml-auto font-sans text-xs tracking-[0.02em] text-ink-subtle">{k}</kbd> : null);
const Chevron = () => <span aria-hidden="true" className="ml-auto text-[13px] leading-none text-ink-muted">›</span>;
const SubItem = ({ label, k }) => <>{label}{k && !k.includes('⌘') ? <span className="ml-auto text-xs text-ink-subtle">{k}</span> : <Key k={k} />}</>;

const MoreButton = (props) => (
  <button type="button" aria-label="Layer actions" {...props}
    className="grid size-6 place-items-center rounded-chip text-accent-deep hover:bg-accent/10 active:bg-accent/20 data-[state=open]:bg-accent/15">
    <span aria-hidden="true" className="text-[15px] leading-none">⋯</span>
  </button>
);

// the broken side: a menu written by hand, the way they usually are
function HandRolledMenu() {
  const [open, setOpen] = useState(true), [sub, setSub] = useState('arrange'), [hot, setHot] = useState(3), [top, setTop] = useState(null);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { setSub(null); setOpen(false); } };
    // heard in the capture phase: the plumber overlay on this page stops Escape on its way down
    addEventListener('keydown', esc, true);
    return () => removeEventListener('keydown', esc, true);
  }, []);
  const box = useRef(null);
  // the open submenu sits level with its item, at rest too
  useLayoutEffect(() => { const el = box.current?.querySelector('[aria-haspopup][aria-expanded="true"]'); if (el) setTop(el.offsetTop - 4); }, [open]);
  const shut = () => { setOpen((o) => !o); setSub(null); setHot(-1); };
  const opened = ROWS.find((r) => r?.sub === sub);
  return (
    <span className="relative">
      {/* it opens on the press, as a menu should (#61): this side is wrong in one way, its submenus */}
      <MoreButton aria-haspopup="menu" aria-expanded={open} data-state={open ? 'open' : 'closed'}
        onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); shut(); } }}
        onClick={(e) => { if (e.detail === 0) shut(); }} />
      {open ? (
        <div ref={box} role="menu" aria-label="Story card" className={`${menuBox} absolute -top-[34px] left-[calc(100%+0.75rem)]`}>
          <Label />
          {ROWS.map((r, i) => r === null ? <Sep key={i} /> : (
            // the habit: entering any item closes whatever submenu was open, the one you're heading for included
            <div key={r.label} role="menuitem" tabIndex={-1} aria-haspopup={r.sub ? 'menu' : undefined} aria-expanded={r.sub ? sub === r.sub : undefined}
              onPointerEnter={(e) => { setHot(i); setSub(r.sub ?? null); if (r.sub) setTop(e.currentTarget.offsetTop - 4); }}
              className={`${itemBox} ${hot === i ? 'bg-sunken' : ''} ${r.danger ? 'text-negative' : ''}`}>
              {r.sub ? <><Icon icon={r.icon} />{r.label}<Chevron /></> : <><Icon icon={r.icon} />{r.label}<Key k={r.key} /></>}
            </div>
          ))}
          {opened ? (
            <div role="menu" aria-label={opened.label} className={`${menuBox} absolute left-[calc(100%-4px)]`} style={{ top: top ?? 112 }}>
              {opened.items.map(([label, k]) => <div key={label} role="menuitem" tabIndex={-1} className={`${itemBox} hover:bg-sunken`}><SubItem label={label} k={k} /></div>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

// the fixed side: Radix's DropdownMenu, the same look; each submenu keeps a safe triangle from where you left its item
function RadixMenu() {
  // open at rest like the other side: the menu, and Arrange's submenu
  const [sub, setSub] = useState(null);
  // Radix closes a submenu when its menu takes focus on opening; open Arrange's once that has happened
  useEffect(() => { const id = setTimeout(() => setSub('arrange'), 60); return () => clearTimeout(id); }, []);
  const item = `${itemBox} data-[highlighted]:bg-sunken`;
  return (
    <Menu.Root defaultOpen modal={false}>
      <Menu.Trigger asChild><MoreButton /></Menu.Trigger>
      <Menu.Content side="right" align="start" sideOffset={12} alignOffset={-34} className={menuBox} aria-label="Story card">
        <Label />
        {ROWS.map((r, i) => r === null ? <Sep key={i} /> : r.sub ? (
          <Menu.Sub key={r.label} open={sub === r.sub} onOpenChange={(o) => setSub((s) => (o ? r.sub : s === r.sub ? null : s))}>
            <Menu.SubTrigger className={`${item} data-[state=open]:bg-sunken`}><Icon icon={r.icon} />{r.label}<Chevron /></Menu.SubTrigger>
            <Menu.SubContent sideOffset={0} alignOffset={-4} className={menuBox} aria-label={r.label}>
              {r.items.map(([label, k]) => <Menu.Item key={label} className={item}><SubItem label={label} k={k} /></Menu.Item>)}
            </Menu.SubContent>
          </Menu.Sub>
        ) : (
          <Menu.Item key={r.label} className={`${item} ${r.danger ? 'text-negative' : ''}`}><Icon icon={r.icon} />{r.label}<Key k={r.key} /></Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}

function Row({ l, menu }) {
  const tone = l.selected ? 'bg-accent-soft font-medium text-accent-deep' : l.inside ? 'bg-accent/[0.05]' : '';
  const shape = l.selected ? 'rounded-t-control' : l.inside === 'last' ? 'rounded-b-control' : l.inside ? '' : 'rounded-control';
  const ink = l.hidden ? 'text-ink-subtle' : l.kind === 'component' ? COMPONENT : '';
  return (
    <li className={`flex h-7 items-center gap-1.5 pr-1 ${tone} ${shape} ${ink}`} style={{ paddingLeft: 4 + l.d * 18 }}>
      <span aria-hidden="true" className={'grid size-3 shrink-0 place-items-center text-[8px] ' + (l.selected ? '' : 'text-ink-subtle')}>{l.open ? '▼' : l.closed ? '▶' : ''}</span>
      <span className={'shrink-0 ' + (l.selected || l.kind === 'component' ? '' : l.hidden ? '' : 'text-ink-subtle')}><Kind kind={l.kind} /></span>
      {/* the name and what's said at the row's end share a baseline */}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className={'truncate ' + (l.d === 0 ? 'font-medium' : '')}>{l.name}</span>
        {l.hidden ? <span className="ml-auto text-[11px] text-ink-subtle">hidden</span> : null}
        {l.num ? <span className="ml-auto text-[11px] text-ink-subtle tabular-nums">{l.num}</span> : null}
      </span>
      {l.who || l.selected ? <span className="flex items-center">{l.who}{l.selected ? menu : null}</span> : null}
    </li>
  );
}

export default function PlateLayers({ side = 'broken' }) {
  const tab = 'grid h-[30px] place-items-center rounded-control px-2 text-[13px] font-medium active:bg-line';
  return (
    // the stage: the panel, and room to its right for the menu and its submenus
    <div className="relative h-[33.5rem] w-[43rem] max-w-full">
      <aside aria-label="Layers" className="absolute top-0 left-0 w-[17rem] rounded-sheet bg-surface text-[13px] shadow-window">
        <div className="flex items-center gap-0.5 pt-2.5 pr-2.5 pl-1.5">
          <button type="button" aria-pressed="true" className={tab + ' bg-sunken text-ink'}>Layers</button>
          <button type="button" aria-pressed="false" className={tab + ' text-ink-muted hover:text-ink'}>Assets</button>
          <button type="button" aria-label="Find a layer" className="ml-auto grid size-7 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line"><SearchIcon size={14} texture="dither" /></button>
        </div>
        <div className="mx-2.5 mt-2 mb-1.5 flex h-8 items-center gap-2 rounded-control px-2 ring-1 ring-line ring-inset">
          <img src={cabin} alt="" className="h-4 w-[22px] rounded-[3px] object-cover outline-1 -outline-offset-1 outline-black/10" />
          <span className="font-medium">Hero</span>
          <span className="ml-auto text-xs text-ink-subtle">Page 1 of 3</span>
        </div>
        <span className="block px-3.5 pt-2 pb-1 text-[11px] font-medium text-ink-subtle">Spring launch</span>
        <ul className="px-1.5 pb-2.5">
          {LAYERS.map((l) => <Row key={l.name} l={l} menu={side === 'fixed' ? <RadixMenu /> : <HandRolledMenu />} />)}
        </ul>
        <footer className="flex h-10 items-center gap-2 rounded-b-sheet border-t-hairline border-line bg-sunken px-3.5 text-xs text-ink-muted">
          <span className="font-medium text-ink">Story card</span>
          <span className="tabular-nums">250 × 365</span>
          <span className="ml-auto size-3 rounded-[3px] bg-[#10241f] ring-1 ring-white/10 ring-inset" />
          <span className="tabular-nums">10241F</span>
        </footer>
      </aside>
    </div>
  );
}
PlateLayers.probe = 'submenu';
PlateLayers.names = ['Hand-rolled menu', 'Radix menu'];
PlateLayers.lesson = {
  why: 'A submenu that closes the moment the pointer touches another item can’t be reached on a diagonal: the straight way there cuts across the item below. On this menu that’s every submenu: Arrange loses you at Hide, Copy as at Rename, Move to page at Delete. You have to steer right, then down, every time.',
  habit: 'Use a menu with a safe triangle (Radix, Base UI, React Aria): from where the pointer left the item to the submenu’s near edge, it holds the submenu open while you head for it.',
};
