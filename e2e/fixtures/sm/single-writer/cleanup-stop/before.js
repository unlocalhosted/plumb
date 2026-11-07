// overlay #2 risk 3: stop() sets `idle` by hand, then a read that was out lands and sets `ready` over it.
/** @machine */
export const CLEANUP = {
  id: 'cleanup', owner: 'Cleanup', field: '#state', token: '#run', initial: 'idle',
  cancel: ['stop'],
  states: {
    idle:    { on: { read: 'reading' }, ignores: ['stop'] },
    reading: { flight: 'read', on: { ready: 'ready', nothing: 'nothing', failed: 'error', stop: 'idle' } },
    ready:   { on: { read: 'reading', stop: 'idle' } },
    nothing: { on: { read: 'reading', stop: 'idle' } },
    error:   { on: { read: 'reading', stop: 'idle' } },
  },
  flights: { read: { ifLeft: 'drop' } },
};
export class Cleanup {
  #host;
  #state = CLEANUP.initial;
  #run = 0;
  #p = null;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = CLEANUP.states[this.#state]?.on?.[event];
    if (next) this.#state = next;
    return !!next;
  }
  #settle() { this.#p = null; }
  stop() { this.#settle(); this.#state = 'idle'; this.#host.render(); }
  async #read() {
    this.#state = 'reading';
    const run = ++this.#run;
    const said = await this.#host.post('system');
    if (run !== this.#run) return;
    this.#p = said?.proposal ?? null;
    this.#send(this.#p ? 'ready' : 'nothing');
  }
  read() { return this.#read(); }
}
