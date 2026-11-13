/* SCOPE · what a state started ends when the state is left.
 *
 * A state of a machine (editing, holding, dragging) starts things: listeners, timers, frames, requests. Each of them
 * outliving its state is its own bug: a timer that hides the next toast, a listener that fires on a closed card, an
 * answer that lands after Esc. A Scope owns all of them for one state. The owner opens a Scope on entering the state
 * and ends it on leaving; nothing is cleared by hand, and nothing can be forgotten.
 *
 *   const scope = new Scope();
 *   scope.listen(window, 'pointermove', move);      // removed when the scope ends
 *   scope.timeout(() => hide(), 2400);              // never fires after the scope ended
 *   scope.frame(() => place());                     // one frame, the same
 *   scope.frames((now) => follow(now));             // every frame until the scope ends
 *   const site = await scope.wait(request(...));    // the lines after this run only if the scope is still open
 *   scope.end();                                    // idempotent
 *
 * `wait` on a scope that ended never settles: the code after the `await` does not run, with no check to remember. So
 * no `try/finally` around a `wait` may hold something the next state needs; what a state holds belongs in its scope
 * (`scope.onEnd`), which runs at once when it ends.
 */
export class Scope {
  #controller = new AbortController();
  /** For anything that takes an AbortSignal itself (fetch, addEventListener, a show). */
  get signal() { return this.#controller.signal; }
  get open() { return !this.#controller.signal.aborted; }
  /** Run `undo` when the scope ends (at once, if it already has). */
  onEnd(undo) {
    if (!this.open) { undo(); return; }
    this.signal.addEventListener('abort', undo, { once: true });
  }
  listen(target, type, handler, options) {
    if (this.open) target.addEventListener(type, handler, { ...(typeof options === 'boolean' ? { capture: options } : options), signal: this.signal });
  }
  timeout(run, ms) {
    if (!this.open) return;
    const stop = () => clearTimeout(timer);
    const timer = setTimeout(() => { this.signal.removeEventListener('abort', stop); run(); }, ms);
    this.signal.addEventListener('abort', stop, { once: true });
  }
  frame(run) {
    if (!this.open) return;
    const stop = () => cancelAnimationFrame(frame);
    const frame = requestAnimationFrame((now) => { this.signal.removeEventListener('abort', stop); run(now); });
    this.signal.addEventListener('abort', stop, { once: true });
  }
  /** `run(now)` every frame while the scope is open; `run` returning false stops it early. */
  frames(run) {
    const tick = (now) => { if (run(now) !== false) this.frame(tick); };
    this.frame(tick);
  }
  /** The promise's value while the scope is open. Once it has ended this never settles, and a rejection is dropped. */
  wait(promise) {
    return new Promise((resolve, reject) => {
      Promise.resolve(promise).then((value) => { if (this.open) resolve(value); }, (error) => { if (this.open) reject(error); });
    });
  }
  /** A scope that ends with this one (a state inside a state), or on its own before that. */
  child() {
    const child = new Scope(), end = () => child.end();
    this.onEnd(end);
    // a child that ends first is forgotten by its parent: an owner's scope lives as long as the page
    child.onEnd(() => this.signal.removeEventListener('abort', end));
    return child;
  }
  end() { this.#controller.abort(); }
}
