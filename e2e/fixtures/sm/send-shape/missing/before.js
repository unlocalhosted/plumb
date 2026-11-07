// An owner with a table but no #send: the phase is flipped by hand.
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
  toggle() { this.#phase = this.#phase === 'on' ? 'off' : 'on'; }
}
