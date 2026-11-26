#!/usr/bin/env python3
"""Points redone as scenes: shown on the live site as he met them, in place of a box from a still picture.

A site is added here only after it has been used the way he used it. Each scene names the things the point is about
(found on the live page by the site's own names), what ties them together, and what to do with your own hand.
Run after audit.py; running it again changes nothing. bench/judged/review.js says how a scene is drawn.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, 'reviews.json')

READY = {
    5: {'press': 'Skip intro', 'until': '.home-hero__photo--secondary'},
}
NOTE = {
    5: 'Redone on 2026-11-26 by using the live site as he did. The site opens with a screen of the name that lasts about five seconds; this view skips it. The page scrolls inside a box of its own, which is why the earlier boxes did not follow it.',
}
POINTS = {
    '5.1': {
        'scene': {
            'show': [{'sel': '.home-hero__photo--portrait', 'name': 'Behind'}, {'sel': '.home-hero__photo--secondary', 'name': 'In front'}],
            'join': 'change places under the pointer',
            'try': 'Move the pointer onto the photo behind, then away. Watch the moment it comes to the front.',
        },
        'shows': 'Two tilted photos overlap in the hero, a smaller one behind and a larger one in front. Under the pointer the one behind is drawn on top by the very next frame, about 20 thousandths of a second later. Only then does it start to grow, by about 5 percent, and that takes more than a second to settle. So the order changes before anything has moved, and the movement that follows explains nothing.',
        'basis': 'measured', 'unseen': None,
        'today': 'Unchanged. Tried and timed on the live page on 2026-11-26.',
        # the point as a case for the engine: the state, the signal as numbers, what a check should mark and say
        'case': {
            'state': 'After the opening screen, with the pointer moved onto the photo behind.',
            'signal': 'Under the pointer one thing comes to the front of another it overlaps. The order changes in the first frame, and its own movement takes about a second.',
            'measured': 'Stacking order 1 to 3 at 23 ms. Scale 1.00 to 1.05, still settling at 1,055 ms. Read every frame on the live page, 2026-11-26.',
            'expect': {'on': '.home-hero__photo--portrait', 'say': 'Comes to the front at once, then moves. (Our wording, not his.)'},
            'insight': 'A change of order between overlapping things has no in-between. Paired with a movement, it has to happen where the movement has carried the two clear of each other, or the eye sees a cut.',
            'plumber': {'ran': '2026-11-26', 'verdict': 'not read', 'why': 'The page check read no elements on this site, on the home page and on a project page. It judges only elements tied to the app’s own source, and a public site has none.'},
        },
    },
    '5.2': {
        'scene': {
            'show': [{'sel': '.home-hero__photo--portrait', 'name': 'Him, in a field'}, {'sel': '.home-hero__photo--secondary', 'name': 'Him, in a street'}],
            'join': 'the same person twice',
            'beside': [{'src': '/icon.png', 'name': 'The tab icon'}],
        },
        'today': 'Unchanged on 2026-11-26.',
    },
    '5.3': {
        'scene': {
            'show': [{'sel': '.icon-project_card', 'all': True, 'name': 'Locked'}],
            'try': 'Press any of the four projects. Each one opens on a password box and nothing else.',
        },
        'shows': 'All four projects carry a lock beside their title. Each card plays a recording of the product, and hovering it says the case study is password protected. Pressing a card opens a page that holds one password box and two buttons.',
        'basis': 'measured', 'unseen': None,
        'today': 'Unchanged on 2026-11-26: four projects, four locks.',
    },
}

# Which points can feed the engine: not advice about the person's work, not a joke, still on today's page, and on a
# site our browser can open. The rest stay in the file for reading.
GONE = re.compile(r'^(Fixed|Done|Changed|Gone|Removed)')
def feeds(review, p):
    if p['level'] == 'content': return 'Advice about the work, not about the page.'
    if p['k'] in ('3.11', '11.1', '31.1'): return 'A joke, or no fault named.'
    if GONE.match(p.get('today', '')): return 'No longer on the page.'
    if review['n'] == 1: return 'The site turns our browser away.'
    return ''

def main():
    data = json.load(open(FILE))
    done = 0
    for r in data['reviews']:
        if r['n'] in READY: r['ready'] = READY[r['n']]
        if r['n'] in NOTE: r['note'] = NOTE[r['n']]
        for p in r['points']:
            for field, value in POINTS.get(p['k'], {}).items():
                if value is None: p.pop(field, None)
                else: p[field] = value
            done += 'scene' in p
            no = feeds(r, p)
            p['engine_case'] = not no
            if no: p['engine_case_why_not'] = no
            else: p.pop('engine_case_why_not', None)
    temp = FILE + '.tmp'
    with open(temp, 'w') as f: f.write(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    os.replace(temp, FILE)
    pts = [p for r in data['reviews'] for p in r['points']]
    print(f'{done} points have a scene; {sum(p["engine_case"] for p in pts)} of {len(pts)} can feed the engine; {sum("case" in p for p in pts)} written as a case')

if __name__ == '__main__':
    main()
