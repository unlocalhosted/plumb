# Merge one review's shots, points and note into reviews.json:  python3 add.py <file with a Python dict>
import json, sys, os, tempfile
new = eval(open(sys.argv[1]).read())
d = json.load(open('reviews.json'))
r = next(x for x in d['reviews'] if x['n'] == new['n'])
r.update({k: v for k, v in new.items() if k != 'n'})
fd, t = tempfile.mkstemp(dir='.'); os.write(fd, json.dumps(d, indent=1, ensure_ascii=False).encode()); os.close(fd); os.replace(t, 'reviews.json')
print('review', new['n'], 'has', len(r['points']), 'points;', sum(1 for x in d['reviews'] if x['points']), 'of', d['total'], 'done')
