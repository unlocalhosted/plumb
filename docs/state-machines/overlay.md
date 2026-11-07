# Implicit state machines in `overlay/src`

Scope: `overlay/src/*.js` only (no tests, fixtures, showcase, demo). Read-only audit, 2026-11-07, branch `homepage-toy`.
All paths are relative to `/Users/vijaysingh/unlocalhosted/plumb/overlay/src/`. `file:line` cites are lines I read.
Confidence: VERIFIED = I read every transition site I could find for that machine. PARTIAL = read the state and main transitions, not all call sites.

## Summary (sorted by worst risk)

| # | Machine | File | #states | Worst risk | Conf. |
|---|---------|------|---------|-----------|-------|
| 1 | Fix panel (cause in hand, write, undo, cards, clean-up host) | fixpanel.js:282 | ~12 | Esc while `#writing` leaves Blueprint; the write then finishes into a closed panel and its Undo is never handed off | VERIFIED |
| 2 | Clean-up passes | cleanup.js:126 | 10 | Enter during the preview show runs `#apply` twice (double write); Esc/stop during `reading` is overwritten when the read lands | VERIFIED |
| 3 | Words in-place editor | text-edit.js:65 | 6 | No guard while `resolving`; `saving`/`error` swallow every key (incl. Esc and Alt+B) via `widget.js:817` | VERIFIED |
| 4 | Reader (page-read engine) | blueprint-reader.js:80 | ~8 | A failed request from a stopped run parks the next run (`#parked`, no run check) | VERIFIED |
| 5 | Key/Esc routing across layers | widget.js:816 | cross-cutting | Esc has ~12 consumers decided by order of `if/else`; no layer owns "busy, ignore Esc" | VERIFIED |
| 6 | Drag gestures (word card, element card, spacing bands) | texteditor.js:767, elementcard.js:748, layoutcard.js:244 | 3 x ~4 | No `pointercancel`; spacing `#step` throws if `off()` lands mid-drag | VERIFIED |
| 7 | Blueprint mode lifecycle | blueprint.js:66 | 5 | `#want` survives a refused `enter`; shared write slots `#undos/#saying/#at/#trace` are not re-entrant | VERIFIED |
| 8 | Inline-style ownership (previews) | widget/select/texteditor/elementcard/fixpanel/history/layoutcard/inplace | per element | 7 owners snapshot and restore the same `style` attribute with no arbiter | PARTIAL |
| 9 | Reload-resume (sessionStorage) | widget.js:47, fixpanel.js:253, history.js:35, text-edit.js:25, cleanup.js | cross-page | 8 keys, each its own TTL (15s/30s/20s) with no shared owner | PARTIAL |
| 10 | Words card (`texteditor.js`) | texteditor.js:247 | ~7 | `#write` has no in-flight guard; `close()` does not invalidate `#seq` | VERIFIED |
| 11 | Element card (`elementcard.js`) | elementcard.js:203 | ~9 | `close()` does not invalidate `#seq`/`#pseq`; drag `#hand` freezes `#draw` | VERIFIED |
| 12 | History toast + timeline | history.js:226 | ~8 | Stale 160 ms timer hides the next toast; overlapping `#load()` is last-arrival-wins | VERIFIED |
| 13 | Dock / server health | widget.js:331, 644 | 4 | Two writers of `#health` (poll and Blueprint progress) | VERIFIED |
| 14 | Arm / Select / walk (Alt reticle) | widget.js:870 | 4 | `<html>` cursor owned by both widget and glass | VERIFIED |
| 15 | Selection preview + Changes | select.js:70, changes.js:65 | ~6 | `#taken` duplicates Changes' contents; `accept()` can return after undoing the group previews | PARTIAL |
| 16 | API batcher and `answered()` | api.js:10, 103 | 3 + latch | `batched = false` is a permanent latch after one non-OK batch | VERIFIED |
| 17 | Source-map worker | sourcemap.js:227 | 4 | `worker-startup-timeout` (5 s) makes main-thread decoding permanent | VERIFIED |
| 18 | Glass (input blocker) | blueprint-glass.js:34 | 5 | `editing()` is ignored if Blueprint is not active when the edit starts | VERIFIED |
| 19 | Readiness setup panel | readiness.js:118 | 5 | `read()` drops a second call while loading (stale "Read again") | VERIFIED |
| 20 | Help sheet / hint | help.js:77 | 4 | Untracked 0 ms `setTimeout` can attach listeners after `#unhint` | VERIFIED |
| 21 | Glide (per-element transition lease) | inplace.js:111 | 2 | Shares the `transition` inline style with whatever else previews | VERIFIED |
| 22 | Scrub gesture | scrub.js:60 | 3 | No `pointercancel`; relies on Esc/up | VERIFIED |
| 23 | Craft ink queue | craft.js:40, 76 | 3 | `INK.crafts` never shrinks | PARTIAL |
| 24 | Marks layer | blueprint-marks.js:300 | many | Hint/magnet/focus/pointed flags; only listeners and `clear()` read | PARTIAL |
| 25 | Walkthrough | walkthrough.js:34 | 5 (0 to 4) | Explicit step machine but unreachable (`blueprint.js:252` returns first) | VERIFIED |
| 26 | Retired pinned reading card | widget.js:1080 | ~8 | `#pinCard` has no caller; `#pinned` is always null | VERIFIED |
| 27 | Retired chooser | blueprint-fix.js (whole file) | ~10 | No importer anywhere in `overlay/src`; dead machine | VERIFIED |

Not machines / not read: `craft-record.js` (headless recorder, loaded by `src/craft-run.ts`, not the live overlay), `gravity.js` and `project-page.js` (project page, not the injected overlay; NOT READ), `blueprint-panel.js` (exports `groupsOf/inCode/isNote` and CSS only as used; PARTIAL), `colours/scale/stacks/verdict/hierarchy/...` (pure functions).

Explicit machines found (labelled as such): Blueprint `#state` (blueprint.js:66, strings `off|entering|on|leaving`, single setter `#set` at :662); Cleanup `#state` (cleanup.js:126, string enum, transitions spread over methods); ElementCard/TextEditor `#state` (`off|loading|ready|error`); Walkthrough `#step`. None has a transition table; all are "enum + scattered setters".

---

## 1. Fix panel (the one place you act)

State lives in `fixpanel.js:282-295`, `:385`.
Variables: `#on, #groups, #at, #held, #holding, #pending, #taken(Map), #tokens, #keeps, #swaps, #fromCode, #keeping, #why, #writing, #writingText, #undoing, #done, #notice, #last, #resumeAt, #progress, #steady, #unsettledAt, #quiet, #tools`, plus children `#editor.open`, `#card.open`, `#cleanup.running`, and DOM `data-card` on the host (`:775`), `data-settled` (`:561`), `data-rest` (`:858`).

States (derived; `render()` at :776 branches on them in this order: cleanup, writing/undoing, done, notice, no-cause, in-hand):
- closed (`!#on`)
- resting (on, no cause held)
- resting + notice (`#notice`)
- in-hand (`#holding`), with sub-modes: trying, token, new, adopt, no-fix, code-only (`!drawn(g)`)
- keeping (`#holding && #keeping`)
- writing (`#writing`, `:653`)
- undoing (`#undoing`, `:679`)
- done (`#done`, celebration, `:886`)
- card-open (`#card.open`) / text-open (`#editor.open`), cause released
- cleanup-running (`#cleanup.running`)
- waiting-to-resume (`#resumeAt`, after a reload)

Transitions:
- `show(true)` closed to resting, and queues `#undo(rest)` when sessionStorage has an unfinished undo (:401).
- `show(false)` any to closed: closes children, `#letGo(false)`, hands `#last` to History, stops cleanup (:401). It does NOT reset `#writing`, `#undoing`, `#taken`, `#keeping`.
- `hold(i, lead)` resting/in-hand/card to in-hand (:453); closes card/editor first (:457-458), clears `#done`, `#error`, `#keeping`, `#resumeAt`.
- `holdMark/holdEl` (:502, :511) clicks on marks; ignored when already holding it.
- `release()` in-hand to resting (:519). `skip(by)` in-hand to in-hand (:531).
- `keep()` in-hand to keeping (:604); `#keepIt` keeping to writing (:611); `#closeKeep` keeping to in-hand (:610).
- `take()` in-hand to writing, via `#write` (:570-592).
- `#write` writing to in-hand(next) or resting (:648-674).
- `#undo` any non-writing to undoing to resting (:676-715).
- `celebrate()` (called from blueprint.js:310 when drift reaches 0 after a write) any to done; fold timer returns to resting (:885-898).
- `edit(el)/card(el)` to text-open/card-open (:387, :389); `#handOver` card-open to in-hand (:398).
- `progress(p)` resting + `#resumeAt` to in-hand when read settles (:424).
- `key(k)`: returns false if `!#on || #writing` (:721); routes to cleanup, editor, card, then in-hand keys (:717-752).

Risks:
1. **Esc during write leaves Blueprint.** `key()` returns false while `#writing` (:721). In `widget.js:849-850` the Esc then falls through to `deselect()` (false, the write already called `host.release()` at :653) and `#toggleBlueprint()`. `show(false)` runs while the write is in flight, hands off the *previous* `#last` (:401), and when the write returns `#last` (:665) is set on a hidden panel and never handed off. `#writing`/`#undoing` are not reset by `show(false)`, so the next open starts "writing" until the old promise settles (:660).
2. **Fold timer is untracked.** `celebrate()` calls `clearTimeout(this.#foldTimer)` (:886) but `fold` (:888) returns a timer that is never assigned to `#foldTimer`. Two celebrations within `TIMING.fold` (2300 ms) let the first timer clear `#done` early. `#foldTimer` is declared (:285) but never written.
3. **Illegal combos reachable:** `#holding && #writing` is guarded only by order inside `#write`; `#done && #holding` is cleared in `hold` only; `#keeping` survives `release()`? No, `release()` clears it (:522) but `skip()` does not (:531-538), so `#keeping` can stay true across a skip until the next `hold` clears it (:461). OK in practice because `hold` resets it, but the why field is drawn in between.
4. `hold()` has no `#on` check (:453). After `show(false)` the groups are cleared, which is the only thing preventing a hold on a closed panel.
5. State duplicated: `#taken` (JS) vs `plumb:written` (sessionStorage, :253) vs Selection `#taken` vs Changes items. Four stores for "this fix is done".
6. Listener leak: `#undo` adds a `pagehide` listener (:687) and removes it at :705, but an exception thrown inside the try before :705 is caught per-branch, so fine; `leaving` returns early at :706 after removal. No leak found.

Confidence: VERIFIED for transitions listed; `render()` html branches not individually traced.

## 2. Clean-up passes

State: `cleanup.js:125-130`. `#state` (string), `#pass`, `#done(Map)`, `#saved`, `#held`, `#show` (AbortController), `#marks`, `#page`, `#p`, `#err`, `#preview`, `#swaps`.
States (`#state`): `idle, reading, ready, nothing, no-census, error, preview, writing, done` (running = `!== 'idle'`, :134).

Transitions:
- `start()` idle to reading to ready|nothing|no-census|error (:137, :172-191).
- `#readPass(i)` to reading to ready|nothing|... (:196-205).
- `#togglePreview(true)` ready to preview (:329-332); `(false)` preview to ready (:334).
- `#apply/#applySwaps` ready|preview to writing to done|error (:339-407).
- `#next()` any to reading (next pass) or done (:208-213).
- `#undo()` done to reading (re-read) | error (:409-420).
- `stop()` any to idle (:141); `escape()` preview to ready, else `host.close()` (:441-444).
- `resume()` after reload: idle to writing/done/reading from sessionStorage `keep()` (:144-170).

Risks:
1. **Double apply.** `#apply` guards `['ready','preview']` (:340) then `await this.#togglePreview(true)` when ready (:344) which resolves only after the whole show plays. While that await is pending the state is `preview`, so Enter (:425, allowed in `preview`) or the Apply button starts a second `#apply` that skips the await and sets `writing`. The first one then continues and sets `writing` again (:347) and writes again with a different `group`. Same at :380-383 for swaps.
2. **Cancel is not honoured.** Esc during that await runs `#togglePreview(false)` (preview to ready). The awaiting `#apply` resumes and writes regardless (no state re-check after :344).
3. **Stop does not cancel reads.** `stop()` sets `idle` (:141) but `#read/#readPass/#undo` write `#state` after their `await` without a sequence check (:186-190, :199-202). Closing the panel during `reading` resurrects the clean-up as `ready`.
4. **Esc during writing.** `escape()` for any non-idle non-preview state calls `host.close()` (:443), which calls `stop()` while `#applySwaps` is awaiting; `landed()` later sets `done` (:392-394) and `host.wrote`, on an idle machine.
5. State duplicated in `plumb` sessionStorage via `keep()` (:144).
6. `#space` listener is attached only in `preview` and removed in `stop/apply/togglePreview(false)`; `finally` at :374 removes the `plumb:applied` listener. No leak found.

Confidence: VERIFIED for `cleanup.js` transitions; `spacing-pass.js`, `colour-pass.js`, `icon-pass.js` internals not read.

## 3. Words in-place editor (double-click)

State: `text-edit.js:65`. `#edit` (null | `{node, el, target, leaf, area, done, prior, before}`), `#hideTimer`; DOM: `contenteditable` attribute on the page element (:137), `tx-tag[data-kind]` (`edit|saving|error|refused`), the glass hole (`host.editing`).
States: idle, resolving (async, NOT represented), editing, saving (`ed.done && !error`), error (visible 2.4 s), refusal-tag (separate timer, :267-281).

Transitions:
- `dblclick` idle to resolving (:89-97); `start` resolving to editing (:100-107) or refusal (:104).
- editing to saving: Enter / blur (:215, :218, :221).
- editing to idle: Esc, or unchanged text (:216, :236).
- saving to idle (success, :241) or error to idle after 2400 ms (:244-250).
- `destroy` any to idle (:283).

Risks:
1. **No resolving guard.** `dblclick` returns false only if `#edit` is set (:90), but `#edit` is set in `#begin` (:134), after `await #resolve`. Two double-clicks while resolving call `#begin` twice; the second `#edit` overwrites the first (orphaning its `contenteditable` and listeners).
2. **Key blackout.** While `#edit` is non-null, `widget.js:817` returns before any key handling. During `saving` (an `await post`, `api.js:92` has no timeout) and the 2.4 s `error` state, Esc and Alt+B do nothing. `#finish` returns early when `ed.done` (:223), so Esc cannot cancel.
3. Error state keeps the glass hole and `#follow` rAF loop alive (:182-194, `#end` only at :259).
4. `#refusal`'s `setTimeout(addEventListener, 0)` is untracked (:279): if `hide` fires first the pointerdown listener stays until the next pointerdown. Benign.
5. `#resume` (:80) reads and removes `plumb:text-resume` and re-enters Blueprint; a second tab/frame could consume it.

Confidence: VERIFIED.

## 4. Reader

State: `blueprint-reader.js:57-70`. `#running, #pending, #inflight, #codeInflight, #run, #noPage, #noCode, #codeKey, #throttle, #retry, #quiet, #changedAt, #startedAt, #scope`; per item `state` in `queued|reading|ready`, `fresh`, `caller`.
States: stopped; running-reading; running-parked (`#pending`); running-settled (`settled` getter :120).

Transitions:
- `start(scope)` stopped to running (:80); `stop()` any to stopped (:102, bumps `#run`).
- `#scan` creates/queues items (MutationObserver at :82, throttle 150 ms).
- `#landed` item reading to ready|queued|parked (:270-295).
- `#parked` to `#pending=true` with 5 s retry (:297-301); `healthChanged('ready')` clears it (:141-146).
- `invalidate({file})` ready to queued (:134).

Risks:
1. **Stale failure parks the new run.** `.finally` blocks guard with `run === this.#run` (:230, :263) but `.catch` blocks only check `this.#running` (:239-246 page, ~:262 elements; `#parked` at :297). `widen()` (blueprint.js:615) and leave/enter call `stop()` then `start()` immediately; an old request that rejects afterwards sets `#pending=true` and a retry timer for the new run.
2. `#landed` guards by item id (:271) so stale successes are dropped (ids are never reused, `#next` not reset).
3. `#elements` pump is re-entrant via `.finally` (:268) and `#landed` (queued `caller` path calls `#elements` again, :276), bounded by `WAVE`.
4. Timers: `#retry` (single), `#quiet` (single), `#throttle`: all cleared in `stop()`. No leak found.

Confidence: VERIFIED.

## 5. Key/Esc routing across layers (cross-cutting)

`widget.js:816-851` is a single `if/else` chain on `keydown` (capture) that decides, in order: text edit active (return), overlay input field, `?`, help/history Esc, pinned Alt+arrows (dead), card climb, Alt+B, Alt (arm), Esc when armed+sticky, Blueprint `key()` (fix panel, then selection), Esc pinned (dead), page layer open (return), `deselect()`, `toggleBlueprint()`. Other listeners on the same event: Glass `#key` (blueprint-glass.js:117, holds back plain keys), ElementCard `space` (elementcard.js:250), Spacing `#keys` (layoutcard.js:211), Scrub `key` (scrub.js), Cleanup `#space`, Help `#unhint`, Readiness `#aside` (readiness.js:201) and its panel keydown, History strip keydown (history.js:252).

States implied: {idle, armed(sticky/byPointer), Blueprint on, selection, cause in hand, card open, text card, editing words, cleanup, history open, help open, readiness open, drag in progress, writing}.

Risks:
1. Priority is encoded by order, not by a "current mode". Layers that are busy (`#writing`, text `saving`, cleanup `writing`) either return false (Esc then closes Blueprint, see #1) or swallow everything (text-edit, #3).
2. A drag in progress (word card `#drag`, spacing `#act`) consumes Esc inside its own `key()` only if the fix panel reaches it; the Esc hits `FixPanel.key` first, which routes `#editor.key` only when `!#holding`.
3. `Escape` branch at :839 (sticky arm) precedes Blueprint, so Esc during Select-mode never reaches Blueprint; fine, but documented only in comments.

Confidence: VERIFIED for widget.js; the other listeners listed by grep, not each traced.

## 6. Drag gestures without cancel

- Words card drag: `texteditor.js:767-875`; state `#drag`, `#dragged`, `#editing`, local `d`, `host[data-dragging]`. Listeners `pointermove`/`pointerup` on window (:872-873). No `pointercancel`.
- Element card handles: `elementcard.js:748-790`; state `#hand`. No `pointercancel`. While `#hand` is set `#draw()` returns immediately (:557) and `key()` swallows everything except Esc (:964-966).
- Spacing bands: `layoutcard.js:163-347`; state `#on, #hover, #act, #mods, #swallow`.

Risks:
1. A cancelled pointer (touch interrupt, devtools, OS gesture) leaves `#hand`/`#drag`/`#act` set and window listeners attached until Esc (word/element) or forever (spacing wheel idle timer is the only exit).
2. **Spacing throws mid-drag.** `Spacing.off()` calls `#end(false)` (:188-189) but the drag's local `move`/`up` closures (:253-262) stay attached. The next `pointermove` calls `#step(dir)` (:312) with `#act === null`; `a.value` throws (:314) on every move until pointerup.
3. `Spacing.#end` clears the inline preview in `finally` (:345) unconditionally; a new wheel gesture started during the awaited write loses its preview.
4. `#drag.cancel` in word card: `finish` runs after a 150 ms animation (:861-863); during it `#drag` is still set so `#press` is blocked (:769).

Confidence: VERIFIED for the three.

## 7. Blueprint mode lifecycle

State: `blueprint.js:65-69, 300-303, 483, 503, 620`. `#state` (explicit string), `#timer`, `#scope`, `#want`, `#trail`, `#settled`, `#items`, plus write slot `#undos, #saying, #at, #trace`.
States: `off, entering, on, leaving` (`refused` is announced but never stored, :662-664). `active = entering|on` (:154).

Transitions (`#set` at :662):
- `enter()` off|leaving to entering (:162-190). Timer `FADE_IN` to `#on()` entering to on (:642).
- `leave()` entering|on to leaving (:192-207). Timer `FADE_OUT` to `#off()` leaving to off (:651).
- `destroy()` any to off (:210).
- `enter` while leaving with a different scope: teardown first (:167).
- `enterAt(el)` may call `leave({instant})` then `enter` (:495-499); `widen()` same (:615).
- Health `failed` to `refused` (:164).

Risks:
1. **`#want` leak.** `enterAt` sets `#want = el` (:498) then `enter()` may refuse (:164). `#want` is only cleared in `leave`, `deselect` paths, `unwant` and `#holdWanted`; after a refusal the next `enter` and reader wave runs `#holdWanted` on the stale element (:123).
2. `#teardown` clears `#scope` but not `#want`, `#trail`, `#settled` (:667-682).
3. **Write slot not re-entrant.** `#applyAll` sets `#undos/#trace/#saying/#at` (:355-359) and resets `#saying/#trace` at the end (:466) with no `finally`; `#apply` (Changes) reads `#trace` (:441). `#setProp/#applyRecipe/#batchWrite/#swapsWrite/#applyStyles/#undoGroup` use local `trace` but all listen for the same window event `plumb:applied` with `{once: true}` (:321, :418): two overlapping writes share one event and one handler takes it.
4. A leaving to entering flip reuses the layer but calls `#fix.show(true)` again, which clears groups (fixpanel.js:401).
5. Listeners added in `enter` (scroll/resize/pointermove, :174-178) are removed only in `#teardown`; `leave()` then `enter()` same scope within FADE_OUT keeps them (intended), but `#off` is skipped if state flips back.

Confidence: VERIFIED for lifecycle; write paths read (:317-606).

## 8. Inline-style ownership (previews)

Seven independent owners set `!important` inline styles on page elements, each snapshotting "original" at its own moment:
- widget retired card (`widget.js:1417, 1444`), Selection/inplace (`inplace.js preview/swapPreview`, `select.js:303-335`), word card peek (`texteditor.js:652, 659`), element card (`elementcard.js:492, 497`), fix panel token preview (`fixpanel.js:759-772`), History past view (`history.js:567-590`), Spacing `Inline` (`layoutcard.js:139-151`), plus Glide's `transition` lease (`inplace.js:111-126`) and the widget's `cursor` on `<html>` (`widget.js:882`, `blueprint-glass.js:102-109`).

Risks: if two owners hold the same element/property, the second snapshot is the first's preview, so restore order decides the final page. `TextEditor.changed()` swaps `#target` to a re-rendered element (`texteditor.js:335-343`) while `#shown` still holds the old element's values, so the restore applies to the new target. The `<html>` cursor is set by arming (crosshair, `!important`) and by the glass pass (pointer): glass `#pass(false)` restores a saved value or removes the property even while armed.

Confidence: PARTIAL (owners found by grep; interleavings not exercised).

## 9. Reload-resume (cross-page machine)

Keys: `plumb:resume` (widget.js:47, TTL 15 s), `plumb:undoing` (widget.js:391, fixpanel.js:256-257, TTL 30 s), `plumb:written` (fixpanel.js:253), `plumb:wrote` (history.js:35 and blueprint.js:307, 20 s), `plumb:timeline` (history.js:38, 15 s), `plumb:text-resume` (text-edit.js:25, 15 s), cleanup's `keep()` record (cleanup.js:144).
Transitions: write remembers (pending) to server answers (undo handles) to page reloads to new page `#resume` reads and replays to settled, `forgetResume`.
Risks: no single owner; each reader removes or keeps its key independently (`TextEditor.#resume` removes immediately, `widget.#forgetWhenSettled` waits 2.5 s). Two overlapping writes overwrite the single `plumb:resume` record (`blueprint.js remember`, called at :529-533 etc.). `forgetWhenSettled` is a `setTimeout` chain (widget.js:422-438) with no cancel other than `isConnected`.
Confidence: PARTIAL.

## 10. Words card (`TextEditor` in texteditor.js)

State: `texteditor.js:246-260`. `#state` (`off|loading|ready|error`), `#target, #at, #props, #site, #editing, #menu, #peek, #shown, #drag, #dragged, #row, #seq, #focus, #ctx`.
Transitions: `edit(el)` any to loading to ready|error (:313-325, #read :347); `close()` to off (:326); `changed()` re-read (:335); `#open/#close` field open/closed (:716, :726); `#toggleMenu` (:750); `#peekAt/#unpeek` (:644, :658); `#write` (:668).
Risks:
1. `#write` has no in-flight flag; a double click or Enter+click posts twice (the `token === current` guard at :669 only holds after the re-read). Second post is refused as "changed since" and shows a row error.
2. `close()` (:326) does not bump `#seq`, so a read in flight completes and sets `#state='ready'` and calls `#draw()` on a closed card (draw has a target guard in elementcard; here `#contextNow` is try/caught at :695-702).
3. `changed()` re-targets without restoring `#shown` on the old element (see #8).
Confidence: VERIFIED for transitions; `#draw`/`#rows` rendering not traced.

## 11. Element card (`ElementCard`)

State: `elementcard.js:203-223`. `#state` (`off|loading|ready|error`), `#view` (`null|shadow|motion|layout|tidy`), `#tab`, `#pick`, `#peek`, `#scope`, `#preview`, `#pseq, #asking, #again`, `#hand`, `#writing`, `#wrong`, `#plan`.
Transitions: `edit` to loading to ready|error (:293, :335); `#drill(view)` (:515), `#back()` (:527), `#take(key)` (:540), `#ask/#loop` (:450-471), `#use/#useLayout/#useTidy` (:925, :945, :627), `close` (:305), `changed` (:319).
Risks: `#loop` is a coalescing loop (`#again`, `#asking`) with `#pseq` as the race guard (good); `close()` does not bump `#seq` or `#pseq` (the loop checks `!this.#target`, `#read` does not); a stale `#read` sets `#state` after close. `window` `keydown/keyup` listener `space` (:256) is never removed (no destroy). `#hand` freeze: see #6.
Confidence: VERIFIED for the listed transitions.

## 12. History (toast + timeline)

State: `history.js:226-230`. `#status` (`idle|loading|ready|empty|error`), `#past`, `#busy`, `#at`, `#press`, `#warn`, `#last`, `#timer`, `#shown`, `#marked`; DOM: `strip.hidden` (= open), `button[aria-pressed]`, `strip[data-past]`, toast `data-on`.
Transitions: `wrote` to toast (:263); toast `undo` (:275); `toggle(true)` closed to loading (:293); `#load` to ready|empty|error (:336); `#point/#show` ready to past (:554-563); `#undo/#goBack` to busy to reload (:482-537); `escape` past to Now, else close (:306); `#close` async (:326).
Risks:
1. Toast hide: outer timer cleared in `#say` (:602), inner `setTimeout(... hidden = true, 160)` (:611) is not; a new toast within 160 ms of the previous hide is hidden by the old timer.
2. `toggle(false)` is async (`#close` waits for the animation, :326-333). During it `open` is still true, so `toggle(true)` is ignored (:294) and `#load` can render into a closing strip.
3. `#load` has no sequence (:336): `wrote()`, `undo()` and `#undo()` can overlap; last arrival wins.
4. Esc during `#busy` closes the strip while the undo is in flight (`escape()` has no busy check), then `#load/#refuse` run on a closed strip.
5. `#show` (past view) mutates the page DOM; a page re-render while `#past` leaves `#shown` closures pointing at replaced nodes.
6. Scroll/resize listeners (:244-245) are never removed (no destroy).
Confidence: VERIFIED for the listed transitions.

## 13. Dock / server health

State: `widget.js:331`. `#health` (`starting|ready|failed|lost`), `#readyAt`, `#foldTimer`, `#countTimer`, `#healthTimer`, `#armed`, `#blueprint.active`; DOM `dock[data-state]`, `data-fold`, `data-inView`.
Transitions: `#poll` (:644-653) sets `#health` from the server; `onProgress` (:353) can set `starting` to `ready`; `#dock()` derives the display state (`select` wins over health unless `failed`, :664-665).
Risks: two writers for `#health` (:353 vs :651), the poll can flip back to `starting`; `#readyAt` is set once (:680) so after `lost` then `ready` the line folds immediately; `disconnectedCallback` does not clear `#countTimer` (:452). `#poll` has no re-entrancy guard but is self-scheduled after the await (:652).
Confidence: VERIFIED.

## 14. Arm / Select / walk (Alt reticle)

State: `widget.js:331, 860, 947`. `#armed, #sticky, #byPointer, #hover{element,controller}, #hoverTimer, #walk{chain,at,travel,last}, #frame, #htmlStyled`; DOM `data-armed`, `<html>` cursor, window listeners added/removed in `#arm/#disarm` (:870-910).
States: idle; armed-held (Alt); armed-sticky (Select button); armed-by-pointer (Alt seen on a pointer event); walking (`#walk`); (pinned is dead).
Transitions: Alt keydown/Select to armed (:838, :349); Alt keyup, blur, click (pick), pointer without Alt (byPointer) to idle (:857, :378, :862, :986); Esc while sticky (:839); wheel to walking (:948), pointer move off the walked element resets it (:918).
Risks: `#disarm` is the `blur` handler; it is invoked even when not armed (guarded, :891). `#arm()` registers wheel/pointer/click listeners only while armed, so Alt+B (Alt down then B) always arms and disarms once (:838 then :837). `<html>` cursor conflict (see #8). `#hover` abort-controller is aborted in three places (:895, :923, :971), each also nulling `#hover`.
Confidence: VERIFIED.

## 15. Selection preview + Changes

State: `select.js:70-71, 303` (`#el, #item, #plan, #previewing, #taken, #held, #chosen, #group, #memo, #gmemo, #why, #at`) and `changes.js:65-66` (`#items, #at, #busy`).
Transitions: `select` none to selected (:128); `#move` to previewing (:213); `accept` previewing to put in Changes (:227); `step/clear/discarded/refresh` (:168, :177, :290, :150); `Changes.accept` busy to deleted items (:162-185); `discard` (:148).
Risks: `#taken` mirrors "this element has a change in Changes"; it is cleared in `discarded` and `Backspace` but not when `Changes.accept` succeeds, so after Apply the problem stays "taken" until another element is selected (PARTIAL). `accept()` reverts the group previews (:231-233) before checking `opt.write` (:234) and may return with `#previewing` still true and the group previews gone. `Selection.#follow` rAF loop self-terminates by time (:200-211).
Confidence: PARTIAL (Selection fully read; `draw`/stair rendering not traced).

## 16. API batcher and `answered()`

State: `api.js:10-11, 50` module-level `batched`, `queued`, `flushing`, `flights`, `resolved`.
Transitions: `enqueue` to flush after 8 ms (:21); `flush` loops waves (:24-48); non-OK batch sets `batched=false` for good (:34).
Risks: the latch never resets; concurrent `flush()` calls can interleave (`flushing` is zeroed at the start, :25). `post()` has no timeout (:92-97) so a hung write leaves callers (text-edit `saving`, FixPanel `#writing`) waiting; only Cleanup uses `answered()` (:103-130) to detect a restarted server.
Confidence: VERIFIED.

## 17. Source-map worker

State: `sourcemap.js:227-228` (`worker, fallbackDetail, startupTimer, pending, flights, version`). States: not-started, starting, ready, fallback (terminal). `startWorker` (:258-277), `useFallback` (:250), `invalidateSourceMaps` bumps `version` and fails every pending entry as `invalidated` (:230-236).
Risks: `useFallback` is sticky by design (:251-252), including for the 5 s `worker-startup-timeout` (:270) on a slow machine. `finish` is idempotent via `pending.get(entry.id) !== entry` (:239).
Confidence: VERIFIED.

## 18. Glass (input blocker)

State: `blueprint-glass.js:34`: `#on, #passing, #editing, #pressed, #cursor`; DOM `data-pass`, `data-yield`, host `data-bp-pass`, `clip-path` hole.
Transitions: `on/off` (:79, :91), Space down/up to passing (:117-133), `editing(on, rect)` rAF loop (:63-75), `yieldTo` (:77).
Risks: `Blueprint.editing()` ignores the call unless `active` (blueprint.js:142-144); a text edit that starts before Blueprint enters has no hole, and `#key` (still `#editing === null`) holds plain keys back (`stopImmediatePropagation`) from the editor. `off()` clears the hole and passing (:91-98). Window `blur` releases passing (`#release`, :113).
Confidence: VERIFIED.

## 19. Readiness panel

State: `readiness.js:118-129`: `#report, #open, #ticked, #known, #row(Map id to {shown,busy,done,error,copied}), #loading, #copied`; DOM: `#panel`, `#note`, `#callout`.
Transitions: `read` (:141), `toggle` (:155), `#showCallout/#hideCallout` (:175-208), `#applyTicked` per-row busy to done|error (:391-407).
Risks: `read()` returns silently while `#loading` (:142), so the "Read again" and the +1.5 s re-read after Apply can be dropped. `#renderNote` sets `#open=false` as a render side effect (:246). Callout adds window listeners (`pointerdown/keydown`, :191-192) removed in `#hideCallout`.
Confidence: VERIFIED.

## 20. Help sheet / hint

State: `help.js:77` (`#said` Set, `#timer`, `#fit`, `#sheet`/`#hint` hidden flags) plus localStorage `plumb:hint:*`.
Transitions: `toggle` (:99), `hint(key)` (:109), `#unhint` (:131), `escape` (:141).
Risks: the 0 ms `setTimeout` that attaches key/pointer listeners (:122) is untracked; `#unhint` before it fires leaves them attached until the next key (self-removing, so benign). Hint suppressed when `open` or `quiet()`.
Confidence: VERIFIED.

## 21-23. Glide, scrub, craft ink queue

- Glide: `inplace.js:111-126`, `gliding` WeakMap `el to {timer, transition}`; two states per element (idle, gliding). Re-entrant `glide()` extends the timer; restores `transition` after `GLIDE.ms + 40`. PARTIAL for interplay with other owners (see #8).
- Scrub: `scrub.js:53-121`; closure state `at, shown, spring, travelled, locked`; exits on `pointerup` or Esc only (no `pointercancel`, no blur). Pointer lock exit by the browser is only mirrored into `locked` (:97).
- Craft ink queue: `craft.js:40, 76-86`; `queue to timer(idle callback) to flush to inked()` on every registered Craft; `INK.crafts` is a global Set that never removes (:404).

## 24. Marks layer (PARTIAL)

`blueprint-marks.js:300-306` holds many flags (`#hand, #cause, #hinted, #focused, #pointed, #magnet, #selected, #lit, #lead, #scheduled`) mutated from pointer/focus listeners (:362-377), `spotlight/select/point/near/clear` and a rAF scheduler (:546-553). Only the listeners, `clear()`, `invalidate()` and `#drop` (a 260 ms removal timer, :521-524) were read. A node dropped as `written` is removed by an untracked timer even if `clear()` already ran (harmless, `remove()` is idempotent).

## 25-27. Dead or retired machines (do not maintain)

- Walkthrough (`walkthrough.js:34-75`): `#step` 0..4 driven by `selected/taken/applied`, but the only starter `Blueprint.#offerWalk` returns on its first line (`blueprint.js:252`). The callers (`blueprint.js:84, 123, 199`) still call `selected/taken/applied/end`.
- Retired pinned reading card (`widget.js:1080-1700`): `#pinCard` has no caller (grep: definition only). `#pinned` is permanently null, so every `!this.#pinned` guard in `#onKeyDown` (:823, :830, :842, :846), `#dock` (:672, :681), `#follow` (:1062) and `occluders` is a constant. Its sub-machine (`p.status` writing/written/error, `p.before`, `p.peeking`, `#write/#reread` with the 4-step `TIMING.reread` poll) is unreachable.
- Retired chooser (`blueprint-fix.js`, 758 lines): not imported by any file in `overlay/src` (grep of `from './...'`). Its storyboard states (chooser, queue, stale, list, before, group) are dead.

---

## Cross-cutting recommendations (observations only, no source was edited)

1. Make "busy" a first-class state of the layer that owns the write (FixPanel `#writing`, Cleanup `writing`, TextEditor `saving`) and have the Esc router consult it, instead of each layer returning true/false differently.
2. Give async readers a sequence token checked on every resume (`Cleanup.#read/#readPass/#undo`, `Reader` catch paths, `ElementCard/TextEditor.close`, `History.#load`).
3. One `pointercancel`/`blur` exit for every drag.
4. One owner for inline-style leases per element (Glide already has a per-element record that could carry the others).
5. One module for the sessionStorage reload-resume records and their TTLs.
