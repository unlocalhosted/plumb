# Near-duplicate families: parts from one registry whose code is mostly the same (one author's "button-01" to
# "button-60"). Code is read as a set of 6-token shingles; two parts with Jaccard similarity ≥ 0.8 (0.6 folded different parts that only share wrapper code) are one family.
# Each family keeps every member, names a representative (the one with the most lines), and records its size, so a
# prolific registry can't outweigh the rest of the data.
#   python3 generator/data/families.py   → adds family, familySize, representative to data/buttons.json
import json, re, collections
d = json.load(open('data/buttons.json'))
h = {f"{p['registry']}/{p['name']}": p for p in json.load(open('library/cache/harvest-button.json'))}
def shingles(rid):
    try: item = json.load(open(h[rid]['file']))
    except Exception: return set()
    # the part's own main file: items often ship the same shared files, which made different parts look alike
    files = [f for f in item.get('files', []) if f.get('content')]
    stem = h[rid]['name'].lower()
    main = next((f for f in files if stem in (f.get('path') or '').lower()), None) or (max(files, key=lambda f: len(f['content'])) if files else None)
    src = main['content'] if main else ''
    toks = re.findall(r'[A-Za-z_][A-Za-z0-9_-]*|\d+', src)
    return {' '.join(toks[i:i + 6]) for i in range(0, max(0, len(toks) - 5), 2)}
by = collections.defaultdict(list)
for r in d: by[r['registry']].append(r)
parent = {}
def find(x):
    while parent.get(x, x) != x: x = parent[x]
    return x
for reg, rs in by.items():
    if len(rs) < 2: continue
    S = {r['id']: shingles(r['id']) for r in rs}
    ids = [r['id'] for r in rs]
    for i in range(len(ids)):
        a = S[ids[i]]
        if not a: continue
        for j in range(i + 1, len(ids)):
            b = S[ids[j]]
            if not b: continue
            if len(a & b) / len(a | b) >= 0.8: parent[find(ids[j])] = find(ids[i])
fam = collections.defaultdict(list)
for r in d: fam[find(r['id'])].append(r)
for root, members in fam.items():
    rep = max(members, key=lambda r: r['lines'])
    for r in members: r['family'] = root; r['familySize'] = len(members); r['representative'] = r is rep
json.dump(d, open('data/buttons.json', 'w'), indent=1, ensure_ascii=False)
big = sorted(fam.values(), key=len, reverse=True)
print(f"{len(d)} parts in {len(fam)} families; {sum(1 for m in fam.values() if len(m) > 1)} families of 2 or more")
for m in big[:6]: print(f"  {len(m):3d} × {m[0]['registry']}: {', '.join(x['name'] for x in m[:4])}…")
reps = [r for r in d if r['representative'] and r['kind'] in ('button', 'group')]
print(f"representative buttons and groups: {len(reps)}")
