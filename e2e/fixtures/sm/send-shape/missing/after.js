// The same owner with the canonical #send.
/** @machine */
export const LAMP = {
  id: 'lamp', owner: 'Lamp', field: '#phase', initial: 'off',
  states: {
    off: { on: { toggle: 'on' } },
    on:  { on: { toggle: 'off' } },
  },
};
export class Lamp {
  #phase = LAMP.initial;
  #send(event) {
    const next = LAMP.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  toggle() { return this.#send('toggle'); }
}
