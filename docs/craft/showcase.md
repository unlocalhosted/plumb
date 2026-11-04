# The craft showcase: Quarry, a workspace with all 77 mistakes in it

Run `npx vite --config vite.config.mjs` in overlay/showcase and open http://127.0.0.1:4312/ (Broken) or `/?fixed`. It is
its own project, so React Plumber judges it by Quarry's own theme (overlay/showcase/src/theme.css). Quarry is a made-up invoicing and projects workspace: a sidebar, a dashboard, an invoices
table, an invoice drawer, a team page and settings. In **Broken** each screen carries the mistakes real apps ship;
the overlay (Alt+B) marks them where they are. In **Fixed** the same screens are built right, and the overlay must have
nothing to say: a mark in Fixed is a false positive in the rule, not in the page.

Rules the overlay can't see live are shown with what `plumber craft` found when run against the page (the presses,
hovers and drags of the probes, the dark and touch pairs) and what the source habits found in its code: rule, line and
message, captured from the real run (`showcase/findings.json`, written by `npm run showcase:findings`).

Where each rule lives (B = broken, F = fixed):

| # | screen · place | broken | fixed |
|---|---|---|---|
| 1 | shell · sidebar nav | the active item's fill pushes its words in | fill bleeds out by its padding (`-mx-2 px-2`) |
| 2 | dashboard · "Watch the tour" play button | triangle centred by its box | nudged 1px right |
| 3 | settings · integrations icons | circle and square glyphs the same box | the round ones drawn larger |
| 4 | shell · nav icon beside its label | centred on the line box | centred on the capitals |
| 5 | dashboard · KPI card label | equal padding looks taller on top | the first line's leading trimmed |
| 6 | dashboard · KPI label and value | tops aligned at two sizes | baselines aligned |
| 7 | invoice drawer · line items | gap inside a group wider than between groups | inner gap smaller |
| 8, 41 | dashboard · card with an inner chart well | the same radius inside and out | inner radius = outer − padding |
| 9 | team · "Save changes" | square padding on a text button | about 2:1 |
| 10 | team · "+ Invite member" | the icon side as padded as the text side | the icon side less |
| 11 | settings · form | 5, 7, 10, 13px gaps | the theme's steps |
| 12 | settings · sections | one section off the page's rhythm | the page's steps |
| 13 | settings · plan description | a paragraph 120 characters wide | 45–75 |
| 14 | dashboard · greeting heading | body leading on 32px type | tight leading |
| 15 | invoices · status badges | small capitals untracked | tracked out |
| 16 | invoices · amounts | proportional figures | tabular figures |
| 17 | dashboard · copy | a fourth weight and a fourth grey | the page's three |
| 18 | settings · plan heading | last word alone on a line | balanced |
| 19 | settings · testimonial | straight quotes, three dots | real quotes, an ellipsis |
| 20 | dashboard · popover | its shadow falls up | down, like the rest |
| 21, 52 | settings · upgrade card on violet | a grey shadow | tinted with the ground |
| 22 | dashboard · cards | one shadow a hair off a level | on the ladder |
| 23 | invoice drawer · raised panel | a solid grey border | a translucent one |
| 24 | invoices · helper text | 12px pale grey | readable |
| 25 | invoice drawer · attachment viewer | pure black page area | near black |
| 26 | team · disabled "Remove" | faded with opacity | its own disabled colours |
| 27 | invoices · row "more" button | 16px to hit | 24px |
| 28 | team · row hover | hover style on touch | gated on `(hover: hover)` |
| 29 | settings · fields | `outline: none` | a focus ring with an offset |
| 30 | shell · menu | ease-in on the response | ease-out |
| 31 | invoices · "Export" | no press response | an `:active` state |
| 32 | dashboard · panel | width transitioned | transform |
| 33 | team · "Resend invitation" | a fixed width that crushes the words | sized to them |
| 34 | team · member list | one avatar a size larger | one size |
| 35 | invoices · client name | cut off with no way to read it | full name on hover |
| 36 | invoices · table scroller | content jumps when the scrollbar comes | `scrollbar-gutter: stable` |
| 37 | shell · centred dialog | translated to a half pixel | whole pixels |
| 38 | invoices · row dividers | 1px on a 2× screen | 0.5px |
| 39 | invoice drawer · receipt photo | blends into the page | a faint inner outline |
| 40 | dashboard · large card | circular corners | continuous corners where drawn |
| 42 | shell · tabs | bold on hover moves the row | width reserved |
| 43 | the web font | fallback with no metric overrides | `size-adjust` and friends |
| 44 | dark preview · body | the same weight on dark | lighter |
| 45 | settings · testimonial | the quote mark inside the column | hung outside |
| 46 | invoices · "PAID" badge | no case feature | `case` on |
| 47 | settings · eyebrow label | tracking in px | in em |
| 48 | settings · paragraph and heading | default wrapping | pretty / balance |
| 49 | dashboard · display number | optical sizing off | on |
| 50 | integrations · icons | strokes heavier than the words | follow the text weight |
| 51 | dashboard · popover | one big blur | layered |
| 53 | dashboard · elevation | offsets that don't grow with blur | one ratio |
| 54 | dark preview · card | a shadow to lift it on dark | a lighter surface |
| 55 | dashboard · revenue chart band | an sRGB gradient goes grey | mixed in oklch |
| 56 | invoice drawer · photo caption scrim | two-stop scrim | eased |
| 57 | invoices · muted text | `opacity` on the text | a mixed colour |
| 58 | dark preview | no `color-scheme` | `color-scheme: dark` |
| 59 | shell · user menu → "Switch workspace" | submenu closes on the way to it | a safe path |
| 60 | invoices · status tooltips | no delay, every one waits again | a beat for the first, none for the next |
| 61 | shell · user menu | opens on click | opens on press |
| 62 | shell · ⌘K palette | animates in | there at once |
| 63 | dashboard · toast | scales from 0 | from 0.95 |
| 64 | invoice drawer | restarts when closed midway | reverses |
| 65 | invoice drawer · drag handle | stops dead at the end | gives |
| 66 | invoices · refresh | spinner flashes on a fast reply | waits, then holds |
| 67 | settings · reduced motion | all motion removed | a fade kept |
| 68 | invoice drawer | leaves as slowly as it came | leaves faster |
| 69 | invoice drawer on a phone | `100vh` | `100dvh` |
| 70 | shell · search input | 14px, iOS zooms | 16px |
| 71 | team · role chips built from divs | taps flash, drags scroll | `touch-action` |
| 72 | invoice drawer · its scroller | scroll leaks to the page | contained |
| 73 | settings · section links | headings under the sticky bar | `scroll-margin-top` |
| 74 | shell · popover | `z-index: 9999` | isolation |
| 75 | invoices · wide table | no cue it scrolls | an edge fade |
| 76 | invoice drawer · attachment path | cut at the end | cut in the middle |
| 77 | invoices · loading | a skeleton a different height | the final shape |

## False positives the showcase has found

Marks in Fixed mode, on a screen built right. Each is a rule to fix, not the page.

| rule | where | what it says | why it's wrong |
|---|---|---|---|
| craft/rhythm (#12) | the page's column (40px), the dashboard section (24px), a plan card (8px) | "This stack is 24px apart; the page keeps to 12px and 16px." | a section gap is meant to differ from the gaps inside the section; the rule compares every stack to the page's majority |
| drift (theme provenance) | dashboard · target bar, `bg-linear-to-r/oklch` | "This works out to linear-gradient(var(--tw-gradient-stops))." | a gradient's direction and space are not theme values; nothing in a theme can name them |
| craft/grey-levels (#17) | invoice panel · photo caption | "This text grey isn't one of the 3 greys the page mostly uses." | the caption sits on a photo under a scrim; the census reads its ground as the page, so light text on an image counts as a fourth grey |
