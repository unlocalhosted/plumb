// overlay #4: the then and catch callbacks check the run token, so an old request lands nowhere.
/** @machine */
export const READER = {
  id: 'reader', owner: 'Reader', field: '#phase', token: '#run', initial: 'idle',
  states: {
    idle:    { on: { start: 'reading' } },
    reading: { flight: 'marks', on: { settled: 'idle', stop: 'idle' } },
  },
  flights: { marks: { ifLeft: 'drop' } },
};
export class Reader {
  #host;
  #phase = READER.initial;
  #run = 0;
  #running = false;
  #inflight = 0;
  #pending = [];
  #marks = new Map();
  constructor(host) { this.#host = host; }
  #send(event) {
    const next = READER.states[this.#phase]?.on?.[event];
    if (next) this.#phase = next;
    return !!next;
  }
  start(items) {
    if (!this.#send('start')) return;
    this.#running = true;
    this.#run++;
    for (const item of items) this.#scan(item);
  }
  stop() { this.#running = false; this.#run++; this.#send('stop'); }
  #landed(item, state) { this.#marks = new Map(this.#marks).set(item, state); }
  #parked(items, error) { this.#pending = [...this.#pending, ...items.map(item => ({ item, error }))]; }
  #settle() { if (!this.#inflight) this.#send('settled'); }
  #scan(item) {
    const run = this.#run;
    this.#inflight++;
    this.#host.readMarks(item.el)
      .then((state) => { if (!this.#running || run !== this.#run) return; this.#landed(item, state); })
      .catch((error) => { if (!this.#running || run !== this.#run) return; this.#parked([item], error); })
      .finally(() => { if (run === this.#run) this.#inflight--, this.#settle(); });
  }
}
