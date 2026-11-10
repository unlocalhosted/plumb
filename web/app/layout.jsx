import './globals.css';
import { Bricolage_Grotesque, Fredoka, Instrument_Sans, Nunito } from 'next/font/google';
import { Bar } from '../site/Bar.jsx';
import { rootTokens } from '../site/tokens.js';
import { SOFT_CSS } from '../../overlay/src/soft.js';
import { TOY_DEFS } from '../../overlay/src/toys.js';

// The site's two faces. The overlay itself never fetches a font (it runs inside other people's apps), so its tokens name
// the system's rounded face; the site can ship its own, and puts them first in the same two tokens (globals.css).
const round = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-round', display: 'swap' });
// two faces on trial for the identity page (design/identity), not used anywhere else yet
const trialA = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-trial-a', display: 'swap' });
const trialB = Instrument_Sans({ subsets: ['latin'], variable: '--font-trial-b', display: 'swap' });
const body = Nunito({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-body', display: 'swap' });

export const metadata = { title: { default: 'React Plumber', template: '%s · React Plumber' }, description: 'Keep your app on your design system.' };

export default async function Layout({ children }) {
  // the site is drawn with the product's own tokens: the overlay's token file, put on this page's root
  const tokens = await rootTokens();
  return (
    <html lang="en" data-scheme="light" className={`${round.variable} ${body.variable} ${trialA.variable} ${trialB.variable}`} suppressHydrationWarning>
      <head><style dangerouslySetInnerHTML={{ __html: tokens + SOFT_CSS }} /></head>
      <body>
        {/* the patterns two toys use (padding's hatch, the checker of see-through), once for the page */}
        <div dangerouslySetInnerHTML={{ __html: TOY_DEFS }} />
        <Bar />
        {children}
      </body>
    </html>
  );
}
