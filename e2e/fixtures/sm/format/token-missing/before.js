// A small, valid machine: every format fixture is this file with one thing wrong.
/** @machine */
export const LAMP = {
  id: 'lamp',
  owner: 'Lamp',
  field: '#phase',
  initial: 'off',
  cancel: ['close'],
  states: {
    off: { on: { toggle: 'on', close: 'off' } },
    on: { on: { toggle: 'off', close: 'off' } },
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
  async glow() { await Promise.resolve(); }
}
