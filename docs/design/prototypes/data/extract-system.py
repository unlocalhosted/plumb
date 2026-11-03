"""Turn `plumber check --json` into the data the "your system, drawn" prototype draws.

Usage: python3 -I extract-system.py <report.json> <out.json>

For each scale (text size, weight, radius, spacing, colour): the theme's steps with how many places use them, and
the values written by hand, grouped by what they resolve to, each with the step it sits nearest and how it was
written. Read from the resolved declarations, not the findings: a finding is one class as written, so `text-[11px]`
and `text-[0.6875rem]` would be two findings for one value.
"""
import json, re, sys, collections

report = json.load(open(sys.argv[1]))
decls = report['declarations']
decisions = [d for d in report['decisions'] if d.get('origin') == 'project']

def px(value):
    if value is None: return None
    v = str(value).strip()
    m = re.fullmatch(r'(-?[\d.]+)(px|rem)?', v)
    if m: return round(float(m.group(1)) * (16 if m.group(2) == 'rem' else 1), 3)
    # scaled text: calc(var(--z) * 15px) or calc(15px * var(--z)), drawn at its designed size
    m = re.search(r'([\d.]+)(px|rem)\s*\*\s*var\(--z\)|var\(--z\)\s*\*\s*([\d.]+)(px|rem)', v)
    if m:
        n, unit = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
        return round(float(n) * (16 if unit == 'rem' else 1), 3)
    return None

def scaled(d): return 'var(--z)' in str(d.get('value', ''))

# the tokens a declaration reads: its own var() refs and, for a utility class, the theme token behind it
def refs(d): return (d.get('refs') or []) + (d.get('decisionRefs') or [])

# colour as OKLab, to find the theme colour a hand-written one sits nearest (and exact copies)
def oklab(css):
    css = css.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{6})([0-9a-f]{2})?', css) or re.fullmatch(r'#([0-9a-f]{3})', css)
    if m:
        h = m.group(1); h = ''.join(c * 2 for c in h) if len(h) == 3 else h
        rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
        l = 0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]
        m_ = 0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]
        s_ = 0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]
        l, m_, s_ = (x ** (1 / 3) for x in (l, m_, s_))
        return (0.2104542553 * l + 0.7936177850 * m_ - 0.0040720468 * s_, 1.9779984951 * l - 2.4285922050 * m_ + 0.4505937099 * s_, 0.0259040371 * l + 0.7827717662 * m_ - 0.8086757660 * s_)
    m = re.fullmatch(r'oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:/\s*[\d.%]+)?\s*\)', css)
    if m:
        import math
        L = float(m.group(1)) / (100 if m.group(2) else 1); C = float(m.group(3)); H = math.radians(float(m.group(4)))
        return (L, C * math.cos(H), C * math.sin(H))
    return None
def opacity(css):
    a = alpha(css)
    if not a: return 1.0
    return int(a, 16) / 255 if re.fullmatch(r'[0-9a-f]{2}', a) else float(a[:-1]) / 100 if a.endswith('%') else float(a)
def alpha(css): m = re.search(r'/\s*([\d.]+%?)\s*\)$', css) or re.fullmatch(r'#[0-9a-f]{6}([0-9a-f]{2})', css.lower()); return m and m.group(1)

def scale(prefix, props, exclude=r'--', least=0):
    steps = {}
    for d in decisions:
        name = d['name']
        if not name.startswith(prefix) or re.search(exclude, name[len(prefix):]): continue
        value = px(d.get('resolved') or d['value'])
        if value is not None: steps[name] = {'name': name[2:], 'px': value, 'uses': 0}
    strays = collections.defaultdict(lambda: {'places': 0, 'written': collections.Counter(), 'scaled': 0})
    for d in decls:
        if d['prop'] not in props: continue
        ref = next((r for r in refs(d) if r in steps), None)
        if ref: steps[ref]['uses'] += 1; continue
        value = px(d.get('resolved')) if not scaled(d) else px(d.get('value'))
        # below `least` is a unit artifact (a unitless or em value read as px), not a size anyone set
        if value is None or value < max(least, 0.01): continue
        s = strays[value]; s['places'] += 1; s['written'][d['site']['text']] += 1
        if scaled(d): s['scaled'] += 1
    ordered = sorted(steps.values(), key=lambda s: s['px'])
    out = []
    for value, s in strays.items():
        near = min(ordered, key=lambda st: abs(st['px'] - value)) if ordered else None
        exact = near is not None and abs(near['px'] - value) < 0.01
        out.append({'px': value, 'places': s['places'], 'scaled': s['scaled'], 'near': near and near['name'],
                    'copy': exact, 'written': [{'text': t, 'n': n} for t, n in s['written'].most_common(3)]})
    return {'steps': ordered, 'strays': sorted(out, key=lambda s: s['px'])}

def weights():
    steps = collections.Counter(); strays = collections.Counter(); written = collections.defaultdict(collections.Counter)
    theme = {d['name'] for d in decisions if d['name'].startswith('--font-weight-')}
    for d in decls:
        if d['prop'] != 'font-weight': continue
        w = d.get('resolved') or d.get('value')
        if not re.fullmatch(r'\d{3}', str(w)): continue
        # a weight from the theme the project wrote, or one Tailwind ships (framework): the theme here only restates
        # Tailwind's names, so every weight in use is counted, marked by where it came from
        own = any(r in theme for r in refs(d))
        (steps if own else strays)[int(w)] += 1; written[int(w)][d['site']['text']] += 1
    return {'used': [{'weight': w, 'places': steps[w] + strays[w], 'written': [{'text': t, 'n': n} for t, n in written[w].most_common(3)]} for w in sorted(set(steps) | set(strays))]}

COLOR_PROPS = {'color', 'background-color', 'background', 'border-color', 'fill', 'stroke', 'outline-color', 'text-decoration-color'}
HEX = re.compile(r'#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]*\)|oklch\([^)]*\)|hsla?\([^)]*\)')

def colours():
    tokens = {d['name']: (d.get('resolved') or d['value']) for d in decisions if d['family'] == 'color' and d['name'].startswith('--color-')}
    uses = collections.Counter(); strays = collections.defaultdict(lambda: {'places': 0, 'written': collections.Counter()})
    for d in decls:
        if d['prop'] not in COLOR_PROPS: continue
        ref = next((r for r in refs(d) if r in tokens), None)
        if ref: uses[ref] += 1; continue
        value = d.get('resolved') or d.get('value') or ''
        m = HEX.search(str(value))
        if not m or 'var(' in str(value): continue
        key = m.group(0).lower()
        if key == '#fff': key = '#ffffff'
        strays[key]['places'] += 1; strays[key]['written'][d['site']['text']] += 1
    labs = {n: oklab(v) for n, v in tokens.items() if oklab(v)}
    def nearest(css):
        lab = oklab(css)
        if not lab or not labs: return None, None
        # opacity counts: black at 42% is not black
        a = opacity(css)
        dist = lambda n, t: (sum((x - y) ** 2 for x, y in zip(t, lab)) + (opacity(tokens[n]) - a) ** 2) ** .5
        n, t = min(labs.items(), key=lambda kv: dist(*kv))
        return n[2:], round(dist(n, t), 4)
    near = {k: nearest(k) for k in strays}
    return {'steps': [{'name': n[2:], 'css': v, 'uses': uses[n]} for n, v in tokens.items() if '(' in v or v.startswith('#')],
            'strays': sorted([{'css': k, 'places': s['places'], 'near': near[k][0], 'distance': near[k][1], 'alpha': alpha(k), 'written': [{'text': t, 'n': n} for t, n in s['written'].most_common(3)]}
                              for k, s in strays.items()], key=lambda s: -s['places'])}

def dead():
    out = []
    for f in report['findings']:
        if f['rule'] != 'existence/dead-class': continue
        m = re.findall(r'`([^`]+)`', f.get('fix') or '')
        out.append({'class': f['declaration']['value'], 'places': len(f['sites']), 'meant': m[:2]})
    return sorted(out, key=lambda d: -d['places'])

data = {
    'project': 'crafting-ui', 'files': sum(report['files'].values()) if isinstance(report['files'], dict) else report['files'],
    'size': scale('--text-', {'font-size'}, least=6),
    'radius': scale('--radius-', {'border-radius'}),
    'weight': weights(),
    'colour': colours(),
    'dead': dead(),
}
json.dump(data, open(sys.argv[2], 'w'), indent=1)
# the same data as a script, so the prototype opens straight from disk
open(re.sub(r'\.json$', '.js', sys.argv[2]), 'w').write('window.SYSTEM = ' + json.dumps(data) + ';\n')
print(json.dumps({k: (len(v['strays']) if isinstance(v, dict) and 'strays' in v else '') for k, v in data.items()}))
