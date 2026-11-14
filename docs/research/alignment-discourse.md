# What people say about alignment: three threads read on 2026-11-15

Read in the browser on 2026-11-15: every reply that loaded under three posts on X, about 260 replies in all, ads
left out. Quotes are the repliers' own words. Like counts are as shown that day. Counts of replies by theme are my
own sorting, done by reading, so treat them as "about".

The three threads:

1. **Karri Saarinen (Linear) on a vibe-coded app**, 2026-11-08.
   https://x.com/karrisaarinen/status/2119319835759046847 (1.4K likes) and its follow-up
   https://x.com/karrisaarinen/status/2119321203076977020 (468 likes). 50 replies read.
   The app's author (@thekitze) had posted a screenshot of an agent app built as a side project. Saarinen replied:
   "I think this would be a good designer test. 'find all the ui problems in this one image'. vertical and horizontal
   alignment is missing; buttons are rounded and square, also various sizes; spacing … send this to your agent to
   fix". The follow-up, in full: "there should be vertical/horizontal rhythm. Either be left-right positioning, or
   centering. So first top bar should be aligned or vertically centered with the traffic lights. the left side panel
   should have padding and either left icons aligned or centered. then generally you want either round or rectangle
   buttons or fields. you might mix if there is some special case. you can also send apple HIG to your agent to try to
   follow the rules". He then posted his own redraw: "don't know your intentions that well, but just fixing the
   alignment" (135 likes).
2. **Chris Frantz on GitHub's new pull-request page**, 2026-11-12.
   https://x.com/frantzfries/status/2120585982185799935 (2.1K likes, 130.9K views). 185 replies read.
3. **Lovable's sidebar redesign**, 2026-11-11. https://x.com/Lovable/status/2120579105683026214 (129 likes).
   28 replies read. The marked-up critique the owner shared is most likely the reply by @daveyheuser ("Respectfully",
   102 likes, an image); I did not open the image to confirm.

## What people need

### 1. "Show me the lines": people feel it before they can say it

The most repeated reaction to the drawn guides is relief at having a name for a feeling. About 9 replies on the
GitHub thread:

- "You put into words something I was feeling couldn't figure out"
- "I was wondering why subconsciously everything felt so off"
- "and now I know what's been bothering me about it"
- "It also feels kind of cluttered. I can't quite point my finger to it."
- "i wish you never posted this now i cannot unsee it" / "oh, don't show me this, now i can't unsee it"

Saarinen says the same from the expert's side: "when I see these things, I can't unsee them, they will haunt me."

On the Lovable thread, most replies praised the redesign ("Much cleaner and easier to scan now"). The problems were
seen by one person with a pen, then by everyone. One reply: "I'm pretty sure this post is a bait for designers".

So: the drawing is the product. The guides did not accompany the argument, they were the argument.

### 2. "Find it for me, then let my agent fix it"

The loop people are already running by hand: a screenshot, an expert's critique, paste it into the agent.

- The app's author: "me after sending a link to your tweets to my clanker".
- "Gimme a min. Let me convert this into a skill."
- "this thread should be turned into a skill added to agents for anti ai slop"
- "it's not hard to make @karrisaarinen's tweet a skill about ui alignment. I just did it yesterday." (on the GitHub thread)
- "Is there an AI that does this automatically and with quality?"
- "i'd run it on the agent first. curious how many it finds with no hints, before anyone trusts it with the fixes."
- "Just use [a lint tool on GitHub] so you don't get ratio'd in the future" (69 likes). Not opened; by its name it
  checks against Apple's guidelines.
- The author again: "design linters are a thing", and "i am pretty good at finding these myself i just never spent
  proper time on actually improving the design".

So: for the builder the missing thing is time, not knowledge. What they reach for today is words handed to an agent
(a tweet, a skill, Apple's guidelines). Nothing they name measures the running page.

People also want it on their own screen: several posted redraws asking "how's this?", one asked "Can I queue in for
a proper UI roast?", one asked how to handle the right side of his own side panel.

### 3. The cause is between the parts, not in them

The most-liked explanation on the GitHub thread is Saarinen's: "each row is a different org/team" (259 likes).
Others say the same thing as engineers:

- "Following best practices by using completely independent components that don't know about each other's layout?"
- "Kinda funky that each row has its own grid system (I think?)."
- "Just random components rendered one next to each other...it will somehow be right"
- "what if i told you this followed the design system perfectly"
- "turns out there is a very good case to be made for pixel peeping and CSS values that don't neatly fall on the
  tailwind spacing scale"
- On icons, from the Saarinen thread: "each can look fine on its own, then feel mismatched in a toolbar. Reviewing
  them together at actual size catches a lot."

From inside GitHub: "that right edge alignment was especially driving me mad, but the backlog has been endless."
They shipped a first fix within a day of the post. Lovable also answered its critic in the thread: "Better? (New
version now live in-app!)".

So: every piece can be on the system and the screen still be wrong. Nobody owns the line that runs across the
pieces. The people inside know; it loses to the backlog. A check that only compares a value to a token cannot see
this at all.

### 4. Misalignment is now read as the mark of AI

About 20 replies on the GitHub thread blame AI without evidence: "that's such AI slop", "Ai hates alignment and it
pisses me off very much", "This is what happens when you let AI code for you", "they're vibecoding it with Haiku".
And: "So after all alignment IS still one of the hardest challenges in AI" (43 likes), "Crazy especially with how
people claim AI solved all frontend work".

So: the public has picked alignment as the tell. For someone shipping AI-written UI, this is a reputation risk
they can now name.

### 5. It has to be defensible

About 8 replies push back, and they are the useful ones:

- "Why should horizontal rows of ui elements of distinct set of functions be expected to align vertically?
  Genuinely asking" (20 likes).
- "that bar with the merge status is full width … so it genuinely does not align with anything, by design"
- "Normally you don't align header and content elements like that because the divs reflow to be responsive"
- "Have you tried resizing your window"
- "It's intentional because you shouldn't draw relationships between things that don't have it."
- "Even these lines are not aligned to anything."

Frantz's answer: "it's easier to read as things are genuinely where you expect them to be. imagine if every time
you drove a car, the steering wheel was a bit off center". And: "there's plenty of room to adhere to a grid system,
no reason to have odd number, different sized icons". A reviewer (in Japanese) gave the working reason: reviewing
means the eyes travel back and forth many times, and a small misplacement chips at concentration each time.

On the Saarinen thread the push-back was on consistency, not alignment: "There's nothing to fix with rounded and
square buttons, and they are used correctly in context", and "the point of agentic development is exactly that
everyone can have it as they please."

So: a guide is a claim that two things are related. The tool must say why they are, must hold when the window
changes width, and must leave alone a thing that is anchored to the window on purpose. Alignment drew far less
disagreement than "one button shape"; shape and style are closer to taste.

### 6. Alignment is the way in, not the whole complaint

About 10 replies on the GitHub thread say the real trouble is elsewhere: "what matters here and what does not?
Where do I do what?", "approval button is lost in ether", "I think this goes beyond UI details … lacked thoughtful
decision-making". On the Saarinen thread: "the whole thing would break as a consumer product. What do all of those
icons mean in the top left? Why is the panel pretty much replicating the list on the left". On Lovable: "Why are
there two projects tabs on the After image?".

And the limit of an agent, said plainly: "The duplication is the one an agent won't catch alone. It has to be told
what each column is for."

So: people read misalignment as the visible sign that nobody thought the screen through. The deeper notes
(duplication, what matters most, what an icon means) need to know the purpose of each part.

## What this says about how plumber should do it

1. **Draw the guides.** The lines are what makes a person see it and agree. A list of findings would not have got
   2.1K likes.
2. **Read across components.** The fault lives between parts that are each fine. The unit is the screen.
3. **Each guide carries its reason:** which things it relates and why they belong together. Without it the tool
   loses the "why should these align?" argument.
4. **Hold at more than one width,** and know a thing anchored to the window from a thing that drifted.
5. **Find with no hints.** Saarinen's "find all the ui problems in this one image" is the test people would trust.
6. **End in a fix the agent or plumber applies.** People already paste the critique into an agent; plumber knows
   the real page and the real line of code, which a pasted tweet does not.
7. **Alignment first, purpose later.** Duplication and "what matters" need the purpose of each part, which the
   page alone does not give.

## Not known

- Whether the lint tool named in the Saarinen thread measures a rendered page or reads code. Not opened.
- How the GitHub and Lovable fixes look; I read that they shipped, not the result.
- The rest of each thread's quote posts. Only replies were read (Lovable's one quote post was empty of content).
