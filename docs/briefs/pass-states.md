# Clean-up pass: the disabled look

Status: decided by Claude on 2026-11-12 under the owner's standing instruction. Code: `overlay/src/states.js`,
`overlay/src/states-pass.js`.

## What goes wrong

Each prompt fades a disabled button by its own amount. On algorecall (a real app on this machine) disabled controls
fade to seven different opacities (30, 35, 40, 50, 60, 70, 80) across about 138 places. People learn what "can't be
used" looks like from the app; seven looks teach nothing.

## The principle and its ground

Unavailable is one state, so it is one decision. Material 3 gives disabled content a single opacity, 38%
(m3.material.io/foundations/interaction/states, "Disabled"). The design system leads: the theme's own disabled
opacity, when it names one (`opacity-disabled` utility, `--opacity-disabled` variable), wins. With none, Material's
38%, on the framework's nearest step every Tailwind version has (`opacity-40`).

## Decision

Every opacity set for the disabled state (`disabled:`, `aria-disabled:`, `data-[disabled]:`, `group-disabled:`,
`peer-disabled:`) goes to the one value, its variant kept. Contrast is not decided here: `craft/disabled-contrast`
still says when faded words drop under its floor, and advises muted colours instead of opacity.

## Not in this pass

Hover and pressed looks (Material's state layers: 8% hover, 10% pressed over the content colour). A pass for them
needs a reading of how an app draws its states first.
