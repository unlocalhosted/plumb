// Every drift planted in Relay, on purpose, the way real code collects it. React Plumber should find each one and
// nothing else; the in-app legend (a later layer) draws this list over the page so anyone can check.
//
// screen · where (file and what) · what's wrong · the rule that should catch it · the fix the overlay should offer
export const planted = [
  { screen: 'shell', file: 'app/Sidebar.jsx', what: 'gap between sidebar sections gap-[18px]', wrong: 'off the 4px ladder', rule: 'provenance/arbitrary', fix: 'gap-4 (16px) or gap-5 (20px)' },
  { screen: 'shell', file: 'app/TopBar.jsx', what: 'hand-rolled New issue button', wrong: 'imitates Button with its own padding and radius (px-[13px], rounded-[7px])', rule: 'imitation/Button, provenance/arbitrary', fix: 'use <Button>; px-3, rounded-md' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar initials text-[10px]', wrong: 'below the type scale (12px is the smallest step)', rule: 'provenance/arbitrary', fix: 'text-xs' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar initials text-white', wrong: 'raw colour on a computed background', rule: 'provenance/color', fix: 'text-primary-foreground (or a token for on-avatar ink)' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar stack ring ring-[#fff]', wrong: 'raw colour; stays white in dark mode', rule: 'provenance/color', fix: 'ring-background' },
];
