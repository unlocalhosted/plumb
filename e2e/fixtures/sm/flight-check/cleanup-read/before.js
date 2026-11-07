// overlay #2 risk 3: a read that was stopped (or replaced) still lands and writes the owner, in the try and in the catch.
/** @machine */
export const CLEANUP = {
  id: 'cleanup', owner: 'Cleanup', field: '#state', token: '#run', initial: 'idle',
  states: {
    idle:    { on: { read: 'reading' } },
    reading: { flight: 'read', on: { ready: 'ready', nothing: 'nothing', failed: 'error', stop: 'idle' } },
    ready:   { on: { read: 'reading' } },
    nothing: { on: { read: 'reading' } },
    error:   { on: { read: 'reading' } },
  },
  flights: { read: { ifLeft: 'drop' } },
};
export class Cleanup {
  #host;
  #state = CLEANUP.initial;
  #run = 0;
  #p = null;
  #err = null;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = CLEANUP.states[this.#state]?.on?.[event];
    if (next) this.#state = next;
    return !!next;
  }
  stop() { this.#run++; this.#send('stop'); }
  async #read() {
    if (!this.#send('read')) return;
    this.#err = null; this.#host.render();
    try {
      const said = await this.#host.post('system', { scope: 'project' });
      this.#p = said?.proposal ?? null;
      this.#send(this.#p ? 'ready' : 'nothing');
    } catch (error) {
      this.#err = error?.message ?? null;
      this.#send('failed');
    }
  }
  read() { return this.#read(); }
}
