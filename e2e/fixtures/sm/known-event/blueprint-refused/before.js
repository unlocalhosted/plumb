// overlay #7: `refuse` is announced but the lifecycle table knows `refused`; a typo nobody handles.
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
    if (!health.ready) { this.#send('refuse'); return; }
    this.#send(this.#phase === 'off' ? 'turnOn' : 'turnOff');
  }
}
