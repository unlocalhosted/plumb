// 190efd1: #send looks the move up but hands the write to #to(next), so the phase has two writers.
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
    this.#to(next);
    return !!next;
  }
  #to(next) { if (next) this.#phase = next; }
  open() { return this.#send('open'); }
}
