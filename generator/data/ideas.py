# Stage 4 of the button proof of concept (docs/briefs/button-poc.md): from parts to ideas. Parts that render and draw a
# shape are grouped by what they do: how they commit, what drives them, what their words do, and their leading trick.
# Each idea keeps its three best examples by weight and its typical numbers as measured in stage 3 (not read from
# code), so the catalogue the owner reviews rests on buttons that were watched working.
#   python3 generator/data/ideas.py   → data/ideas.json, and a summary
import json, statistics as st, collections
d = json.load(open('data/buttons.json'))
live = [r for r in d if (r.get('rendered') or {}).get('renders') and r['rendered'].get('drewShape') and r['kind'] in ('button', 'group')]
# the trick a person notices first, when a part has several (the rarer and louder ones lead)
LEAD = ['particles', 'liquid', 'text-scramble', 'tilt', 'gradient-border', 'ripple', 'shimmer', 'icon-morph', 'glow', 'noise', 'blur']
lead = lambda r: next((t for t in LEAD if t in r['tricks']), 'plain')
COMMIT = {'press': 'Press', 'confirm': 'Press, then confirm', 'held-time': 'Hold', 'threshold': 'Slide', 'countdown': 'Countdown'}
DRIVER = {'press': '', 'state': 'that answers in words', 'pointer-distance': 'that follows the pointer', 'time-held': '', 'position': ''}
TRICK = {'plain': '', 'particles': 'with a burst of particles', 'liquid': 'with a liquid fill', 'text-scramble': 'with scrambling letters', 'tilt': 'that tilts in 3-D',
         'gradient-border': 'with a moving gradient border', 'ripple': 'with a ripple', 'shimmer': 'with a shimmer', 'icon-morph': 'whose icon reshapes', 'glow': 'that glows', 'noise': 'with grain', 'blur': 'that blurs as it changes'}
groups = collections.defaultdict(list)
for r in live:
    # a press is mostly told apart by what answers and what it adds; the deliberate kinds by the kind alone, then trick
    k = (r['commitRule'], r['driver'] if r['commitRule'] == 'press' else '', lead(r))
    groups[k].append(r)
ideas = []
for (commit, driver, trick), rs in groups.items():
    if len(rs) < 2 and commit == 'press': continue
    rs.sort(key=lambda r: -r['weight'])
    m = lambda f: [r['rendered'][f] for r in rs if r['rendered'].get(f) is not None]
    over = [v for v in m('maxOvershootPct') if v < 60]
    name = ' '.join(x for x in [COMMIT[commit], DRIVER.get(driver, ''), TRICK[trick]] if x)
    ideas.append({'idea': name, 'commitRule': commit, 'driver': driver or None, 'trick': trick, 'parts': len(rs), 'libraries': len({r['registry'] for r in rs}),
                  'best': [{'id': r['id'], 'name': r['name'], 'stars': r.get('stars'), 'weight': r['weight']} for r in rs[:3]],
                  'measured': {'longestMovementMs': int(st.median(m('longestMovementMs'))) if m('longestMovementMs') else None,
                               'overshootPct': round(st.median(over), 1) if over else None,
                               'wordsFadeTo': round(st.median(m('faintestWords')), 2) if m('faintestWords') else None,
                               'secondsToCommit': round(st.median([r['secondsToCommit'] for r in rs if r.get('secondsToCommit')]), 2) if any(r.get('secondsToCommit') for r in rs) and commit != 'press' else None}})
ideas.sort(key=lambda i: (list(COMMIT).index(i['commitRule']), -i['parts']))
json.dump(ideas, open('data/ideas.json', 'w'), indent=1, ensure_ascii=False)
print(f"{len(ideas)} ideas from {len(live)} parts that render and draw a shape")
for i in ideas: print(f"  {i['parts']:3d} parts, {i['libraries']:2d} libraries  {i['idea']:55}  e.g. {i['best'][0]['id']}")
