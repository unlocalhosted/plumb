# Decisions the brief didn't supply

Found while writing the first five pricing-card specimens by hand (layer 1 of
[the organism generator brief](../docs/briefs/organism-generator.md), 2026-11-20). Each is something I had to decide
or leave out, because neither the brief nor the data said what to do. Layer 3 adds to this list; the brief changes
once the owner has ruled on them.

## Capture

1. **Pictures have no visual weight.** The rule is written for text (size, weight, contrast). Arc's Free card has a
   24px icon; by the rule it was the loudest part of the card. For now a slot with no text gets no rank.
2. **A filled button reads as quiet.** The rule uses the fill's contrast against the ground. Supabase's green "Get
   Started" button has 5:1 against white, so it ranks last of seven parts, though a solid green block is one of the
   loudest things on the card. Area and colour strength probably belong in the rule.
3. **A gradient or image ground can't be read.** Bencho's dark card is painted with a gradient. Its contrast comes out
   unknown, so its ranks rest on size and weight alone. The sidecar records which grounds weren't read.
4. **Gaps stretched to line up with neighbouring cards.** Linear's and Bencho's buttons sit at the bottom so the
   buttons line up across plans; the measured gap before them (14× and 9× body) isn't a designed space. Recorded as
   `"pinned": "action"` instead of a gap.
5. **Two prices in one slot.** Bencho shows a struck-through old price beside the new one. Treated as one price slot,
   whose molecule takes `was`.

## Format

6. **Shape needs "large".** Bencho's card corner is about 2.6× body size. The brief's words (none, small, medium,
   round) had nothing for it; "large" was added to the validator.
7. **Colour roles needed "chip", "link" and "the-action-quiet".** A status badge on its own small fill, an action that
   is a text link, and a ghost button aren't ink, quieter or the-action.
8. **The identity can be a sentence.** Arc's lifetime card is named "Pay once, keep it forever", not a plan name. Same
   job, but its fit is six words, not one.
9. **Rows with ends.** Bencho's name and badge share a row at opposite ends; Supabase's sit side by side. The nesting
   marks `"ends": true`, which nothing in the brief defines yet.
10. **Ground has more kinds than surface.** None (Linear), tinted (Arc lifetime), inverse (Bencho) were needed beside
    surface.

## Distance

11. **Lead, container and density aren't in the distance.** Linear (name-led, no box) and Arc lifetime (price-led,
    tinted box, huge price) come out the nearest pair at 0.19, because they share an order. The five parts are equally
    weighted, as the brief guessed; this pair says lead and container need a say.

## Curation

12. **The kept lines are mine.** Each specimen's reason is proposed (`"by": "proposed"`). The brief says only the owner
    keeps a specimen, so all five stay drafts until the owner confirms or rewrites the reasons.
