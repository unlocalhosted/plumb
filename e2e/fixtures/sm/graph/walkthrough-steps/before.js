// overlay #25: the walkthrough's steps with no entry; `done` can never be reached.
/** @machine */
export const WALK = {
  id: 'walkthrough', owner: 'Walkthrough', field: '#step', initial: 'idle',
  states: {
    idle:   { on: { start: 'first' } },
    first:  { on: { next: 'second', stop: 'idle' } },
    second: { on: { back: 'first', stop: 'idle' } },
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
