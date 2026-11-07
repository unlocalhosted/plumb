// `this.#page = await read()` completes after the await: the assignment itself is the late write.
/** @machine */
export const PAGER = {
  id: 'pager', owner: 'Pager', field: '#phase', token: '#run', initial: 'empty',
  states: {
    empty:   { on: { load: 'loading' } },
    loading: { flight: 'read', on: { loaded: 'shown' } },
    shown:   { on: { load: 'loading', clear: 'empty' } },
  },
  flights: { read: { ifLeft: 'drop' } },
};
export class Pager {
  #host;
  #phase = PAGER.initial;
  #run = 0;
  #page = null;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = PAGER.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  async #load() {
    if (!this.#send('load')) return;
    this.#page = await this.#host.read();
    this.#send('loaded');
  }
  load() { return this.#load(); }
}
