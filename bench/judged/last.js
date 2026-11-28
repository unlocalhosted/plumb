// The last screen (docs/briefs/shape-engine.md, section 18): when a page has been scrolled to its end, does the
// window still offer a way to another page of the site? Pure: plain rows in, a verdict out.
//
//   judge(end)  end: { screens, press, links: [{ kind, here, up, stays }] }
//                 screens  how many windows tall the page is
//                 press    how many things on the last screen can be pressed and are not links (a button, a row
//                          that opens something): where they lead is not in the code
//                 links    every link the page has that can be seen:
//                   kind   'page'       it leads to another page of this site
//                          'place'      it jumps within this page (back to the top)
//                          'elsewhere'  it leaves the site
//                   here   it is in the window when the page is at its end
//                   up     how many windows above the last screen's top it ends (0 when it is here, null when it
//                          is off to the side: a page that runs sideways)
//                   stays  it is fixed to the window, so it is on every screen
//               → null when the page fits in one screen (its first screen is its last), else
//                 { outcome, ways, stay, back, away, press, up }
//                   outcome  'agree'     the last screen has a link to another page of the site
//                            'disagree'  it has none: the page ends with nothing to go on to
//                            'blind'     it has none, and it has things to press that are not links, so
//                                        whether one of them leads on cannot be read and nothing is said
//                            'alone'     the page links to no other page of its site at all, so there is nowhere
//                                        on the site to go on to and nothing is said
//                   ways, stay  how many such links are on the last screen, and how many of them are fixed to the window
//                   back, away  how many links there jump within the page, and how many leave the site
//                   up       how many windows up the nearest link to another page is (null: off to the side)
//
// No threshold is used. Whether the window at the end holds such a link is a yes or a no.
export function judge(end) {
  if (!end || end.screens <= 1) return null;
  const here = end.links.filter((l) => l.here), count = (k) => here.filter((l) => l.kind === k).length, ways = here.filter((l) => l.kind === 'page');
  const out = { ways: ways.length, stay: ways.filter((l) => l.stays).length, back: count('place'), away: count('elsewhere'), press: end.press ?? 0 };
  if (ways.length) return { ...out, outcome: 'agree', up: 0 };
  const others = end.links.filter((l) => l.kind === 'page'), above = others.map((l) => l.up).filter((u) => u !== null);
  if (!others.length) return { ...out, outcome: 'alone', up: null };
  if (out.press) return { ...out, outcome: 'blind', up: null };
  return { ...out, outcome: 'disagree', up: above.length ? Math.round(Math.min(...above) * 10) / 10 : null };
}
