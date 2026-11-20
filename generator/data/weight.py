# Stage 2 of the button proof of concept (docs/briefs/button-poc.md): one quality weight per part, so the best
# examples of each idea come first. It ranks, it never filters.
#   stars    the library's GitHub stars on a log scale (the owner's call: well-starred libraries are more often well
#            built), 0.5 of the weight; a library whose stars are unknown counts as about 30 stars, not as zero
#   health   the registry's health score from shadcn's directory, 0.2
#   care     handles reduced motion (0.15) and the keyboard (0.15)
#   python3 generator/data/weight.py   → adds stars, repo and weight to data/buttons.json; prints the top 20
import json, math
d = json.load(open('data/buttons.json'))
stars = json.load(open('library/cache/stars.json'))
health = {r['name']: (r.get('health') or {}).get('score') for r in json.load(open('library/cache/harvest/registries.json'))}
top = max((s['stars'] or 0) for s in stars.values()) or 1
UNKNOWN = 30
for r in d:
    s = stars.get(r['registry'], {})
    r['stars'] = s.get('stars'); r['repo'] = s.get('repo')
    star = math.log10((r['stars'] if r['stars'] is not None else UNKNOWN) + 1) / math.log10(top + 1)
    h = (health.get(r['registry']) or 50) / 100
    r['weight'] = round(0.5 * star + 0.2 * h + 0.15 * (1 if r['reducedMotion'] else 0) + 0.15 * (1 if r['keyboard'] else 0), 3)
json.dump(d, open('data/buttons.json', 'w'), indent=1, ensure_ascii=False)
# what stage 3 renders: the best by weight, one per family, at most 12 per library so stars lift a library without
# letting it crowd out the rest
pool = sorted([r for r in d if r['kind'] in ('button', 'group') and r.get('representative')], key=lambda r: -r['weight'])
per, best = {}, []
for r in pool:
    if per.get(r['registry'], 0) >= 12: continue
    per[r['registry']] = per.get(r['registry'], 0) + 1; best.append(r)
for i, r in enumerate(best): r['renderRank'] = i + 1
json.dump(d, open('data/buttons.json', 'w'), indent=1, ensure_ascii=False)
print(f"weights for {len(d)} parts; {sum(1 for r in d if r['stars'] is not None)} from libraries with known stars")
print(f'stage 3 picks: {len(best)} candidates, top 300 from {len({r["registry"] for r in best[:300]})} libraries')
for r in best[:20]: print(f"  {r['weight']:.3f}  {str(r['stars'] if r['stars'] is not None else '?'):>6}★  {r['commitRule']:9} {r['id'][:52]}")
