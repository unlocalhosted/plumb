# Result: the clean-up's missing proofs

Command (one file at a time):
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test e2e/<file>`

## e2e/cleanup-site.test.mjs (text pass): 3 of 3 passed
```
✔ one site, one ladder (standards and stickers: same sentence "Your site uses 14 text sizes. These 7 styles cover them.", shared rows Display/Title/Title small/Body/Body small identical)
✔ the pass never adds a size
✔ Apply is one step in the history ("Text", Law of similarity), Undo restores the whole snapshot
ℹ pass 3  ℹ fail 0
```
Note: the panel lists only the styles present on the page (standards: 7 rows, stickers: 5), so "identical" is asserted on the site sentence and on every shared row.

## e2e/cleanup-spacing-proofs.test.mjs (spacing pass): 5 of 5 passed
```
✔ grouping is kept (aside 8/8/20 unchanged in file and on page)
✔ one rhythm for the site (mt-[7px] on two pages, both written mt-2)
✔ refuse, don't guess (gap-[1cqw] and stylesheet margin: nothing offered, nothing written; a control page's Apply wrote only its own file)
✔ nothing to do is said (words.js "already follows your scale", no Apply, no file changed)
✔ one step in the history ("Spacing", Law of proximity, Undo restores the whole snapshot)
ℹ pass 5  ℹ fail 0
```
Test-side fixes made while writing: the saved line is "now follows" for one space; Undo waits for the whole snapshot (several files land seconds apart); the history strip redraws, so its button is clicked once enabled. No product failures found.
