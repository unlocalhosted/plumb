# Spec: judging the shape of a page

Status: DRAFT, not signed off. The owner agreed to the idea on 2026-11-26 and, on 2026-11-27, told Claude to build
the layers on its own judgement and drive them to the end. So a first build now exists, in the judging bench only
(`bench/judged`), and this document was written before it: each section from 13 to 17 ends with a dated note on
what building it changed. Where a note and the text above it differ, the note is what was built.

**What is built, 2026-11-27** (journey entries 158 to 170):

| Reading in the bench | Section | Firm findings on 39 expert sites | Not built |
|---|---|---|---|
| Groups (the seen picture) | 12 | none, by design | |
| Space against belonging | 13 | 2 | rows are never firm; a grid's rows against its columns |
| Look against role | 14 | 4 | "nearly alike"; boxes are never firm |
| Boxes and what they hold | 15 | 0 | joined; a box whose content is not one thing |
| Rhythm and edges | 16 | 1 | balance and proportion; mirror and alternation |
| What is loud | 17 | 3, on one page | loud against what matters is a note only. Reworked 2026-11-28 so a label and what it heads are one unit: 3 of 41 reads still "disagree" (23 before). A picture over the main text is set against it: 6 of 41 pages have one, 3 are "worth a look", and one of those is the hero picture Rauno would remove. Seven of those pictures were then looked at, not blind: one page is still marked, the one he faulted. Pictures elsewhere and boxes with words are not ranked |
| The last screen (the page scrolled to its end) | 18 | none, by design: a note only. One judged page is marked and no home page | fixed things against the ground under them; the other states |

Two of those ten are points the expert made. Each of the ten was looked at on its page. No number has been set against judged screens (section 19).

Written 2026-11-26 as: no code until signed off. Part one (sections 1 to 10) is the
core: the idea, the two pictures, the comparisons, the judgement. The owner agreed to its idea on 2026-11-26. Part
two (sections 11 to 20) is the detail: each reading, each number and where it comes from, and the order of work.

It sits on what is already signed off: the page snapshot and pure rules (`engine-foundations.md`, F1 and F2), a mode
as a pack (F6), and the page as a graph of levels (`scene-graph.md`). It changes none of them.

## 1. The problem

A person looks at a screen and sees groups, levels and kinds: these four are one set, this is the main thing, those
two belong together. They see it before they read a word. When what they see is not what the screen means, they
click a heading that is not a link, miss the one thing that matters, or read two sections as one.

Plumber's checks look at one property on one element, or at one relation inside one small group. Read in full on
2026-11-26, its 306 checks include about a dozen that compare things: rows of a list against their shared edge, cards
in a row, gaps down a stack, the weights and greys a page uses. Each of those decides what a group is in its own way.
There are four such ways in the code and none is shared. No check compares one group with another, a look with a
role, or what is loud with what matters.

So plumber can say "this row is 3 pixels off its list". It cannot say "these headings look like the links beside
them", which is what an expert said about a real page, and what the page's owner then fixed.

## 2. The one idea

**Read the page twice, and report where the two readings disagree.**

- **Seen:** what the page looks like it says, to an eye that has not read the words. Which things form a group,
  which group is inside which, which things are of one kind, what is tied to what, and what is loudest.
- **Meant:** what the page is built to say. Which things belong to one parent, what a container covers, which
  things have the same role, what refers to what, and what is the main thing.

A finding is one disagreement, about one group, said in a designer's words with both sides named. Agreement is
silence. The engine has no table of correct sizes or spacings. It compares the page with itself.

## 3. The seen picture

Built from the snapshot alone: boxes, colours, type, and what is drawn. It uses no tag names, roles or source.

| What is seen | How it is read | What it stands on |
|---|---|---|
| **Units** | Drawn areas: a run of text, a picture, a filled or outlined box. Then grouped upward. | Palmer and Rock 1994, uniform connectedness |
| **Belonging** | Evidence added up across four cues: near, alike, enclosed, joined. Near is the ratio of the gap inside to the gap outside, not a distance. | Kubovy and van den Berg 2008; the pure distance law |
| **Enclosure and joining** | Yes or no: inside one drawn region; sharing a border or a drawn line. | Palmer 1992; Palmer and Beck 2007 |
| **Regularity** | Sameness between members of a set, counted: repeated, mirrored, alternating. | Structural information theory |
| **Loudness** | How far a thing differs from its neighbours in colour, size and motion, weighed by how alike those neighbours are. | Wolfe and Horowitz 2017 |

We read two reviews, Wagemans and others 2012 and Wolfe and Horowitz 2017. The experiments in the table are cited
as those reviews report them; none was read at first hand. What was read, and how much, is in
`docs/research/perception-sources.md`. The numbers come from simple lab pictures. On a real page they are starting points, to be set against judged screens.

## 4. The meant picture

Built from what the page is, without looking at how it is drawn.

| What is meant | Where it is read |
|---|---|
| **Belongs to** | One parent in the graph: one component, one list, one form. |
| **Scope** | What a container holds: a card's content, a section's parts. |
| **Same role** | The same component and variant; link or not a link; control or not a control. |
| **Related** | A label and its field, a control and what it opens, a link and where it goes. |
| **Important** | The page's main action, its heading levels, what comes first. |

Where the app's source is at hand, this is read from the graph of levels. On a page with no source (any public
site) it is read from the page's own structure: tags, roles, addresses, what answers a press. That reading is weaker
and is marked as such on every finding it leads to.

"Important" is the weak row. Heading levels and the main action are in the page. Whether a sentence about a person
matters more than their logo is not, and needs a reading of the words by a model.

## 5. The comparisons

Five pairs, one per row of the two pictures. Each can fail in two directions.

| Seen | Meant | It looks so, and is not | It is so, and does not look it |
|---|---|---|---|
| Near | Belongs to | *Two unrelated things closer to each other than to their own groups* | A close button far from the control that opened its panel (15.2) |
| Enclosed | Scope | Pictures held inside a column sized for text (34.3); a game boxed like every other block (7.3) | A row cut off where the layout has no edge (4.1) |
| Alike | Same role | Headings drawn like links (21.3); menu items that look the same and act differently (10.3); two different sections drawn as one (38.2) | Tiles of one grid, one rich and one nearly empty (12.3) |
| Joined | Related | *A divider drawn between a label and what it labels* | *A tab that does not touch the panel it switches* |
| Loud | Important | A logo larger than the sentence about the person (4.3); a highlight on most of the text (40.2) | The best work drawn at 32 pixels (40.3); essays buried among clips (3.7) |

An example with a number is a point the expert made about a real site (`intuitions.md`). An example in italics is
ours: no judge has marked one. The joined row has none at all. On a screen, joined means sharing a border, and the
two points first sorted under it turned out to be about things that answer each other, which is behaviour.

Three further comparisons came out of the same reviews. They are shape, and the five pairs do not hold them:

- **Nearly regular.** Edges, widths and proportions that almost agree. This is the seen picture compared with
  itself, and needs no meant side.
- **One language.** A page against the other pages of its site, and against its tab icon and share picture.
- **The kind of thing.** A page, or a part, that has a known kind and does not look like it: tabs that do not feel
  like tabs (the owner's own mark on cal.com), a tool that moves slowly.

Proposed for the first build: four of the pairs (near, enclosed, alike, loud) and "nearly regular". Joined waits
until a judge marks a case of it. "One language" needs more than one page read together. "The kind of thing" needs knowledge of what each kind looks like, which the page does not hold.

## 6. The judgement

For any two things, or any set, each cue gives a distance. There are three outcomes, not two:

- **They agree.** The same edge, the same size, the same look. Silence.
- **They clearly differ.** A choice. Silence, unless the meant picture says they are the same thing.
- **They nearly agree.** The fault. A near miss reads as a mistake, where a large difference reads as a decision.

Plumber already judges this way in one place: a row a step or two off its list's edge is a slip, and one further off
is an indent that means something. The expert said the same of a whole page: more clutter would be interesting, this
is a middle ground. The spec makes that one judgement the rule for every cue.

Where "nearly" starts and ends is a number per cue. Part two gives each one with its source, and none is taken on
trust: each is checked against the judged screens before it is used.

## 7. Out of scope

- **Behaviour over time.** A third of the expert's points are about motion, order of events and what a press does.
  This engine reads still pictures of the page. It can read the page in more than one state (hovered, focused,
  selected, wide, scrolled to its end), and many of his points only show in one of those. What happens between two
  states is another spec.
- **Taste.** The research says when a grouping or an emphasis will be misread. It does not say what is beautiful.
- **Advice about the work.** What to show first, how much to write.

## 8. Test data

- The owner's judged screens: seven from cal.com, one mark so far.
- The expert's reviews: 79 points that can become cases, on 30 live sites. Of these, 17 are a case of one of the four
  pairs proposed for the first build and 4 are "nearly regular". One is measured as a case so far.
- A finding counts as right when a judge marked the same thing, and as noise when no judge did. The share of each is
  the number this engine is built to move.

## 9. For the owner to decide

1. **Is section 2 the idea you have in mind?** Two readings, a finding is a disagreement, no table of correct values.
2. **The first build:** four pairs (near, enclosed, alike, loud) and "nearly regular". Left for later: joined, "one
   language" and "the kind of thing". Your own cal.com mark is of the kind that is left for later.
3. **Pages with no source.** The meant picture can be read from structure alone, weaker. Without that, the engine
   cannot be tested on any of the expert's sites.
4. **Words.** "Loud against important" needs a model to read what matters. In the first build or not.
5. **Data before code.** Section 19 puts more judged screens ahead of every layer but the first. That asks for your
   time: about twenty more screens marked.

**Taken on Claude's judgement on 2026-11-27, each open to be overturned.** 2: built as proposed. 3: yes, and it
proved the weakest link, so any finding that rests on it alone is shown as "worth a look" and never as a fault.
4: taken by the owner on 2026-11-27 and built, see section 17. 5: not done, and it is now the thing most needed: the
first build's numbers stand on conventions.

## 10. Not known

- Whether the seen picture, built from lab numbers, groups a real page the way a person does. Nothing has tested it.
- How many of plumber's present findings on cal.com the owner agrees with. The comparison was 244 findings against
  one mark, counted by hand once.
- What it costs to read. The snapshot's cost for the forty style values rules use is itself not yet timed.

---

# Part two: readings, numbers and order

## 11. What the snapshot has to hold

The seen picture is computed from the page snapshot of `engine-foundations.md` (F1), off the main thread, by pure
rules (F2). Per element it needs: its box; whether it is drawn (a fill that shows, a border, a shadow), using the
test plumber's row checks already share; its fill and text colour; type size and weight; corner size; any
decoration on its text; whether it is a picture; whether something is animating it. One thing is not a column yet:
the box of each line of text, which the row checks read from the page today. It becomes a fact provider.

The meant picture needs, per element: its parent, its tag and role, whether it answers a press, where a link goes
(same page, same site, another site), and, where the app's source is at hand, its component and variant from the
graph of levels.

## 12. Units

A unit is a drawn area. There are three kinds: a block of text lines, a picture, and a drawn box. A box that draws
nothing is not a unit; its children are read as if it were not there.

Units nest by containment. The tree of units is usually shallower than the page's own tree, because most boxes on a
page draw nothing.

*Stands on:* uniform connectedness, the claim that the eye first cuts the picture into connected areas of one colour
or texture, and that every other grouping works on those (Palmer and Rock 1994, in the 2012 review).
*Not known:* how different a fill must be from what is behind it before it counts as drawn. Plumber's present test
is "see-through by less than half". Nothing published was read for it.

## 13. Near

For a run of units along one direction, take each gap between neighbours, measured between what is drawn (the ink
of a line of text, not its box). Where the meant picture says a run holds groups, read the ratio **r = the smallest
gap between groups / the largest gap inside a group**.

| r | Outcome | Said |
|---|---|---|
| 1/1.5 and under | The page says the opposite of what is meant. | "The gap inside this group is the one that reads as a break." |
| between 1/1.5 and 1.5 | Nearly. The eye cannot tell where one group ends. | "The space between these groups is too close to the space inside them." |
| 1.5 and over | Agree. | Silence. |

The same ratio answers a second question with no meant side at all: in a grid, the gap across against the gap down
says whether the eye reads rows or columns. Under 1.5 either way, it reads neither.

*Stands on:* the pure distance law. Grouping in a lattice of dots followed the ratio of the two distances alone, and
past about 1.5 the longer direction was "almost never seen" (Kubovy and Wagemans 1995; Kubovy, Holcombe and Wagemans
1998, in the 2012 review). The whole of it scaled: doubling every distance changed nothing.
*Not known:* whether 1.5 holds for blocks of text and cards. It was measured on dots shown for a third of a second.
Plumber has one check in this place today, for an inner gap larger than the outer one, which is the first row.

Added on 2026-11-27 with the first cut (journey entry 165). Two rules came out of the first run, *both ours*. Space
is set only against the next level in: a gap inside a group that has groups of its own is judged one level down.
And a group that is one drawn box is already set apart by the box, so the gap beside it is not judged. On a page
with no source the groups come from how the page is built, and that proved the weak part: a section label built
as a neighbour of its cards was read as a group of its own.

Changed on 2026-11-27 after every finding was judged (journey entry 166). The ratio is used both ways, so the
table above no longer calls 17 against 19 "the opposite". One thing alone at the head or end of a level leads or
closes it and is not a group. A gap with a drawn line in it is not judged. A finding is firm only in a column and
only between two groups of one kind; the rest are shown as worth a look. *All of these are ours.*

## 14. Alike

Each unit has a look: its kind (text, picture, box), size, fill, text colour, type size, weight, corner, border, and
decoration. Two units are compared attribute by attribute. Each attribute is the same, a step apart, or far apart,
where a step is one step on the page's own scale for that attribute (its type sizes, its greys, its corner sizes),
as plumber's census already reads them.

| Compared | Outcome | Said |
|---|---|---|
| Same on every attribute | Alike. | Silence, if their roles are the same. If the roles differ: "These look the same and are not the same thing." |
| A step apart on one or two, same on the rest | Nearly alike. | "This one is slightly off the others." |
| Far apart on several | Different. | Silence, if their roles differ. If the roles are the same: "These are the same thing and do not look it." |

Sets are found from the meant picture first (the children of one list, the instances of one component), and then
from the seen picture alone (units that are alike and lined up), so a page with no source still has sets.

*Stands on:* likeness adds to nearness as evidence of belonging (Kubovy and van den Berg 2008, in the 2012 review).
Changed on 2026-11-27 after the findings on eighteen pages were looked at (journey entry 168). The look of text
also holds how strongly it is drawn and whether a mark travels with it. A finding is firm only when the odd ones
stand in one row or column with the others, or each leads one of a set of sister groups. Boxes are compared by
their frame and are never firm. *Ours.*

*Not known:* how large a difference reads as "different" for any attribute. The review gives no numbers for
likeness. "One step of the page's own scale" is plumber's convention, taken from its check on rows of a list.

Added on 2026-11-27, after the owner judged the first four findings (journey entry 160). Two things decide which
units are compared at all. A link that holds several pieces drawn differently is one thing to press, and only its
loudest piece stands for it. A look is compared only among units that sit the same way, and the seen picture says
how a unit sits: on the page itself or inside boxes (the things inside the boxes of one set share a place), and in
a row beside others drawn the same or not. *Both are ours and have no source.* The first cut answered "sits the
same way" with a rule of its own and needed a new one on the next page. Asking the seen picture cleared that page
with no new rule (journey entry 161).

## 15. Enclosed and joined

Both are yes or no. A unit is enclosed by a drawn box when it lies inside it. Two units are joined when they share
a border or a drawn line runs from one to the other.

Enclosed is compared with scope both ways: a drawn box whose content is not one thing in the meant picture, and one
thing in the meant picture that a drawn box cuts or that runs past its box.

*Stands on:* common region rests on "being inside of" and element connectedness on sharing a border; people found a
repeated shape faster inside one region or along one joined pair (Palmer 1992; Palmer and Beck 2007, in the 2012
review).
*Not known:* which wins when enclosure and nearness disagree. The review does not say, and adds that grouping cues
"sometimes combine additively, sometimes nonadditively". This spec does not rank them: where two cues disagree
about a grouping, that disagreement is itself reported as nearly.

Added on 2026-11-27 with the first cut (journey entry 168). A unit is what shows: it is cut down to the part inside
every clipping box round it. Two readings are built. Text that runs past the drawn box it is in is firm, sideways
by more than 2px or up and down by more than half a line. A thing cut off where the page draws no edge and the
layout has set no line is only shown as worth a look, because a cropped picture of a product is cut on purpose and
the page does not say which it is. "A drawn box whose content is not one thing" is not built: it needs the meant
picture from source. *The thresholds are ours.*

## 16. Nearly regular

For a set, take one attribute at a time: left edge, top, width, height, proportion, gap to the next. Count how many
members share the commonest value. **W = (that count less one) / the number of members** is how strongly the set
reads as regular on that attribute.

| The set | Outcome | Said |
|---|---|---|
| All share the value | Regular. | Silence. |
| Most share it, and the rest are a step or two away | Nearly regular. | "All but this one start on one edge." |
| Most share it, and one is far away | A choice. | Silence, unless the meant picture says it is the same as the rest. |
| No value is shared by most | Not a regular set on this attribute. | Silence. |

This holds with no meant side, so it works on any page. It is the judgement behind the expert's own drawing of one
page: three blocks, three proportions, no shared edge.

*Stands on:* structural information theory. The eye picks up three kinds of regularity (repetition, mirror
symmetry, alternation), and how strongly one reads is its count of sameness links over the number of elements. The
review says this accounts for regularities "whether or not perturbed by noise", and that the older account by
symmetry groups does not (van der Helm and Leeuwenberg 1996, in the 2012 review, part II).
*Not known:* how far off a member can be before it stops reading as a slip and starts reading as a choice. No
source read gives it. Plumber's check on list rows uses two steps of the spacing scale; that is a convention.
Mirror symmetry and alternation are left for later: repetition covers every judged case so far.

Added on 2026-11-27 with the first cut (journey entry 167). A set is the things of one kind in one row or column.
"Most" is at least three and at least two in three. A slip is 1 to 4px off the shared value and is firm, 4 to 8px
is shown as worth a look, and further is a choice. A column is also asked for the one left edge all its things
share. Turned or slanted things are left out. *All ours.* On seventeen portfolio pages it made one finding, and it
reaches none of the expert's five points filed here: three are about balance and proportion, which this section
does not yet describe, and one is about list bullets, which a page's own code cannot measure.

## 17. Loud and important

For a unit among its neighbours, on each of three attributes: how far it is from the neighbours' middle value,
divided by how spread the neighbours are. Size is read as area, colour as distance in a perceptual colour space
(plumber already uses one for its colour clusters), motion as moving or still. A unit's loudness is its largest
such figure. This formula is ours. The source gives the two rules it is built from and no formula.

The meant side is a short order of importance: the page's main heading, its main action, then the rest by level.
With decision 4 taken as yes, a model also reads which sentence says the most.

| Compared | Outcome | Said |
|---|---|---|
| The loudest unit is the most important one | Agree. | Silence. |
| Two units are about as loud, and one of them is the most important | Nearly. | "This competes with the main thing." |
| The loudest unit is minor, or the most important one is among the quietest | Disagree. | "This is the loudest thing here, and it is not the main thing." |
| More than half of a block is drawn in its accent | Nothing stands out. | "The highlight covers most of the text, so it no longer picks anything out." |

*Stands on:* a thing stands out more the more it differs from what surrounds it, and the more alike its
surroundings are; colour, motion, orientation and size are the attributes that undoubtedly guide attention (Wolfe
and Horowitz 2017).
*Limits from the same source:* loudness predicts where people look only modestly, because their goal matters as
much. So a finding says "drawn louder than", never "people will look here". Rhythm is listed as probably not
guiding, so a broken rhythm belongs to section 16.
*Not known:* how close "about as loud" is. The half in the last row is the expert's remark turned into a number. Nobody measured it.

Added on 2026-11-27 with the first cut (journey entry 169). Only the last row of the table is built: the share of a
block's letters in a coloured accent. On the one page with a judged case it reads 66 percent where we had counted
63 by hand. The three loudest blocks of text on the first screen are shown and not judged. The first three rows
need to know which thing matters most, and on a public page that means reading the words with a model (decision 4
in section 9). It was not built: it is the owner's decision and a cost per page.

Added on 2026-11-27, after the owner took decision 4 (journey entry 171). The first three rows are built for text.
A model is given the words of the first screen in reading order, and nothing about how they are drawn, and names
the one block that says the most, the blocks of substance and the minor ones. Loudness is an order (larger type,
then heavier) with no threshold. Agree: the block that says the most is as loud as anything on the screen.
Disagree: the loudest block is a minor one, or the block that says the most is in the quieter half of the screen's
steps of loudness. Nearly: something of substance is louder than it. Pictures are not ranked, so a logo drawn as a
picture is not yet "the loudest thing". It has not been run: no key for the model was on the machine.

Added on 2026-11-28, after the first run (journey entry 172). The words of 40 first screens were read in the
owner's session, with no paid call. The second and third rows of the table did not hold. Of 41 reads, 23 came out
as "disagree", and looked at on the page none is a fault: in 14 the loudest text is the person's name used as a
title, in 6 a section or project heading, in 3 text inside a demo. A name or a heading is loud because it labels
what is under it, so "the loudest unit is minor" describes most pages. The comparison is now a note only ("worth a
look", with how many times larger) and counts as no firm finding. Before it can be a judgement the table needs two
things it does not have: a label and the thing it heads treated as one unit, or a measured answer to how much
louder a label may be than what it heads; and loudness read only among things that sit the same way, so text
inside a demo is not ranked with the page's own text. One judged case exists for it (Rauno 10.1), and that page
has since been changed, so there is nothing to set a number against.

Added on 2026-11-28, reworked on the owner's word (journey entry 173). Both changes come from this section's own
first line: loudness belongs to a unit among its neighbours.

**A label and what it heads are one unit.** A block of text heads what comes after it in its group. For as long as
no text comes before it there, it also heads what comes after that group in the next group out. The groups are the
seen picture's (section 12), so no new number is used. A name over a sentence heads the sentence. A section's
heading heads its section and nothing before it. That the first text of a group heads it is how pages are built
and not a published finding: plumber's convention. Among things drawn on top of each other there is no order, so
there the engine says it cannot read what heads what and gives no verdict.

**Text inside another drawn box is not ranked with the page's own.** A block inside a drawn box that does not also
hold the block that says the most is left out of the order. It is loud among the things in its own box (a card's
title, a meter's reading); on the page it is the box that competes. Boxes and pictures are still not ranked as
wholes, so a loud card, or a logo drawn as a picture, is silence for now.

The table for text, as built:

| Compared | Outcome | Said |
|---|---|---|
| The loudest text is the text that says the most | Agree. | Silence. |
| The loudest text is a label (the reading called it minor: a name, a greeting, a heading) and it heads the text that says the most | Agree: one unit. | Silence. How many times larger the label is, is shown and not judged. |
| The loudest text is of substance and is not the text that says the most | Nearly. | "Something of substance is drawn louder than the text that says the most." |
| The loudest text is a label over some other part of the screen | Disagree. | "The loudest text is a label over another part of the screen." |

The clause "the most important one is among the quietest" is gone. It was counted in steps of type, and a screen
with many sizes set it off whatever the page did. Every outcome but "agree" is still shown as "worth a look" and
counts as no firm finding.

Run on the kept readings (41 reads of 39 sites; four pages whose words had changed since the reading were given
it again by matching the same words): 29 agree, 3 nearly, 3 disagree, 2 not judged, 3 with all their text at one
size, and 1 a loading screen. Of the 23 that disagreed before, 18 now agree, 2 are not judged and 3 still disagree.
In 18 of the 29 the loudest text is a label over the main text, from the same size and heavier up to 3 times its
size, and the expert faulted none of them for it. The three that still disagree are two sites (one saved twice)
where a section's heading is louder than an intro set as body text: 40px against 17px, and 16px against 14px. The
three "nearly" are two headlines over a line the reading found says more, and one sentence drawn a word at a time.
The two not judged are pages drawn over a full-page picture, which the seen picture reads as one pile.

*Not known:* how many times larger a label may be than what it heads before it drowns it. The view now shows that
figure on every page where a label heads the main text, so judged screens can set it. The shape of the one judged
case (Rauno 10.1, a first heading of substance over a second one that says more) comes out as "nearly"; the live
page no longer has that shape, so this is the rule run on a hand-made copy of the shape and not on the page.

Added on 2026-11-28, after the owner said to rank pictures (journey entry 174).

**Corrected first.** The note above calls the judged case Rauno 10.1 "a first heading of substance over a second
one that says more", and says the expert faulted no label for being loud. Both are wrong. The frame kept from his
recording shows that the first heading was the person's name, in large serif type, over a much smaller line about
the work. So he did fault a name for being louder than the sentence under it. The reworked rule is silent on that
shape: it shows how many times larger the name is and gives no verdict. His point 4.3 is the same thing with the
name drawn as a picture. Those are the two judged cases for the number this section does not have.

**A picture over the text that says the most is set against it.** The picture has to sit where a heading would:
it heads that text, by the same reading of the seen picture as a label. It also has to be drawn taller than a line
of any text in the order. Such a picture is shown with two figures. One is its height against that text's type
size, because height is the scale text is ordered on. The other is the room it takes against the room that text's
block takes, because this section reads size as area. A picture that takes more room than the text that says the
most is the biggest thing there, and is shown as "worth a look". One that takes less (an avatar, a wordmark) has
its figures shown and nothing judged, as a label has. What a picture says is not read: the words go to a model and
the picture does not. So nothing here is ever a fault.

Three things follow from how pages are built, and have no published source. A drawn box with no words in it is a
picture's frame and does not take the picture out of the order. A level of the seen picture where nothing else has
words is passed through when reading what heads what, so a picture in its frame has the frame's place. Pictures
anywhere else on the screen (work shown after the introduction, tiles in cards) are not ranked: they are what the
text introduces. Drawn boxes with words in them are still not ranked as wholes.

Run on the 41 reads. The text verdicts are the same as before on the saved page data. On the live pages three
readings were lost again because the pages' words had changed, so 38 were read. Six pages have a picture over the
text that says the most that is taller than a line of any text there. Three are "worth a look". One is Rauno 7.2,
the hero picture he would remove: 380 by 475px, 31.7 times the type under it and 19.9 times the room of the
sentence that says the most, which starts 685px down. One is the photo over the introduction on the site of point
4.3, which he did not fault. One is a headline drawn as a picture, so the words the model read do not include the
page's own headline. Three are shown and not judged: an avatar 5 times the type under it, and two small marks.
The wordmark of point 4.3 is seen on that page as a second picture over the text: 476 by 65px, 3.8 times the
type, 0.8 of the room. It is shown and not judged. A first cut marked a card that sits beside the main text, in a
row, as over it; a picture now has to end above where that text starts.

*Not known:* how many times larger a label or a picture may be than the text under it. What is measured so far:
on 18 sites a label runs up to 3 times the size of the text it heads and the expert faulted none. The wordmark he
did fault is 3.8 times as tall as the type under it, and a wordmark's height is about the height of its capital
letters, so set as type it would be near 5 times. The name he faulted in type cannot be measured from the frame
that was kept. Two cases set no number. Also not known: whether a picture says anything, which needs a model that
is shown the picture. And the bench's first screen is its own frame, which is taller than a laptop's window, so
the share of the screen a picture fills reads low.

Added on 2026-11-28, after the owner said to read what the pictures say (journey entry 175).

**What a picture over the main text means is read from two places.** The first is the page's own code, which costs
nothing: the words it gives the picture (its alternative text, its label, its title), or the fact that it gives
none and marks the picture as decoration (an empty alternative text, or hidden from screen readers). The second is
a reading of the picture itself. The reader is shown the picture, scaled so its longest side is always the same,
and the words of the first screen. It is not told how large the picture is drawn or where. It answers one of three:

| The picture | Called | Then |
|---|---|---|
| is mostly words: a name, a logo's words, a headline | words | It is a label drawn as a picture, and the words are given. Its figures are shown and not judged, as a label's are. |
| shows the person, the work, or something the words speak of | shows | It is of substance and one thing with the text under it. Its figures are shown and not judged. |
| shows none of those | nothing | When it is also the biggest thing there: "worth a look", said as "the biggest thing over the text that says the most is a picture that says nothing about the person or the work". |

A picture that has not been read keeps the earlier wording. The code's word is shown beside the reading and decides
nothing by itself: a page can mark a picture as decoration and draw its headline in it. Every outcome is still a
note and never a fault.

*Stands on:* the same rule as the rest of this section: the loudest thing should be the thing that says the most.
That the code's marking of a picture as decoration is the author's own statement of what it means is the HTML
standard's (an empty `alt` is for an image that adds nothing to the content).
*Not built:* the paid call that would show a picture to the model from the bench's server. The readings so far
were made in the owner's session and kept where the bench looks for them.

Run on the five pages that still have a picture over the main text (the sixth changed between visits and has none
now): seven pictures were looked at. Three are words (a wordmark, a signature, and a headline with its paragraph
drawn as a picture), three show the person or the work, and one says nothing: the hero picture of Rauno 7.2. So of
the three pages marked "worth a look" before, one is still marked, and it is the one he faulted, for the reason he
gave. The code marks all three of those pictures as decoration, so the code's word alone would not have told them
apart. Two of the seven readings are weak and say so: a photograph that may be the person's own, and a drawn face
used as a logo. The look was not blind. The reader had seen these pages, their sizes and the expert's verdicts
earlier in the same session, and seven pictures prove nothing about how a reader does on pages it has not seen.

*Not known:* how a reader that has not seen the page would call the same pictures. Where the picture is words (the
headline drawn as a picture), those words are still missing from the reading of the screen's text, so the text
called "the most" on that page is the wrong one. A picture drawn by script has no address, so its reading is kept
by its place in the page and is lost when the page changes.

## 18. The page in more than one state

Each reading above is of one still picture. Plumber already reads a page at four window sizes. The expert's points
add states in which a still picture shows what the resting page hides, in the order his points call for them:
a window 2,560 wide, the page scrolled to its end, text selected, focus moved through the page, scrollbars always
shown. The first build reads the resting page at the four sizes plumber has. Each further state is a later layer
and brings its own judged cases.

Added on 2026-11-28, on the owner's word (journey entry 176): the first further state. A window 2,560 wide is
already a setting of a screen in the bench, and one judged page is read that way. The next state in the order is
the page scrolled to its end.

**The last screen.** The seen side is what is in the window once the page has been scrolled as far as it goes. The
bench scrolls it and waits until it stands still. The resting picture cannot stand in for this: a menu fixed to
the window is on the last screen too, and that is only known once the page has moved. The meant side comes from
the code: which things on that screen lead to another page of the same site, which only jump within the page (back
to the top), and which leave the site.

| Compared | Outcome | Said |
|---|---|---|
| The last screen has a link to another page of the site | Agree. | Silence. |
| It has none, and nothing else there can be pressed | Worth a look. | "The page ends with nothing to go on to." With how many screens up the nearest link to another page is, and what the last screen does offer: a way back to the top, links that leave the site. |
| It has none, and it has buttons or rows that can be pressed and are not links | Not judged. | Where a button leads is not in the code, so whether one of them is a way on cannot be read. |

A page that fits in one screen has no last screen of its own and is not read. A page that links to no other page
of its site anywhere (a site of one page) has nowhere on the site to go on to, and is not judged. A site that
scrolls a box of its own and not the window is scrolled by that box.

*Stands on:* two of the expert's points, one seen in his picture of a phone (42.1) and one by his word (41.6), and
the "complete flow" law in Layr's reference (`docs/references.md`, 2026-11-26). No published number is used:
whether the window at the end holds such a link is a yes or a no.
*Not known:* whether a link that leaves the site is a way on. Here it is not, and it is shown.
*Not built:* the contrast of things fixed to the window against each ground the page slides under them (39.3). The
one judged page for it stops at its loading screen in the bench's browser. The other states of this section.

Run on the 41 home pages at desktop width and on the one judged screen, an article at phone width. The article
(Rauno 42.1) is marked: its last screen has one link, which leaves the site, and the nearest link to another page
is 14.2 screens up. No home page is marked. Of the 41, 24 have a link to another page on their last screen (on 10
of them a menu fixed to the window is among those links), 7 fit in one screen, 7 are sites of one page, 2 are
not judged because their last screen has buttons, and 1 stops at its loading screen and is not counted. Two home
pages were marked by the first cut and were wrong: one ended in rows that are buttons, which is why buttons now
leave a page not judged. One catch and no false mark is a thin result. The set has one long article in it, and
long articles are where a page ends with nothing to go on to.

## 19. The numbers

| Number | Starts at | From |
|---|---|---|
| Near: where "agree" begins | 1.5 | Published, on dots |
| Near: where "the opposite" begins | 1 | Published, on dots |
| Regular: W | as counted | Published |
| Alike: one step | The page's own scale | Plumber's convention |
| Regular: a slip against a choice | Two steps | Plumber's convention |
| Drawn: a fill that shows | Half see-through | Plumber's convention |
| Loud: "about as loud" | Not set | Nothing |
| Loud: how many times larger a label or a picture may be than the text under it | Not set | Nothing. Seen on 18 expert sites: labels up to 3 times, none faulted. Faulted twice: a wordmark 3.8 times as tall as the type under it, and a name in type that could not be measured |
| Loud: accent share | A half | One remark by one expert |

Two of nine have a published source. No number is used in a finding the owner sees until it has been run against
judged screens, at several values, and the value that agrees best with the judges is kept, with the share of
agreement written beside it. That needs more judged screens than exist: the owner has marked one thing on seven
screens. About twenty more screens from apps known for their design would give each reading a handful of cases.

## 20. Order of work

One layer at a time, each looked at on real screens before the next starts.

1. **The seen picture, drawn.** Units and their groups outlined over a page, with nothing judged. The owner looks at
   cal.com and three of the expert's sites and says whether the groups are the ones they see. This tests the
   riskiest claim in the spec before anything is built on it.
2. **More judged screens.** See section 19.
3. **Near.** It has the one published threshold, so it is the cleanest test of the whole method.
4. **Alike against same role.** The largest group of the expert's shape points that a page alone can settle.
5. **Nearly regular.**
6. **Enclosed.**
7. **Loud against important.** Last, because its numbers have the least under them.

Changed on 2026-11-26, after layer 1: alike against same role was started before near. The expert's reviews hold
seven cases of it on pages that can be opened today and almost none of near, and a layer with nothing to test
against would only add findings.

Every layer is a pack of pure rules over the snapshot. None changes a check plumber has. Where a new reading and an
old check speak about the same place, the old check stays until the new one has been shown to agree with the judges
at least as often.
