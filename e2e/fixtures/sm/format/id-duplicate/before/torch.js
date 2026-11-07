// A small, valid machine: every format fixture is this file with one thing wrong.
/** @machine */
export const TORCH = {
  id: 'lamp',
  owner: 'Torch',
  field: '#phase',
  initial: 'off',
  cancel: ['close'],
  states: {
    off: { on: { toggle: 'on', close: 'off' } },
    on: { on: { toggle: 'off', close: 'off' } },
  },
};
export class Torch {
  #phase = TORCH.initial;
  #send(event) {
    const next = TORCH.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  toggle() { return this.#send('toggle'); }
}
