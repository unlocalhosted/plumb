// The picture a link to the site shows when it is shared (1200 × 630). It is drawn here, with the site's own pieces,
// and photographed by scripts/share.mjs into public/share.png; the export leaves this page out.
import { markR } from '../../../overlay/src/mark.js';
import { Toy } from '../../site/Toy.jsx';

export const metadata = { robots: { index: false } };

const MARK = markR({ h: 56, id: 'share', leg: 'var(--rp-leg)' });
// the footer's ten, standing on the ground with a little lean, as the pile leaves them
const TOYS = [['padding', -6], ['margin', 4], ['gap', -2], ['corner', 7], ['type', -4], ['fill', 3], ['shadow', -7], ['motion', 2], ['grid', -3], ['cursor', 6]];

const CSS = `
.share { position: fixed; z-index: 100; inset: 0 auto auto 0; width: 1200px; height: 630px; overflow: hidden; background: var(--pl-bg-surface); color: var(--pl-text-primary); }
.share-head { position: absolute; left: 80px; top: 64px; }
.share-name { display: flex; align-items: center; gap: 14px; font: var(--pl-round-w2, 700) 30px/1 var(--pl-round); }
.share-line { margin: 40px 0 0; font: var(--pl-round-w2, 700) 82px/.98 var(--pl-round); letter-spacing: -.02em; }
.share-line span { color: var(--pl-ink-2); }
.share-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 132px; border-radius: 44px 44px 0 0; background: var(--pl-lilac-face); }
.share-url { position: absolute; right: 80px; bottom: 50px; font: var(--pl-round-w2, 700) 26px/1 var(--pl-round); color: var(--pl-lilac-ink); }
.share-toys { position: absolute; left: 80px; bottom: 100px; display: flex; gap: 14px; align-items: flex-end; }
.share-toy { display: block; width: 84px; height: 84px; }
.share-toy .piece-body { border-radius: 26px; }
.share-toy .piece-top { border-radius: 26px; }
`;

export default function Share() {
  return (
    <div className="share">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="share-head">
        <div className="share-name"><i className="toy mark" style={{ width: 47, height: 56 }} dangerouslySetInnerHTML={{ __html: MARK }} />React Plumber</div>
        <p className="share-line">a design engineer<br /><span>on every screen.</span></p>
      </div>
      <div className="share-ground" />
      <div className="share-toys">
        {TOYS.map(([name, lean]) => (
          <span key={name} className="share-toy" style={{ rotate: `${lean}deg` }}>
            <span className="piece-body"><span className="piece-top"><Toy name={name} size={46} /></span></span>
          </span>
        ))}
      </div>
      <span className="share-url">react-plumber.com</span>
    </div>
  );
}
