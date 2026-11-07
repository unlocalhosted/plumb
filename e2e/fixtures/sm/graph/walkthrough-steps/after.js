// overlay #25: the walkthrough's steps `finish` leads to `done`.
/** @machine */
export const WALK = {
  id: 'walkthrough', owner: 'Walkthrough', field: '#step', initial: 'idle',
  states: {
    idle:   { on: { start: 'first' } },
    first:  { on: { next: 'second', stop: 'idle' } },
    second: { on: { back: 'first', finish: 'done', stop: 'idle' } },
    done:   { on: { restart: 'idle' } },
  },
};
export class Walkthrough {
  #step = WALK.initial;
  #send(event) {
    const next = WALK.states[this.#step]?.on?.[event];
    if (next) this.#step = next;
    return !!next;
  }
  start() { return this.#send('start'); }
}
