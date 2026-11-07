// overlay #7: `refused` is the event the table knows.
/** @machine */
export const LIFECYCLE = {
  id: 'blueprint', owner: 'Blueprint', field: '#phase', initial: 'off',
  cancel: ['unmount'],
  states: {
    off:     { on: { turnOn: 'on', refused: 'off', unmount: 'off' } },
    on:      { on: { turnOff: 'leaving', unmount: 'leaving' } },
    leaving: { on: { left: 'off', refused: 'off', unmount: 'off' } },
  },
};
export class Blueprint {
  #phase = LIFECYCLE.initial;
  #send(event) {
    const next = LIFECYCLE.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  toggle(health) {
    if (!health.ready) { this.#send('refused'); return; }
    this.#send(this.#phase === 'off' ? 'turnOn' : 'turnOff');
  }
}
