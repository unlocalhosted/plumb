# Stage 4's catalogue as a page for the owner's review: each idea (data/ideas.json) with its three best parts, each
# shown at rest and mid-gesture as recorded on vm-agent, and the idea's measured numbers.
#   python3 generator/data/ideas-page.py   → web/public/research/button-ideas.html (+ button-ideas/ shots)
import json, os, shutil, html
G = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(G, '..', 'web', 'public', 'research')
ideas = json.load(open(os.path.join(G, 'data', 'ideas.json')))
shots = os.path.join(G, 'sandbox', 'shots'); dest = os.path.join(OUT, 'button-ideas')
os.makedirs(dest, exist_ok=True)
e = html.escape
RULE = {'press': ('Press', 'var(--press)'), 'confirm': ('Press, then confirm', 'var(--confirm)'), 'held-time': ('Hold', 'var(--hold)'), 'threshold': ('Slide', 'var(--slide)'), 'countdown': ('Countdown', 'var(--countdown)')}
def shot(pid, state):
    f = pid.lstrip('@').replace('/', '__') + f'-{state}.png'
    if not os.path.exists(os.path.join(shots, f)): return None
    # trimmed to what was drawn: the recorder shoots the whole stage, the button sits small in it
    from PIL import Image, ImageChops
    im = Image.open(os.path.join(shots, f)).convert('RGB'); bg = Image.new('RGB', im.size, im.getpixel((2, 2)))
    box = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 12 else 0).getbbox()
    if box: pad = 24; im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    im.save(os.path.join(dest, f), optimize=True); return f'button-ideas/{f}'
def numbers(m):
    out = []
    if m.get('secondsToCommit'): out.append(f"commits after {m['secondsToCommit']} s")
    if m.get('longestMovementMs') is not None: out.append(f"longest movement {m['longestMovementMs']} ms")
    if m.get('overshootPct'): out.append(f"overshoots {m['overshootPct']}%")
    if m.get('wordsFadeTo') is not None and m['wordsFadeTo'] < 0.95: out.append(f"words fade to {round(m['wordsFadeTo']*100)}%")
    return ' · '.join(out)
cards, n = [], 0
for i in ideas:
    name, colour = RULE[i['commitRule']]
    parts = []
    for b in i['best']:
        rest, mid = shot(b['id'], 'rest'), shot(b['id'], 'mid')
        imgs = ''.join(f'<figure><img loading="lazy" alt="{e(b["name"])} {lab}" src="{s}"><figcaption>{lab}</figcaption></figure>' for s, lab in ((rest, 'at rest'), (mid, 'mid-gesture')) if s)
        stars = f"{b['stars']:,} ★" if b.get('stars') else 'stars unknown'
        parts.append(f'<div class="part"><div class="shots">{imgs or "<p class=none>no shot</p>"}</div><p class="pname">{e(b["name"])}</p><p class="pid">{e(b["id"])} · {stars}</p></div>')
    n += 1
    cards.append(f'''<section class="idea" data-rule="{i['commitRule']}"><header><span class="rule" style="--c:{colour}">{name}</span><h2>{e(i['idea'])}</h2>
<p class="meta">{i['parts']} part{'s' if i['parts'] > 1 else ''} from {i['libraries']} librar{'ies' if i['libraries'] > 1 else 'y'}{' · ' + numbers(i['measured']) if numbers(i['measured']) else ''}</p></header>
<div class="parts">{''.join(parts)}</div></section>''')
total = sum(i['parts'] for i in ideas)
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Button Ideas</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,700&display=swap">
<style>
:root {{ --paper:#fff; --ink:#121212; --gray:#5a5a5a; --rule:#dfdfdf; --faint:#f3f3f1; --press:#8a8a8a; --hold:#d4622a; --confirm:#2a6fb0; --slide:#6a4fb3; --countdown:#3c8a5a;
  --serif:"Source Serif 4",Georgia,serif; --sans:"Libre Franklin","Helvetica Neue",Arial,sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --paper:#121212; --ink:#ececec; --gray:#a3a3a3; --rule:#333; --faint:#1c1c1c; --press:#9a9a9a; --hold:#ee8a5c; --confirm:#6aa6de; --slide:#a28ce6; color-scheme:dark; }} }}
:root[data-theme="dark"] {{ --paper:#121212; --ink:#ececec; --gray:#a3a3a3; --rule:#333; --faint:#1c1c1c; --press:#9a9a9a; --hold:#ee8a5c; --confirm:#6aa6de; --slide:#a28ce6; color-scheme:dark; }}
* {{ box-sizing:border-box; }} body {{ margin:0; background:var(--paper); color:var(--ink); font-family:var(--serif); padding:0 16px 72px; }}
main {{ max-width:1100px; margin:0 auto; }}
.kicker {{ font:700 12px/1 var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--gray); margin:56px 0 14px; }}
h1 {{ font:700 clamp(32px,6vw,48px)/1.08 var(--serif); margin:0; max-width:760px; text-wrap:balance; }}
.dek {{ font:400 19px/1.5 var(--serif); color:var(--gray); max-width:700px; margin:16px 0 28px; }}
.filters {{ display:flex; flex-wrap:wrap; gap:6px 18px; font:500 13px/1 var(--sans); border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:12px 0; margin-bottom:8px; position:sticky; top:0; background:var(--paper); z-index:2; }}
.filters button {{ all:unset; cursor:pointer; padding:6px 0; border-bottom:2px solid transparent; }}
.filters button[aria-pressed="true"] {{ border-bottom-color:var(--ink); font-weight:700; }}
.filters button:focus-visible {{ outline:2px solid var(--confirm); outline-offset:3px; }}
.idea {{ border-bottom:1px solid var(--rule); padding:28px 0; }}
.rule {{ font:700 11.5px/1 var(--sans); letter-spacing:.06em; text-transform:uppercase; color:var(--c); }}
.idea h2 {{ font:700 24px/1.2 var(--serif); margin:6px 0 4px; }}
.meta {{ font:400 13.5px/1.4 var(--sans); color:var(--gray); margin:0 0 16px; }}
.parts {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }}
.shots {{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }}
figure {{ margin:0; }} figure img {{ width:100%; aspect-ratio:3/2; object-fit:contain; background:var(--faint); border-radius:4px; display:block; }}
figcaption {{ font:500 11px/1.3 var(--sans); color:var(--gray); margin-top:4px; }}
.pname {{ font:600 14px/1.3 var(--sans); margin:8px 0 2px; }} .pid {{ font:400 12px/1.3 var(--sans); color:var(--gray); margin:0; }}
.none {{ font:400 12px var(--sans); color:var(--gray); }}
</style></head><body><main>
<p class="kicker">The button proof of concept · stage 4</p>
<h1>{len(ideas)} ideas for a button, from {total} that were watched working</h1>
<p class="dek">Every part here was installed, pressed, held or slid by a robot, and drew a real shape on screen. Parts are grouped by how they commit and the trick a person notices first; each idea shows its three best, weighted by GitHub stars and craft.</p>
<nav class="filters" aria-label="How it commits"><button aria-pressed="true" data-f="">All</button>{''.join(f'<button aria-pressed="false" data-f="{k}">{v[0]}</button>' for k, v in RULE.items() if any(i['commitRule'] == k for i in ideas))}</nav>
{''.join(cards)}
</main>
<script>
document.querySelector('.filters').addEventListener('click', (ev) => {{ const b = ev.target.closest('button'); if (!b) return;
  document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('.idea').forEach((s) => {{ s.hidden = !!b.dataset.f && s.dataset.rule !== b.dataset.f; }}); }});
</script></body></html>'''
open(os.path.join(OUT, 'button-ideas.html.tmp'), 'w').write(page); os.replace(os.path.join(OUT, 'button-ideas.html.tmp'), os.path.join(OUT, 'button-ideas.html'))
print(f'{n} ideas → web/public/research/button-ideas.html · {len(os.listdir(dest))} shots, {sum(os.path.getsize(os.path.join(dest, f)) for f in os.listdir(dest)) // 1024} KB')
