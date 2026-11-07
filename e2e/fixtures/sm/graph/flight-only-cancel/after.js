// Constructed: `loading` owns a flight and `landed` brings the result home.
/** @machine */
export const LOADER = {
  id: 'loader', owner: 'Loader', field: '#phase', initial: 'idle',
  cancel: ['close'],
  states: {
    idle:    { on: { load: 'loading', close: 'idle' } },
    loading: { flight: 'read', on: { landed: 'idle', close: 'idle' } },
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
