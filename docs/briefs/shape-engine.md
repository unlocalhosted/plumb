# Spec: judging the shape of a page

Status: DRAFT for the owner's sign-off, 2026-11-26. No code until signed off. Part one (sections 1 to 10) is the
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
| under 1 | The page says the opposite of what is meant. | "These read as belonging to the next group." |
| 1 to 1.5 | Nearly. The eye cannot tell where one group ends. | "The space between these groups is too close to the space inside them." |
| 1.5 and over | Agree. | Silence. |

The same ratio answers a second question with no meant side at all: in a grid, the gap across against the gap down
says whether the eye reads rows or columns. Under 1.5 either way, it reads neither.

*Stands on:* the pure distance law. Grouping in a lattice of dots followed the ratio of the two distances alone, and
past about 1.5 the longer direction was "almost never seen" (Kubovy and Wagemans 1995; Kubovy, Holcombe and Wagemans
1998, in the 2012 review). The whole of it scaled: doubling every distance changed nothing.
*Not known:* whether 1.5 holds for blocks of text and cards. It was measured on dots shown for a third of a second.
Plumber has one check in this place today, for an inner gap larger than the outer one, which is the first row.

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
*Not known:* how large a difference reads as "different" for any attribute. The review gives no numbers for
likeness. "One step of the page's own scale" is plumber's convention, taken from its check on rows of a list.

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

## 18. The page in more than one state

Each reading above is of one still picture. Plumber already reads a page at four window sizes. The expert's points
add states in which a still picture shows what the resting page hides, in the order his points call for them:
a window 2,560 wide, the page scrolled to its end, text selected, focus moved through the page, scrollbars always
shown. The first build reads the resting page at the four sizes plumber has. Each further state is a later layer
and brings its own judged cases.

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
| Loud: accent share | A half | One remark by one expert |

Two of eight have a published source. No number is used in a finding the owner sees until it has been run against
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
