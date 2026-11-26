# Spec: judging the shape of a page

Status: DRAFT, part one, for the owner's read, 2026-11-26. No code until signed off. Part one is the core: the idea,
the two pictures, the comparisons, the judgement. The detail of each reading and each number comes in part two, after
this part is agreed.

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
| **Units** | Drawn areas: a run of text, a picture, a filled or outlined box. Then grouped upward. | Palmer and Rock 1994 |
| **Belonging** | Evidence added up across four cues: near, alike, enclosed, joined. Near is the ratio of the gap inside to the gap outside, not a distance. | Kubovy and van den Berg 2008; the pure distance law |
| **Enclosure and joining** | Yes or no: inside one drawn region, or tied by a drawn line. | Palmer 1992; Palmer and Rock 1994 |
| **Regularity** | Sameness between members of a set, counted: repeated, mirrored, alternating. | Structural information theory |
| **Loudness** | How far a thing differs from its neighbours in colour, size and motion, weighed by how alike those neighbours are. | Duncan and Humphreys 1989; Wolfe and Horowitz 2017 |

The sources, and how much of each was read, are in `docs/research/perception-sources.md`. Their numbers come from
simple lab pictures. On a real page they are starting points, to be set against judged screens.

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
| Near | Belongs to | Two things read as one group and are unrelated | A control sits far from what it acts on |
| Enclosed | Scope | A box cuts through one set, or holds strangers | A set runs past the edge that should hold it |
| Alike | Same role | Headings drawn like links; a picture that answers a hover and leads nowhere | Links that leave the site drawn like links that stay; two sections drawn as one |
| Joined | Related | A line ties two things that are not | Words in the text name a page and are not its link |
| Loud | Important | A logo larger than the sentence about the person | The best work drawn at 32 pixels |

Every example in the last two columns is a point an expert made about a real site (`intuitions.md`).

Three further comparisons came out of the same reviews. They are shape, and the five pairs do not hold them:

- **Nearly regular.** Edges, widths and proportions that almost agree. This is the seen picture compared with
  itself, and needs no meant side.
- **One language.** A page against the other pages of its site, and against its tab icon and share picture.
- **The kind of thing.** A page, or a part, that has a known kind and does not look like it: tabs that do not feel
  like tabs (the owner's own mark on cal.com), a tool that moves slowly.

Proposed for the first build: the five pairs and "nearly regular". "One language" needs more than one page read
together. "The kind of thing" needs knowledge of what each kind looks like, which the page does not hold.

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
- The expert's reviews: 79 points that can become cases, on 30 live sites. Of these, 18 are a case of one of the five
  pairs and 4 are "nearly regular". One is measured as a case so far.
- A finding counts as right when a judge marked the same thing, and as noise when no judge did. The share of each is
  the number this engine is built to move.

## 9. For the owner to decide

1. **Is section 2 the idea you have in mind?** Two readings, a finding is a disagreement, no table of correct values.
2. **The first build:** the five pairs and "nearly regular", leaving "one language" and "the kind of thing" for
   later. Your own cal.com mark is of the kind that is left for later.
3. **Pages with no source.** The meant picture can be read from structure alone, weaker. Without that, the engine
   cannot be tested on any of the expert's sites.
4. **Words.** "Loud against important" needs a model to read what matters. In the first build or not.

## 10. Not known

- Whether the seen picture, built from lab numbers, groups a real page the way a person does. Nothing has tested it.
- How many of plumber's present findings on cal.com the owner agrees with. The comparison was 244 findings against
  one mark, counted by hand once.
- What it costs to read. The snapshot's cost for the forty style values rules use is itself not yet timed.
