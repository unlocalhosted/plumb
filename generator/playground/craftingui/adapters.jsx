// One adapter per library part the generator may place in crafting-ui's wall: the slot it fills, what it does, and how
// the wall's content (lessons live, the total; the track's pages) becomes its props. The stickers have no adapter: they
// are the product's own drawings, and no library part says what a gesture looks like.
import { Pagination as ArcPagination } from '../vendor/arc/pagination/pagination.tsx';
import { Pagination as BePagination } from '../vendor/beui/components/pagination.tsx';
import { AnimatedCounter } from '../vendor/arc/animated-counter/animated-counter.tsx';
import { Link } from '@/lib/router';
const lettering = 'measure text-[11px] tracking-[0.1em] uppercase';

export const ADAPTERS = {
  'arc/pagination': { slot: 'navigation', does: 'the arrows become a page control that says which page of the row you are on, and the count stays beside it', why: 'Arrows only say there is more to the side. Saying which page you are on tells you how much of the wall you have already seen.',
    render: (c, t) => <div className="flex items-center gap-5"><Link to="/interfaces#register" className={`${lettering} text-draw`}>{c.live} live of {c.total} →</Link><ArcPagination page={t.page + 1} pageCount={t.pages} onPageChange={(p) => t.go(p - 1)} label="Live lessons" /></div> },
  'beui/pagination': { slot: 'navigation', does: 'the arrows become numbered pages with a pill that glides to the page in view', why: 'Numbered pages show how big the collection is at a glance, which is what the count of live lessons is there to say.',
    render: (c, t) => <div className="flex items-center gap-5"><Link to="/interfaces#register" className={`${lettering} text-draw`}>{c.live} live of {c.total} →</Link><BePagination totalPages={t.pages} page={t.page + 1} onPageChange={(p) => t.go(p - 1)} siblings={1} /></div> },
  'arc/animated-counter': { slot: 'navigation', does: 'the count of live lessons rolls up as the row comes into view', why: 'The count is a promise that the wall keeps growing. A number that rolls up reads as one that is still moving.',
    render: (c, t) => <div className="flex items-center gap-5"><Link to="/interfaces#register" className={`${lettering} text-draw`}><AnimatedCounter value={c.live} animateOnView /> live of {c.total} →</Link></div> },
};
