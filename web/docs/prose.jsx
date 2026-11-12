// The parts a docs page is written with, in the visual language: headings you can link to, code you can read, an aside
// that is a solid thing, a family named by its toy.
import { Children, isValidElement } from 'react';
import { Toy } from '../site/Toy.jsx';

const textOf = (children) => Children.toArray(children).map((c) => (typeof c === 'string' ? c : isValidElement(c) ? textOf(c.props.children) : '')).join('');
const slugOf = (children) => textOf(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function Heading({ as: Tag, children }) {
  const id = slugOf(children);
  return <Tag id={id}><a href={`#${id}`}>{children}</a></Tag>;
}
// inline code is a small chip; a block keeps its own ground (the block's <code> is drawn by Pre)
export const Code = ({ className, children, ...rest }) => <code className={className} {...rest}>{children}</code>;
export function Pre({ children }) {
  const lang = isValidElement(children) ? (children.props.className ?? '').replace('language-', '') : '';
  return <figure className="code" data-lang={lang || undefined}>{lang && <figcaption>{lang}</figcaption>}<pre>{children}</pre></figure>;
}
// An aside. A note is sky (something to know); careful is butter (this writes to your repo); why is lilac (the
// reasoning). Solid on the left where its toy sits, pale where its words are.
const KIND = { note: ['sky', 'tooltip', 'Good to know'], careful: ['butter', 'alert', 'Careful'], why: ['lilac', 'search', 'Why'] };
export function Callout({ kind = 'note', title, children }) {
  const [hue, toy, word] = KIND[kind] ?? KIND.note;
  return (
    <aside className="callout" data-hue={hue}>
      <span className="mark"><Toy name={toy} size={30} /></span>
      <div><b>{title ?? word}</b>{children}</div>
    </aside>
  );
}
// One of the seven families Plumber judges, named with its toy
const FAMILY = { spacing: 'gap', colour: 'fill', radius: 'corner', type: 'type', motion: 'motion', elevation: 'shadow', z: 'layer' };
export const Family = ({ id, children }) => <span className="family"><Toy name={FAMILY[id] ?? 'icon'} size={20} />{children ?? id}</span>;
