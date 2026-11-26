# Perception laws: what the research supports

Read on 2026-11-26, after the owner shared Layr's chapter on perception and visual hierarchy and said "you can read
the references i want worlds best design sense". This note says where each law comes from, what was measured, and
what plumber's engine can stand on. It is input for the spec on judging the shape of a page. No code has been
written from it.

## Layr and Laws of UX cite no measurements

- Each of Layr's eight law pages cites one source: the matching page on Laws of UX.
- Laws of UX cites Wikipedia's "Principles of grouping", Nielsen Norman Group articles and blog posts.
- Neither gives a measurement. So the reading below went past both, to research reviews written by the people who
  did the experiments.

## Sources read

| Source | Read |
|---|---|
| Wagemans, Elder, Kubovy, Palmer, Peterson, Singh, von der Heydt (2012), "A Century of Gestalt Psychology in Visual Perception I", [PMC3482144](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/) | Sections 3.2 and 3.3 in full, others by search |
| Wagemans et al. (2012), part II, [PMC3728284](https://pmc.ncbi.nlm.nih.gov/articles/PMC3728284/) | Sections on Prägnanz, Bayes and Structural Information Theory |
| Wolfe and Horowitz (2017), "Five Factors that Guide Attention in Visual Search", [PMC9879335](https://pmc.ncbi.nlm.nih.gov/articles/PMC9879335/) | The section on salience and feature guidance, and Table 1 |
| Hunt (1995), "The subtlety of distinctiveness: what von Restorff really did", [Springer](https://link.springer.com/article/10.3758/BF03214414) | Abstract only |
| Kurosu and Kashimura (1995), the first study of the aesthetic-usability effect | Not read. Known only through Laws of UX and Wikipedia |

The experiments themselves (Kubovy's papers, Palmer 1992, Palmer and Rock 1994, van der Helm and Leeuwenberg 1996)
were not read. Three of their authors wrote the 2012 reviews.

## The evidence for each law

**Proximity has a measured law.** Kubovy and Wagemans (1995) and Kubovy, Holcombe and Wagemans (1998) showed people
grids of dots for 0.3 s and asked which way the dots lined up. The review calls the result the Pure Distance law:

- Grouping depends only on the ratio of the two distances, not on their size and not on the pattern around them.
- When the two distances are equal, either grouping is seen half the time. Once the longer one is more than about
  1.5 times the shorter, grouping along it "is almost never seen".
- Scaling every distance by the same factor changed nothing.

For plumber: the gap between groups over the gap inside them is the number to read. Near 1 the page is a coin flip;
past about 1.5 it reads one way. The 1.5 comes from dots in a lab, so it is a starting point to tune on real apps.

**Cues add up.** Kubovy and van den Berg (2008) set nearness and likeness with and against each other. The curves
were parallel, so the review calls the two effects additive. Claessens and Wagemans (2005) found the same for
nearness and lining up. For plumber: evidence that things belong together can be summed across cues, which is a
grounded way to take one decision from many signals. It was tested for these pairs only.

**Common region and connectedness are about topology.** The review gives the basis of common region (Palmer 1992)
as "the topological property of being 'inside of'", and of connectedness (Palmer and Rock 1994) as "the topological
property of connectedness". Both were shown with a timing task: people found a repeated shape faster inside one
region, or along one joining line.

**Layr and Laws of UX use the wrong name for one law.** What they call uniform connectedness, things joined by a
line, is *element connectedness* in the research. Uniform connectedness is a different claim: the eye first cuts
the picture into connected areas of one colour or texture, and those areas are the units that every other law then
groups. For plumber: the units of the picture the eye sees are drawn areas, which are not always the page's elements.

**Prägnanz failed as first stated.** The review says the single principle "failed because of its vagueness". Two
modern forms replaced it, the simplest description and the most likely reading, and they can be reconciled.

**Structural Information Theory makes it countable** (Leeuwenberg; van der Helm and Leeuwenberg 1991, 1996):

- Only three kinds of regularity count for the eye: repetition, mirror symmetry and alternation.
- How strongly a regularity reads is W = E / n. E is the number of sameness links: the repeats less one, or the
  mirrored pairs. n is the number of elements.
- The review says this "provides a fairly comprehensive account of the detectability of single and combined
  regularities, whether or not perturbed by noise".
- It also says the older account, which describes regularity as a transformation that leaves the pattern unchanged,
  "cannot account well for human detection of perturbed regularities". That older account is the group-theory view.
  A page with one card slightly off is a perturbed regularity, so plumber should count links and not look for exact
  symmetries.

**Salience has two rules** (Wolfe and Horowitz 2017): a thing stands out more the more it differs from the things
around it, and the more those things are alike. Also from that paper:

- Only "a couple dozen" attributes can guide attention. Undoubted: colour, motion, orientation, size.
- "Visual rhythm" is listed under "probably not guiding attributes". A broken rhythm may still read as a broken
  repetition, but it should not be counted as pulling the eye.
- Salience alone "does only modestly well" at predicting where people look; their goal matters as much.
- Attention is drawn to the centre of gravity of a display, and arrows direct it.

For plumber: loudness is measured on colour, size and motion, against how alike the neighbours are. Plumber can say
"these two compete". It cannot say where a person will look.

**Von Restorff is a memory effect.** Hunt's abstract says she showed "perceptual salience is not necessary" for it,
and that the difference "is not sufficient" unless the other items are similar. Layr uses the law for attention;
the salience rules above are the better ground for that.

**The aesthetic-usability effect is a finding about judgement.** As reported second-hand, 252 people rated 26 cash
machine layouts, and how easy a layout looked followed its beauty more than its real ease. It says why polish
matters. It does not say what to draw, so it cannot ground a check.

**Wholes can come before parts, but not as a rule.** Part II reviews evidence that whole-pattern properties are
often seen first, and warns that "positing holistic primacy as a rigid perceptual law is hardly tenable".

## Four changes to the engine proposal

1. The units of the seen picture are drawn areas, grouped upward.
2. Belonging is a sum of evidence across near, alike, enclosed and joined, with nearness read as a ratio.
3. Regularity is counted as sameness links over elements, for repetition, symmetry and alternation. This replaces
   the symmetry-group idea proposed earlier the same day.
4. Loudness is difference from neighbours, weighed by how alike the neighbours are, on colour, size and motion.

All four have a published law. Their numbers come from simple lab pictures, so on a real page they are starting
points.

## Perception is covered, taste is not

This is the science of what is seen. It says when a grouping or an emphasis will be misread. It does not say what
is beautiful; that still comes from people who make good interfaces, which is what the craft rules hold.

## Not read yet

- The experiments named above, at first hand.
- Work on measuring clutter (Rosenholtz and others) and on first impressions of web pages.
- The criticism of the aesthetic-usability effect.
- Any study that tested these laws on real interfaces. None of the numbers above was measured on one.
