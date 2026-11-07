// overlay #7: one literal per branch, so the oracle can read every event.
/** @machine */
export const LIFECYCLE = {
  id: 'blueprint', owner: 'Blueprint', field: '#phase', initial: 'off',
  states: {
    off: { on: { turnOn: 'on' } },
    on:  { on: { turnOff: 'off' } },
  },
};
export class Blueprint {
  #phase = LIFECYCLE.initial;
  #send(event) {
    const next = LIFECYCLE.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  set(mode) { this.#send(mode === 'On' ? 'turnOn' : 'turnOff'); }
}
