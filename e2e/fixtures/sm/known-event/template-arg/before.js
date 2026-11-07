// overlay #7: the event is built from a string, so the oracle cannot read which event is sent.
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
  set(mode) { this.#send(`turn${mode}`); }
}
