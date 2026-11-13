import './globals.css';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import { Bar } from '../site/Bar.jsx';
import { rootTokens } from '../site/tokens.js';
import { SOFT_CSS } from '../../overlay/src/soft.js';
import { TOY_DEFS } from '../../overlay/src/toys.js';
import { PlumbOverlay } from '@unlocalhosted/react-plumber/next/overlay';

// The site's two faces: Bricolage Grotesque for what a toy has printed on it (titles, names, buttons), Instrument
// Sans for sentences. The overlay itself never fetches a font (it runs inside other people's apps), so its tokens
// name the system's faces; the site ships its own and puts them first in the same two tokens (globals.css).
const round = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-round', display: 'swap' });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = { title: { default: 'React Plumber', template: '%s · React Plumber' }, description: 'Keep your app on your design system.' };

export default async function Layout({ children }) {
  // the site is drawn with the product's own tokens: the overlay's token file, put on this page's root
  const tokens = await rootTokens();
  return (
    <html lang="en" data-scheme="light" className={`${round.variable} ${body.variable}`} suppressHydrationWarning>
      <head><style dangerouslySetInnerHTML={{ __html: tokens + SOFT_CSS }} /></head>
      <body>
        {/* the patterns two toys use (padding's hatch, the checker of see-through), once for the page */}
        <div dangerouslySetInnerHTML={{ __html: TOY_DEFS }} />
        <Bar />
        {children}
        {/* React Plumber on its own site, in development (renders nothing in production) */}
        <PlumbOverlay />
      </body>
    </html>
  );
}
