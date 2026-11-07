// The result is held in a local until the run is confirmed current, then written.
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
    const run = ++this.#run;
    const page = await this.#host.read();
    if (run !== this.#run) return;
    this.#page = page;
    this.#send('loaded');
  }
  load() { return this.#load(); }
}
