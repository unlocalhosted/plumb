# What Graphical's theme builder actually does (driven by hand, 2026-11-03)

Studied at https://www.graphicalui.com/marketing/preview (the live editor the landing page embeds), at 1440×900,
switching every style, picking colours, dragging the character pad to its corners, cycling the menus. The owner's
verdict on Plumber's first two builders: "a static selector to change a few properties". This is why Graphical's
doesn't feel like one.

## 1. A style is a whole persona, not a preset of numbers

Switching style replaces *everything*, including the board's content:

| Style | Content the board shows | Typeface | Palette (main + 3) | Neutrals | Primary action | Material (the button in the menu) |
|---|---|---|---|---|---|---|
| Felt | fintech: balance, Pay, payment plans, a workspace sidebar | GT Standard | red · blush · navy · peach | Mono | Neutral (ink) | flat black slab |
| Jelly | social: "Your circle is growing!", Invite friends, "Maya joined · Wave", a post with reactions | GT Maru (rounded) | green · navy · pink · mint | Warm | Brand | glossy green pill |
| Canvas | dark dev tool: production pipeline, Test / Deploy, evals, a latency chart | GT Standard Mono | highlighter yellow · green · blue · magenta | Mono (dark) | Brand | lined yellow chip |
| Paper | editorial: "Fieldnotes · What matters this quarter", a readiness chart | GT Super Text (serif) | aubergine · lavender · sage · sand | Warm | Brand | dark flat plate |
| Alloy | commerce: a coupon with ticket notches, Order #1084 · Paid, Create shipping label, Your bag, Delivery | GT America | violet → (picked) teal · mint · periwinkle · sand | Mono / Cool | Neutral | metallic bevel |
| Base | (not opened) | | | | | black flat |

What a persona carries: a content world, a licensed typeface with its own voice, a *material* (how surfaces and
controls are made: flat, glossy, lined, bevelled, paper), a palette personality, a neutral temperature, where the brand
colour is spent, a starting position on the pad, and an icon set. The pieces were chosen together, so any persona
looks finished.

## 2. The colour picker generates a family, inside the persona's taste

- The strip holds ~12 hues, all already tuned to the persona's chroma and lightness band (muted and sophisticated in
  Alloy, fresh and bright in Jelly, dusky in Paper, saturated highlighter in Canvas). You can't pick an ugly colour.
- Picking a hue (Alloy: violet → teal) re-derives the whole family: the main colour, a pale tint of it, two supporting
  hues that move with it (violet's lavender/sage/blush became teal's mint/periwinkle/sand), and a 9-step neutral ramp.
- The strip re-centres around the pick, showing its neighbours.

## 3. The character pad moves shape and where colour is spent, not just numbers

| Corner | What changed on the Alloy board |
|---|---|
| Compact + Bold | tighter padding, smaller cards; buttons become full pills; the brand colour floods more surfaces (the type specimen block turns teal; the product icon tile tints); labels (CUSTOMER, DESTINATION) go heavier |
| Airy + Quiet | more room, larger cards; buttons square-cornered; brand only on the hero coupon; specimen block neutral; labels light |

## 4. The smaller controls are one-click steppers

Motion (Snappy …), Neutrals (Mono → Cool → …), Primary action (Neutral ↔ Brand: Schedule turns teal), Typography
(licensed faces), Icons (Central …). Each is a short list of good options, never a free value.

## 5. Components tab

A whole kit (Accordion, Alert dialog, Autocomplete, Avatar, Button, Checkbox …) drawn in the theme.

## What Plumber lacked, as a system

Plumber's builder modelled a direction as *values* (radius, step, ratio, weight) on *fixed* components. Graphical
models it as **a persona (material + voice + palette personality) × a generated colour family × a pad that moves
shape and colour spend**, and every choice offered is already in taste.
