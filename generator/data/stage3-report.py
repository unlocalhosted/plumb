# Stage 3's results in numbers: how many of the recorded parts render, how many draw a shape, why the rest fail
# (grouped by cause), and the first measured motion numbers per commit rule. Writes the measured fields back into
# data/buttons.json under `rendered`.
#   python3 generator/data/stage3-report.py   (reads sandbox/results.jsonl brought home from vm-agent)
import json, re, statistics as st, collections
R = [json.loads(l) for l in open('sandbox/results.jsonl') if l.strip()]
d = json.load(open('data/buttons.json')); by = {r['id']: r for r in d}
n = len(R); ok = [r for r in R if r.get('renders')]; shaped = [r for r in ok if r.get('drewShape')]
print(f"{n} recorded · {len(ok)} render ({round(100*len(ok)/n)}%) · {len(shaped)} draw a shape ({round(100*len(shaped)/n)}%)")
cause = collections.Counter()
for r in R:
    if r.get('renders') and r.get('drewShape'): continue
    e = r.get('error') or ('words only: no shape' if r.get('renders') else 'unknown')
    e = re.sub(r'["\'][^"\']{0,80}["\']', '…', e); e = re.sub(r'\d+', 'N', e)[:70]
    cause[e] += 1
print('why the rest fail:'); [print(f"  {k:3d}  {c}") for c, k in cause.most_common(10)]
print('\nmeasured, per commit rule (parts that render and draw a shape):')
for rule in ['press', 'confirm', 'held-time', 'threshold', 'countdown']:
    g = [r for r in shaped if r.get('commitRule') == rule]
    if not g: continue
    longest = [r['longestMovementMs'] for r in g if r.get('longestMovementMs')]
    over = [r['maxOvershootPct'] for r in g if r.get('maxOvershootPct') is not None and r['maxOvershootPct'] < 60]
    faint = [r['faintestWords'] for r in g if r.get('faintestWords') is not None]
    print(f"  {rule:10} {len(g):3d} parts · longest movement median {int(st.median(longest)) if longest else '–'} ms · overshoot median {round(st.median(over),1) if over else '–'}% · words fade to {round(st.median(faint),2) if faint else '–'}")
for r in R:
    if r['id'] in by: by[r['id']]['rendered'] = {k: r.get(k) for k in ['renders', 'drewShape', 'painted', 'error', 'target', 'size', 'longestMovementMs', 'maxOvershootPct', 'faintestWords', 'movements']}
json.dump(d, open('data/buttons.json', 'w'), indent=1, ensure_ascii=False)
