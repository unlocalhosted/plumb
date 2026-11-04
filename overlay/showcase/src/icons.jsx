// Quarry's icons: one 24-unit grid, drawn with a stroke that follows the words beside them (#50).
const glyph = (body) => function Icon({ size = 16, stroke = 1.75, className = '', ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={'shrink-0 ' + className} {...rest}>{body}</svg>
  );
};

export const Home = glyph(<><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></>);
export const Invoice = glyph(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 12h5M10 16h5" /></>);
export const People = glyph(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 3 3 6" /></>);
export const Gear = glyph(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></>);
export const Search = glyph(<><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>);
export const Bell = glyph(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const Plus = glyph(<path d="M12 5v14M5 12h14" />);
export const More = glyph(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>);
export const Chevron = glyph(<path d="m9 6 6 6-6 6" />);
export const Refresh = glyph(<><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>);
export const Paperclip = glyph(<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />);
export const Close = glyph(<path d="M6 6l12 12M18 6 6 18" />);
// filled marks: the play triangle and the integrations' round and square logos
export const Play = ({ size = 16, className = '' }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={'shrink-0 ' + className}><path d="M3 3v18l18-9z" fill="currentColor" /></svg>;
// a round logo needs a little more than a square one's width to look the same size (#3): r 9.75 against a side of 18
export const Round = ({ size = 20, r = 9.75, className = '' }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={'shrink-0 ' + className}><circle cx="12" cy="12" r={r} fill="currentColor" /></svg>;
export const Square = ({ size = 20, className = '' }) => <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={'shrink-0 ' + className}><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" /></svg>;
