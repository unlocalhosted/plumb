#!/usr/bin/env python3
"""The audit of 2026-11-26, applied to reviews.json. Run once; running it again changes nothing.

What it adds to every point:
  basis   how we know what "shows" says: "measured" (read from the page or a copy of it), "seen" (in his recording or
          picture, or in ours), or "word" (only his sentence; we did not see it)
  unseen  for a point that rests on his word in whole or in part: what exactly we did not see
  has     plumber's own checks that touch the point, by their id in web/docs/recordings/checks.json, each marked
          "same" (the same judgement), "near" (a neighbour: same idea, another case) or "opposite" (plumber says the
          reverse of his advice)
  pair    for a point about shape: which comparison it is a case of (see PAIRS)
It also rewrites the sentences that stated as fact something only he saw, corrects what was said about plumber, and
lists all 47 of his replies in the thread with where each one went.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, 'reviews.json')
CHECKS = os.path.join(HERE, '../../../../web/docs/recordings/checks.json')

PAIRS = {
    'alike-role': 'Alike, and the same role',
    'loud-important': 'Loud, and what matters',
    'near-belongs': 'Near, and belongs together',
    'enclosed-scope': 'Enclosed, and in one scope',
    'linked-related': 'Linked, and related',
    'regular': 'Edges and proportion that nearly agree',
    'one-language': 'One language across a page, a site and its surfaces',
    'kind': 'The kind of page and what it promises',
}

MEASURED = '3.2 3.3 3.4 3.5 3.6 3.7 3.8 3.12 4.2 4.3 7.1 7.2 7.3 12.1 12.2 19.1 21.1 21.2 21.3 31.2 31.3 32.1 33.4 35.2 35.3 40.2 40.3'.split()
SEEN = ('1.1 1.2 1.3 1.6 3.9 3.10 5.2 5.3 6.1 6.2 8.3 10.1 10.2 10.3 10.4 11.1 12.3 15.1 15.2 17.2 18.2 24.1 28.1 31.1 '
        '33.1 33.3 34.2 36.2 36.3 38.2 38.3 40.1 40.5 41.3 41.4 41.5 42.1 42.2 42.3 42.4').split()

GONE = 'The page he saw could not be recovered. Only today’s page was read.'
UNSEEN = {
    '1.4': 'Which links failed. His recording does not show it and we did not press them.',
    '1.5': 'The flash. We did not watch the page arrive.',
    '3.1': 'The animation. We did not watch the page arrive, so which effect he means is our guess.',
    '3.11': 'Nothing to see: it is a joke with no content.',
    '4.1': 'The cut he saw. Today the row ends on the two lines at 2,560 wide. Whether the owner changed it or his window was another width is not known.',
    '5.1': 'The swap. We did not hover the photos.',
    '7.4': GONE, '8.2': GONE, '13.1': GONE, '13.2': GONE, '14.1': GONE, '14.2': GONE, '27.1': GONE, '37.1': GONE, '37.2': GONE,
    '8.1': 'The empty scrollbar track. We did not read the page with scrollbars always shown.',
    '9.1': 'That the page scrolls during the opening. Not tried.',
    '9.2': 'That the opening carries on after a scroll. Not tried.',
    '9.3': 'The timing. We saw the two blocks, not when each one arrives.',
    '9.4': 'The break. Not tried.',
    '12.4': 'Whether a drawing is kept or shared. Not checked.',
    '16.1': 'The pointer and the hover. A still shows neither and we did not hover.',
    '16.2': 'The jumping. We did not watch the Work page arrive.',
    '17.1': 'The fault. He gave only the fix; that the page steps sideways between tabs is our inference, and it was not tried.',
    '17.3': 'The list of articles under the third tab was not opened.',
    '18.1': 'The panel he saw. Today the projects are links.',
    '19.2': 'The motion of the panel. Not timed.',
    '22.1': 'The other two pages. Only the home page was captured, so the button’s place on each page is his report.',
    '23.1': 'The opening sequence. We did not watch it.',
    '25.1': 'The greeting’s animation. The owner said he removed it.',
    '25.2': 'How the bar’s items arrive.',
    '25.3': 'The border and shadow he saw. The owner said he blended them.',
    '25.4': 'The transition. The owner said he replaced it with a fade; we saw neither.',
    '26.1': 'The entrances. We measured the page’s length, not its motion.',
    '28.2': 'That the picture keeps moving while one reads. A still cannot show it.',
    '29.1': 'The intro and the blocked press. Not tried.',
    '30.1': 'The header he saw. The owner agreed and it is gone today.',
    '33.2': 'That the testimonials move on by themselves. Not watched.',
    '34.1': 'The coloured icons he saw. Today they are grey.',
    '34.3': 'The blog. It was not captured.',
    '35.1': 'The swap. We saw the two faces, not the moment one replaces the other.',
    '36.1': 'The transition. Not timed.',
    '36.4': 'The writing page. It did not load for our capture.',
    '38.1': 'The transition. Not timed.',
    '39.1': 'That the cube turns and ignores the pointer. Not tried.',
    '39.2': 'Project pages. Not captured.',
    '39.3': 'The menu over the orange footer. We did not scroll there.',
    '40.4': 'The hover. Not tried.',
    '41.1': 'The reset. We did not leave the page and come back.',
    '41.2': 'The focus on blurred text. We did not walk the Tab key through it.',
    '41.6': 'The end of the game. We did not play to the fifteenth reveal.',
    '42.5': 'The lists. No article with a list was captured.',
    '42.6': 'The broken picture. Not captured.',
    # seen in part
    '1.2': 'The 13px is an estimate from frames of his recording, not a reading of the page.',
    '6.2': 'How long. We watched his recording and did not time it.',
    '15.2': 'The 590 pixels is an estimate from his recording.',
    '36.2': 'What he saw on his Mac. Our capture is from a Linux browser.',
    '41.5': 'Whether any pill leads to a page. We read the words, we did not press each pill.',
}

SHOWS = {
    '1.5': 'Crafts is a separate site with its own typefaces and layout. The flash of an unstyled page while it loads is his report.',
    '3.1': 'The home page holds large shapes, such as a yellow circle. How they arrive is his report: content uncovered by a moving cut-out.',
    '5.1': 'Two tilted photos overlap at the right of the hero, a smaller one behind and a larger one in front. By his report their order swaps on hover, at once.',
    '8.1': 'His report, with the way to see it. On a Mac scrollbars hide until you scroll, so a page that forces one looks fine to its author.',
    '9.1': 'The hero is a set of painted cut-outs and a notebook. By his report they arrive in sequence and the page can be scrolled meanwhile.',
    '9.2': 'By his report the opening keeps playing after he scrolls.',
    '9.3': 'The hero and the “Selected work” block under it are two separate regions. By his report the lower one starts to arrive while the hero is still moving.',
    '9.4': 'Each project has its own page. By his report the transition between it and home breaks when the two are pressed quickly in turn.',
    '12.4': 'Play is a page where a visitor can draw. That the drawing stays on the visitor’s own machine is his reading.',
    '16.1': 'By his report the site draws its own pointer, and links answer a hover with a small change in the text.',
    '16.2': 'The Work page is reached from the top menu. By his report its parts jump into place as it arrives.',
    '17.1': 'Three tabs sit under the introduction: Projects, Experience, Talks and articles. Each holds a different amount of content. He named only the fix, keeping room for the scrollbar.',
    '19.2': 'By his report the panel opens and closes with motion.',
    '23.1': 'On the settled page the sentence about what he believes, that new technology only matters if people can understand, trust and enjoy it, sits in small grey type. By his report the site opens with a sequence built on the name.',
    '25.4': 'By his report, pressing a card sent the other cards and labels off in different directions. The owner says it is now a plain fade.',
    '26.1': 'The page is about 5,900 pixels long with four sections. By his report the items in each arrive one after another on scroll.',
    '28.2': 'The text about the person starts right under the moving picture. By his report the picture keeps moving while he reads.',
    '29.1': 'The page pictured has links in its four corners: Work, About, Timeline and People. By his report an intro screen comes first and the links do not answer until it has finished.',
    '33.2': 'By his report the testimonials move on by themselves.',
    '36.1': 'The site is plain small type on black: lists of titles and dates, a search box, no pictures. By his report moving between pages plays a slow transition.',
    '38.1': 'The home page is drawn as a desktop: a bar across the top with a clock, folders and files as icons, monospaced labels. By his report opening something plays a slow transition.',
    '39.1': 'A cube covered in project pictures sits in the middle of the page, with a column of project names to its right. By his report the cube cannot be played with.',
    '39.3': 'The menu and the pixel rulers along the top and left edges are grey on black. The footer is the same orange as the large letters. By his report the menu and rulers end up over that orange.',
    '40.4': 'By his report the photo on the first screen moves and gains a border under the pointer. Nothing on the page says it leads anywhere.',
    '41.1': 'The introduction is a long blurred text. A few phrases are clear and end in a pill, such as PEDRO, RAYCAST and BARCELONA. Pressing a pill clears more of the text, and a counter at the top right keeps score out of 15. By his report, leaving the page and returning sets it back to nought.',
    '41.2': 'Pills further along sit inside text that is still blurred. By his report the Tab key reaches them, and the focus lands on something that cannot be read.',
    '41.6': 'By his report, after the last reveal nothing further is offered.',
    '42.5': 'His report: in a list, the bullets do not sit on the left edge that the paragraphs share.',
    '42.6': 'His report. The article was not captured.',
}

SAYS = {
    '11.1': 'One line: “not enough motion”. We read it as a joke, because the page lists its owner’s own motion libraries.',
    '21.3': 'Links and section headings are styled the same way. He assumed he could click the headings, and could not.',
    '39.1': 'He is disappointed that he cannot play with the cube. He adds a question: highlight the project in the list “in reverse” on hover? We read that as the cube and the list answering each other.',
}

TODAY = {
    '4.1': 'No fault at 2,560 wide today: the row ends on the two vertical lines. Whether that is a fix is not known. The web archive only has this site from April, six months before the review.',
}

ENGINE = {
    '9.4': 'Behaviour under stress. Plumber has this judgement for one element: it closes a thing part of the way into its entrance and checks that the motion carries on from where it is. His case is the same judgement on a change of page, which plumber does not try.',
    '12.2': 'Craft, two readings. A picture with fewer pixels than the space it fills on a dense screen: plumber has this for icons only. A picture cropped because its proportions differ from its frame: plumber’s check on a picture’s frame is about stretching, not cropping. Both would be new.',
    '14.1': 'Shape: a control that needs words to be understood. Plumber has this judgement already, with nearly his sentence as its reason: if it needs instructions, change the thing. Earlier in this work we said plumber could not see it. That was wrong. Whether the check fires on a filter with a label was not tried, because the label is gone.',
    '35.1': 'Craft, over time, and plumber says the opposite. Its check flags text that is hidden while its typeface loads, and tells the page to show a stand-in at once. He asks for this headline to be held back, because the stand-in is so unlike the real face that the swap is worse than the wait. Both are right in their case. What decides is how different the two faces are, which plumber could measure by drawing the same words in both and comparing the boxes. Until it does, its advice would be wrong on this page.',
    '39.3': 'Craft: contrast of fixed things over each ground they cross. Plumber has the judgement for a layer that slides under words. This is the same judgement with the page scrolling under fixed words, which needs the page read at more than one scroll position.',
    '40.3': 'Content, with a signal plumber already reads: a picture drawn at a small fraction of the size it was made at. Plumber’s check says the file is too big for its place and should be smaller. He says the place is too small for the drawing. One reading, two opposite fixes; which one holds depends on what the picture is.',
    '41.3': 'Craft, on a surface around the page. Plumber has a neighbour: a dark page whose browser parts stay light, because the page never says it is dark. The bars of a phone browser take their colour from two other things, the declared theme colour and the colour behind the page. Reading those would be new.',
    '42.5': 'Shape: edges that should share a line. Plumber has this judgement inside one group: rows of a menu or a list whose words start a few pixels off the edge the others keep. His case is across groups, a list against the paragraphs around it, which plumber does not compare.',
    '42.6': 'Behaviour: a picture that did not load. Plumber has this check.',
}

HAS = {
    '1.3': [('experience/control-covered', 'near', 'Not tried on this page.')],
    '3.2': [('experience/page-overflow-x', 'near', 'Plumber reads a page that scrolls sideways as an accident. Here it is the design.'), ('experience/scroll-no-hint', 'near', '')],
    '3.5': [('a11y/control-name', 'near', 'The first half: controls with no words.'), ('components/nav-current', 'near', 'For a screen reader, not for the eye.')],
    '6.2': [('craft/exit-faster', 'near', ''), ('craft/palette-motion', 'near', 'One case of the same reason: do not make people wait on motion.')],
    '7.4': [('craft/row-dead-zone', 'near', ''), ('craft/hit-target', 'near', '')],
    '8.1': [('craft/scroll-on-demand', 'same', '')],
    '9.4': [('craft/interruptible', 'near', 'One element, not a change of page.')],
    '14.1': [('tells/reading-instructions', 'same', 'Not tried on this page.')],
    '15.1': [('experience/scroll-no-hint', 'near', ''), ('craft/scroll-cue', 'near', ''), ('experience/scroll-keyboard', 'near', 'The keyboard, not the mouse wheel.')],
    '16.2': [('html/img-size', 'near', 'One cause of content jumping, read on a settled page.'), ('craft/skeleton-match', 'near', '')],
    '17.1': [('craft/scrollbar-gutter', 'same', ''), ('components/tab-shift', 'near', '')],
    '18.1': [('a11y/native-over-role', 'near', 'Plumber’s check is for a box playing a button. His point is a button that should be a link.')],
    '19.1': [('a11y/native-over-role', 'near', 'The same neighbour as 18.1.')],
    '19.2': [('craft/exit-faster', 'near', ''), ('craft/palette-motion', 'near', '')],
    '21.3': [('craft/link-in-text', 'near', 'The reverse case: a link that looks like text. Nothing for text that looks like a link.')],
    '25.3': [('craft/border-on-shadow', 'same', '')],
    '28.2': [('experience/motion-no-opt-out', 'near', 'About a visitor’s setting, not about reading beside motion.')],
    '30.1': [('experience/link-target-renamed', 'near', 'One place under two names.')],
    '33.2': [('experience/motion-no-opt-out', 'near', 'No check asks for a pause control.')],
    '35.1': [('experience/font-display', 'opposite', 'Plumber flags hidden text. He asks for it here.')],
    '35.2': [('tells/subtitle-echo', 'same', '')],
    '36.1': [('craft/palette-motion', 'near', '')],
    '38.1': [('craft/palette-motion', 'near', '')],
    '38.3': [('tells/flavour-badge', 'near', ''), ('tells/tag-row', 'near', ''), ('tells/code-breadcrumb', 'opposite', 'Plumber calls a file path used as decoration a template habit. He asks for this page’s desktop idea to be carried further, not removed. Not tried on this page.')],
    '39.3': [('craft/words-on-layers', 'near', '')],
    '40.1': [('craft/shared-edges', 'near', 'Inside cards in a row only.')],
    '40.3': [('html/img-oversized', 'opposite', 'The same reading, the opposite fix.')],
    '41.2': [('a11y/hidden-focusable', 'near', '')],
    '41.3': [('experience/color-scheme-missing', 'near', '')],
    '42.5': [('craft/column-edge', 'near', 'Inside one list.'), ('craft/shared-edges', 'near', 'Inside one card.')],
    '42.6': [('craft/image-broken', 'same', '')],
}

PAIR = {
    'alike-role': '21.3 10.3 3.6 17.3 3.8 38.2 40.4 12.3',
    'loud-important': '4.3 10.1 7.2 3.7 34.1 40.2 23.1 40.3 8.3 14.2 37.2 13.1 36.4',
    'near-belongs': '15.2',
    'enclosed-scope': '4.1 34.3 7.3',
    'linked-related': '41.5 39.1',
    'regular': '40.1 42.5 13.2 35.3 3.10',
    'one-language': '1.6 3.9 38.3 21.2 21.1 12.1 22.1',
    'kind': '1.1 3.3 7.1 3.1 6.1 31.1 40.5 36.1 38.1',
}

REPLIES = [  # the seven of his 47 replies that are not the first reply of a review
    ('2112205408794198275', 'joke', 'On his own site, posted by a friend: two words of mock dismissal. His real notes on it are review 3.'),
    ('2112209428371902773', 'joke', 'A joke about cycling, under the same post.'),
    ('2112223129674076448', 'aside', 'To everyone: an apology that he may not reach every link.'),
    ('2112253696167796919', '19.2', 'His answer to the owner about panels and tabs.'),
    ('2112256817782825114', 'aside', 'Under review 15: one word, confirming that the second pointer in his recording came from the recording software.'),
    ('2112270096135795106', '21.2', 'His follow-up: names would give sponsors more of a spotlight than small pictures.'),
    ('2112306169813360685', '40.5', 'His follow-up, with a picture: the outline stars read as none.'),
]

def main():
    data = json.load(open(FILE))
    names = {c['id']: c['name'] for c in json.load(open(CHECKS))['checks']}
    known = set(names)
    pair_of = {k: name for name, ks in PAIR.items() for k in ks.split()}
    every = {p['k'] for r in data['reviews'] for p in r['points']}
    for table in (MEASURED, SEEN, UNSEEN, SHOWS, SAYS, TODAY, ENGINE, HAS, pair_of):
        missing = [k for k in table if k not in every]
        assert not missing, f'no such point: {missing}'
    assert not set(MEASURED) & set(SEEN)
    for k, rows in HAS.items():
        for cid, how, _ in rows:
            assert cid in known, f'{k}: no check called {cid}'
            assert how in ('same', 'near', 'opposite')
    for r in data['reviews']:
        for p in r['points']:
            k = p['k']
            p['basis'] = 'measured' if k in MEASURED else 'seen' if k in SEEN else 'word'
            unseen = UNSEEN.get(k) or ('Only his sentence. We did not see it.' if p['basis'] == 'word' else '')
            if unseen: p['unseen'] = unseen
            else: p.pop('unseen', None)
            for field, table in (('shows', SHOWS), ('says', SAYS), ('today', TODAY), ('engine', ENGINE)):
                if k in table: p[field] = table[k]
            p['has'] = [{'id': cid, 'name': names[cid], 'how': how, **({'note': note} if note else {})} for cid, how, note in HAS.get(k, [])]
            if k in pair_of: p['pair'] = pair_of[k]
            else: p.pop('pair', None)
    firsts = [{'id': r['reply'], 'kind': 'review', 'to': r['n']} for r in data['reviews']]
    data['replies'] = firsts + [{'id': i, 'kind': 'point' if '.' in to else to, **({'to': to} if '.' in to else {}), 'what': what} for i, to, what in REPLIES]
    assert len({x['id'] for x in data['replies']}) == 47, len(data['replies'])
    data['pairs'] = PAIRS
    data['audited'] = '2026-11-26'
    temp = FILE + '.tmp'
    with open(temp, 'w') as f: f.write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    os.replace(temp, FILE)
    pts = [p for r in data['reviews'] for p in r['points']]
    count = lambda f: {v: sum(1 for p in pts if f(p) == v) for v in sorted({f(p) for p in pts}, key=str)}
    print('basis', count(lambda p: p['basis']))
    print('pair', count(lambda p: p.get('pair', '-')))
    hows = [h['how'] for p in pts for h in p['has']]
    print('points with a check', sum(1 for p in pts if p['has']), {h: sum(1 for p in pts if any(x['how'] == h for x in p['has'])) for h in ('same', 'near', 'opposite')})
    print('replies', len(data['replies']))

if __name__ == '__main__':
    sys.exit(main())
