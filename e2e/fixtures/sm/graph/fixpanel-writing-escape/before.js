// overlay #1 risk 1: `writing` has no answer for Esc.
/** @machine */
export const PANEL = {
  id: 'panel', owner: 'Panel', field: '#phase', initial: 'closed',
  cancel: ['escape', 'close'],
  states: {
    closed:  { on: { open: 'resting' }, ignores: ['escape', 'close'] },
    resting: { on: { take: 'writing', close: 'closed', escape: 'closed' } },
    writing: { flight: 'write', on: { landed: 'resting', close: 'closed' } },
  },
  flights: { write: { ifLeft: 'handOff' } },
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
