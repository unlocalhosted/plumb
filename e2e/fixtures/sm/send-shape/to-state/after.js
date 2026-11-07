// 190efd1 with the canonical #send: one lookup, one assignment, in the one method.
/** @machine */
export const PANEL = {
  id: 'panel', owner: 'Panel', field: '#phase', initial: 'closed',
  states: {
    closed:  { on: { open: 'resting' } },
    resting: { on: { close: 'closed' } },
  },
};
export class Panel {
  #phase = PANEL.initial;
  #send(event) {
    const next = PANEL.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  open() { return this.#send('open'); }
}
