// Constructed: `loading` owns a flight but only a cancel event leaves it, so the result can never land.
/** @machine */
export const LOADER = {
  id: 'loader', owner: 'Loader', field: '#phase', initial: 'idle',
  cancel: ['close'],
  states: {
    idle:    { on: { load: 'loading', close: 'idle' } },
    loading: { flight: 'read', on: { close: 'idle' } },
  },
  flights: { read: { ifLeft: 'drop' } },
};
export class Loader {
  #phase = LOADER.initial;
  #send(event) {
    const next = LOADER.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  load() { return this.#send('load'); }
}
