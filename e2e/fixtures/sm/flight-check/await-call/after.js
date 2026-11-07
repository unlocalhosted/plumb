// `await this.#read()`: the call is the await's operand, so it runs before the function suspends; it is not a write
// after an await. The writes that follow the await are guarded as ever.
/** @machine */
export const CLEANUP = {
  id: 'cleanup', owner: 'Cleanup', field: '#state', token: '#run', initial: 'idle',
  cancel: ['stop'],
  states: {
    idle:    { on: { read: 'reading' }, ignores: ['stop'] },
    reading: { flight: 'read', on: { ready: 'ready', failed: 'error', stop: 'idle' } },
    ready:   { on: { read: 'reading', undo: 'undoing', stop: 'idle' } },
    undoing: { flight: 'undo', on: { read: 'reading', failed: 'error', stop: 'idle' } },
    error:   { on: { read: 'reading', stop: 'idle' } },
  },
  flights: { read: { ifLeft: 'drop' }, undo: { ifLeft: 'drop' } },
};
export class Cleanup {
  #host;
  #state = CLEANUP.initial;
  #run = 0;
  #pass = 0;
  #err = null;
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = CLEANUP.states[this.#state]?.on?.[event];
    if (next) this.#state = next;
    return !!next;
  }
  stop() { this.#run++; this.#send('stop'); }
  async start() { this.#pass = 0; await this.#read(); }
  async #read() {
    const run = ++this.#run;
    this.#send('read');
    try {
      await this.#host.post('system');
      if (run !== this.#run) return;
      this.#send('ready');
    } catch (error) {
      if (run !== this.#run) return;
      this.#err = error?.message ?? null;
      this.#send('failed');
    }
  }
  async undo() {
    const run = ++this.#run;
    this.#send('undo');
    try {
      await this.#host.undo();
      if (run !== this.#run) return;
      this.#pass = 0;
      await this.#read();
      this.#host.announce('undone');
    } catch (error) {
      if (run !== this.#run) return;
      this.#err = error?.message ?? null;
      this.#send('failed');
    }
  }
}
