# Clean-up: one run at a time

`overlay/src/cleanup.js` already names its states (`idle reading ready nothing preview writing done error no-census`).
What it lacked was a rule for async answers. Each `await` came back and set the state without asking whether the
person had moved on meanwhile. Three bugs came from that:

- **Esc during Apply's show still wrote.** Apply from `ready` plays the preview show, then writes. Esc during the show
  put the page back (`preview → ready`), but the paused Apply then carried on and wrote.
- **Enter twice during the show wrote twice.** The show leaves the state at `preview`, which Apply accepts, so a second
  Enter started a second write over the first.
- **Closing while a pass is read brought the clean-up back.** `stop()` set `idle`, then the read landed and set
  `ready`, so the clean-up reappeared after the person had closed it.

## The rule

Every move the person makes is a new **run**: start, a pass read, Esc out of the preview, Apply, Undo, stop. Each one
increments `#run`. An `await` that comes back checks that its run is still the current one. If it isn't, it changes
nothing on screen.

| async step | an older run means | what happens |
|---|---|---|
| a pass read (`#read`, `#readPass`) | closed or moved on | the answer is dropped |
| Apply's show | Esc took it back, or a second Enter took over | this Apply ends without writing |
| the write | closed while it was written | the step still goes to the host (`wrote`), so History says it with its Undo; nothing comes back on screen and no resume record is kept |
| Undo | closed while it was taken back | nothing comes back on screen |
| resume's trace check | closed meanwhile | nothing comes back |

`fixpanel.js` handles the last part. A clean-up step that lands while the panel is closed goes to History (`handOff`)
rather than onto the hidden panel. This is the same rule as the Fix panel spec, rule 1.

## Proof

`e2e/cleanup.test.mjs`, "Esc during the show Apply plays writes nothing; Enter twice during it writes once". It counts
POST `apply-all` requests: 0 after Esc during the show, then 1 after Enter, Enter. Written to fail on the old code; not
run locally (the laptop was out of memory); run on vm-agent.
