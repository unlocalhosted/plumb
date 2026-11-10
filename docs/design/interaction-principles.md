# How React Plumber behaves: interaction, UX and design principles

Status: written 2026-11-10, from the rounds that settled the soft block, the fix bar and the token picker. Each
principle is something the owner asked for, rejected, or chose between real options; the quote or the case is beside
it. `visual-language.md` says how things **look**; this page says how they **behave, speak and are laid out**. Read
both before designing a component. If a new component needs a principle that isn't here, add it here first.

The live examples are on the design site (`web/`, `/design`): Identity (soft blocks), Buttons, Fix bar, Token
pickers.

## 1. Before designing

1. **Find the one question the component answers.** The fix bar answers "what is wrong?". The picker answers "which
   of your tokens should this be?". Everything that doesn't serve that question goes somewhere else or goes away.
   (The first fix bar was one widget per fact the engine knew; the owner: "random things thrown together, no
   cohesion".)
2. **Build it on real UI, one case per kind.** Show a component on a realistic piece of someone's app (a pricing
   card, an issue list), once per property or state it handles, on its own page. Not on one example, not on a test
   fixture.
3. **Prototype the options side by side, live, before building.** Two or three that differ in kind, not in polish,
   each one clickable. Say which you'd pick and why. Remove the losers once one is chosen.
4. **Feedback names a symptom; find the system.** When something is "ugly" or "tasteless", ask what made it
   inevitable before changing pixels (see the owner's rule in the global instructions).

## 2. Information: what is shown, and in what order

5. **One job at a time.** A surface does one thing in any moment. The fix bar shows one place, or it carries the
   clean-up; never both. A second job is a second state of the same surface, entered on purpose (Clean up all).
6. **The problem first, in plain words.** A headline that says what is wrong ("16 tags have a hard-coded border
   radius"), then the detail with the numbers ("5px isn't one of your radius tokens: 6, 8 and 12px"). Never make
   the reader assemble the problem from parts (a class name, "on a", an icon, a red pill).
7. **Each fact once.** If the element shows the value, the bar doesn't repeat it. If the picker writes, the bar has
   no Use button. (The old bar said 5 three ways and the corner twice.)
8. **One loud thing.** In any surface, at most one thing carries colour for attention: the wrong value (coral) in
   the bar, the action (pink) in a group of buttons. Context (where you are, counts) is quiet and sits at one end.
9. **The choice is made where the change happens.** Options live on the element, beside it, never in a distant bar.
   The bar says what; the element is where you decide.
10. **Never cover what you are changing.** A control sits beside its element, never over it or over another place
    of the same problem.

## 3. Words

11. **The owner's words for drift: "hard-coded" and "your tokens".** A value is hard-coded; it should be on your
    tokens. Not "typed by hand", "off the scale", "steps", "ladder", "stairs".
12. **Real names, never made up.** Border radius, font size, padding, margin, gap, colour, shadow, icon size, token.
    Not "corner", "text size", "space". ("use correct terminology, please. Don't make up words.")
13. **Buttons say exactly what they will do.** "Use tag · 6px", "Keep 5px", "Undo all". Status reads as a sentence:
    "Cleaned up 60 places", "Now on your tokens, in your code."
14. All copy also follows the better-writing rules (plain words, address "you", no internal names): see the project
    memory and `visual-language.md`.

## 4. Controls: semantic, small, direct

15. **The control a visual editor gives that property, made small.** Border radius gets a corner handle and a
    scrubbable value; spacing gets the space itself; a colour gets a swatch. Not a generic scale, ruler or row of
    swatches for everything. (Two scale-style pickers were rejected: "the scale approach just felt unnatural, it
    should feel more like a visual editor, control panel sort of thing, semantic to the property".)
16. **Little UI.** One row beside the element: the property's icon, the value, a tick. No headers, no labels that
    the icon already says, no big buttons. ("Too much UI.")
17. **Nothing big appears.** A control never opens a large panel over the page to show its states. ("no fucking huge
    rectangle should show up.") A list opens only on an explicit click.
18. **Several ways in, one model.** Click the value for a list of tokens by name; press and drag for drag mode; arrow
    keys to step; Enter to write; Esc to put it back. All of them move the same position through the same ordered
    options, including your hard-coded value, which sits among the tokens where it falls so you can always go back
    to it.
18b. **One gesture grammar on the element.** Double-click edits its content (words), as everywhere in React Plumber;
    press and drag changes the property in hand; Alt+click opens the element's editor. While content is being
    edited, a drag selects text and the keys belong to the text. (Owner: "with font it should also allow us to edit
    it".)
19. **The hard-coded value is an option, not an error message.** It is listed and reachable, in coral, marked
    "hard-coded". Keeping it is just picking it.

## 5. Drag

20. **Drag works anywhere.** Once pressed, the pointer can go anywhere on screen; the drag keeps going (pointer
    capture). ("the drag control should allow me to drag all over.")
21. **A drag is an interface in itself.** While dragging, the control shows that it is in drag mode and answers
    continuously: a soft fill inside the field follows the pointer with a grip at its end; it gives a little past
    either end. (Reference: the rolling slider clip, `references.md`.)
22. **Drag-only chrome appears only while dragging.** The fill fades in when the drag starts and fades out once it
    has settled on the option. At rest the field is plain. ("don't keep the slider on forever, only during dragged
    state.")
23. **Values roll, one at a time, in the direction of travel.** Going up, the new value comes in from below and the
    old one leaves over the top; going down, the reverse. Short (in 260ms, out 200ms), a small travel (about half the
    field's height), a touch of blur. Never a reel of all the options opened up. ("bring one thing into the field and
    remove the old one towards the top.")
24. **It always lands.** On release the value springs onto the nearest option. A drag never ends between options.
25. **The element follows live.** Every option you pass is shown on the real element at once (the badge's radius
    changes as you drag). Writing is separate and explicit.

## 6. Feedback

26. **Answer at once, before the click.** As soon as something valid is in hand, say so: the tick turns pale green
    the moment the value is a token, with a pop for each new one; solid green once written; grey while there is
    nothing to write. ("give the feedback without click.")
27. **Every state is distinguishable at a glance:** hard-coded (coral), on a token (blue outline, pale green tick),
    written (green outline, solid green tick).
28. **Preview, then write.** Changes show on the page as previews; only an explicit Apply, tick or Enter writes to
    code. Esc or Stop always puts things back.

## 7. Motion and physics

29. **One body.** A thing that moves moves as one object: its parts leave together, peak together, land together.
    A loose part (the toy on a block) goes further on the same beat, never later. ("it releases in stages... the
    whole system should feel whole as one, not layers animated in sequence.")
30. **Physics scales with size.** A small thing is stiffer and quicker than a big one: less squash, less overshoot,
    a shorter time. The card's bounce on a small button "looks a bit much". (Soft blocks compute it from height.)
31. **Interruptible always.** Any motion can be interrupted from where it is on screen; a new press or a new value
    starts from the current pose, never from a reset.
32. **Keep what was liked.** When the owner says "not a complaint" or "I like it", that part does not change. The
    stretchy jump of the toy was liked; it stayed when everything around it was rebuilt.
33. **A raised thing doesn't follow the pointer.** No tilt toward the cursor: "it doesn't look like a button, more of
    a hovering card." Pointed at, it comes straight up.
33b. **An icon moves the way its property does.** Pointed at or dragged, a property's icon acts out its property:
    font size, the small A grows and the big one makes room; line height, the rules move apart; letter spacing, the
    rules move out to the sides; weight, the thin A turns heavy. It doesn't also tip and grow like a toy. (Owner:
    "animate them semantically as well".)
34. **No hover repaint.** Leaving a hovered thing must not flash or redraw it; if it does, remove the property that
    causes it (it was 3D tilt).
35. **Reduced motion:** states change at once; nothing slides, rolls or bounces.

## 8. Look (summary; the rules are in `visual-language.md`)

36. **Soft blocks for anything you press or go to:** a lit pale top on a side of its own colour, a coloured shadow;
    it squashes onto its side and springs back.
37. **Pale is for what is not there.** A box not drawn yet is flat, small and grey; a ready one is raised.
38. **A face with its own hand.** Bricolage Grotesque, heavy, for titles, names and buttons; Instrument Sans for
    sentences. The toys are the round things, not the letters.
39. **Toys, not grey lines.** Icons are solid, colourful, made for what the thing does.
40. **Layouts line up.** Rows of boxes share a sub-grid: names on one line, words on one line, equal heights.

## Checklist for the next component

- What is the one question it answers? Is anything on it not about that question?
- Is it shown on real UI, once per kind, on its own design page, with live options to compare?
- Does the problem read in plain words, with real names, "hard-coded" and "your tokens"?
- Is each fact shown once, with one loud thing?
- Is the choice made on the element, beside it, without covering it?
- Is the control the one a visual editor would give this property, small, with nothing big opening?
- Click, drag, arrows, Enter and Esc: do they all work and move the same model?
- Does a drag work anywhere, show drag-only chrome only while dragging, roll values in the direction of travel, and
  land on an option?
- Does it answer before the click, and are hard-coded, on a token and written told apart at a glance?
- Does it move as one body, scaled to its size, interruptible, with reduced motion handled?
